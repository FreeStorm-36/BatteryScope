/**
 * 小锂的问答服务：本地知识库检索（默认）+ 远程大模型接口（预留）
 * ---------------------------------------------------------------
 * 为什么默认本地检索：
 *   - 本站是纯前端静态 SPA，没有后端；本地检索开箱即用、断网可用、
 *     回答内容被限制在"本站讲过的东西"里，不会出现页面上找不到依据的话。
 *   - 远程大模型只负责**润色与组织语言**，资料（检索命中的条目）依然由
 *     本地语料提供——这就是一个轻量 RAG：检索在本地，生成在远端（可选）。
 *
 * 配置远程接口（可选，见 docs/AI助手接口说明.md）：
 *   VITE_AI_API_BASE=https://your-endpoint   （OpenAI 兼容，拼 /chat/completions）
 *   VITE_AI_API_KEY=sk-...
 *   VITE_AI_MODEL=your-model
 *   VITE_AI_TIMEOUT=12000                     （毫秒，可选）
 * 任一项缺失或请求失败，都会自动回落到本地检索，学习者无感。
 */
import { assistantCorpus, assistantSynonyms } from '../data/assistantCorpus.js'

export const aiConfig = {
  base: (import.meta.env.VITE_AI_API_BASE || '').replace(/\/+$/, ''),
  key: import.meta.env.VITE_AI_API_KEY || '',
  model: import.meta.env.VITE_AI_MODEL || '',
  timeout: Number(import.meta.env.VITE_AI_TIMEOUT || 12000)
}

export const remoteReady = () => !!(aiConfig.base && aiConfig.key)
export const corpusSize = () => assistantCorpus.length

/* ── 分词：CJK 二元组 + ASCII 词 ────────────────────────────── */
function tokensOf(text) {
  const t = String(text || '')
  const out = []
  const ascii = t.match(/[A-Za-z0-9][\w.+#-]*/g) || []
  for (const w of ascii) out.push(w.toLowerCase())
  const cjk = t.match(/[\u4e00-\u9fff]+/g) || []
  for (const run of cjk) {
    if (run.length === 1) out.push(run)
    else for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2))
  }
  return out
}

/* 同 / 近义词扩展：学习者不会总用页面上的原词 */
function expandQuery(q) {
  let s = ' ' + String(q || '').toLowerCase() + ' '
  for (const [k, list] of Object.entries(assistantSynonyms)) {
    if (String(q).includes(k)) s += ' ' + list.join(' ') + ' '
  }
  return s
}

/**
 * 检索：关键词包含（权重 3）+ 查询与条目正文的二元组重合（0.8/个）
 *      + 查询与条目"问题字段"的重合（1.2/个，问题写法更贴近真实提问）。
 * 返回按分数降序的命中数组（含 score）。
 */
export function retrieve(question, topN = 3) {
  const expanded = expandQuery(question)
  const qTokens = new Set(tokensOf(question).filter((t) => t.length >= 2))
  const scored = assistantCorpus.map((e) => {
    let score = 0
    for (const kw of e.kw) if (expanded.includes(kw.toLowerCase())) score += 3
    const body = new Set([...tokensOf(e.q), ...tokensOf(e.a)])
    const qField = new Set(tokensOf(e.q))
    for (const t of qTokens) {
      if (body.has(t)) score += 0.8
      if (qField.has(t)) score += 1.2
    }
    return { e, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topN)
}

const FALLBACK = {
  text: '这个问题超出了小锂目前的知识范围——我只学过本站这七章的内容（结构、原理、老化、实测数据、预测方法）。可以换种问法，或者试试问我："什么是 SOH？""为什么快充会伤电池？""留出法回测为什么能检验预测？"',
  entry: null,
  mood: 'think'
}

/* 本地答案：命中就给正文 + 出处；分数太接近就给第二条"相关" */
function localAnswer(hits) {
  if (!hits.length || hits[0].score < 4) return FALLBACK
  const top = hits[0]
  let text = top.e.a
  if (hits[1] && hits[1].score >= Math.max(4, top.score * 0.55)) {
    text += `\n\n相关：${hits[1].e.a}`
  }
  return { text, entry: top.e, mood: 'idle' }
}

/* 远程接口（OpenAI 兼容 /chat/completions）：本地检索结果作为上下文注入 */
async function askRemote(question, hits) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), aiConfig.timeout)
  try {
    const context = hits.length
      ? hits.map((h) => `【${h.e.ch}】${h.e.q}\n${h.e.a}`).join('\n\n')
      : '（知识库没有检索到相关条目）'
    const res = await fetch(`${aiConfig.base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiConfig.key}` },
      body: JSON.stringify({
        model: aiConfig.model || undefined,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '你是电池科普作品 BatteryScope 的站内学习助手"小锂"，面向高校本科低年级学生。' +
              '严格依据下面给出的资料回答，不要引入资料之外的知识点；资料没提的就明说不知道。' +
              '回答用简体中文，口语化但不轻佻，150 字以内，必要时分两三句。'
          },
          { role: 'system', content: `资料：\n${context}` },
          { role: 'user', content: question }
        ]
      })
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('空响应')
    return { text, entry: hits[0]?.e || null, remote: true }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 统一入口：先本地检索，再按配置决定走远程还是本地作答。
 * 远程失败（断网 / 超时 / 4xx）自动回落本地，学习者无感。
 */
export async function ask(question) {
  const q = String(question || '').trim()
  if (!q) return { ...FALLBACK, text: '小锂没听清，再说一遍？' }
  const hits = retrieve(q)
  if (remoteReady()) {
    try {
      return await askRemote(q, hits)
    } catch (err) {
      const local = localAnswer(hits)
      return { ...local, remoteFailed: String(err && err.message ? err.message : err) }
    }
  }
  return localAnswer(hits)
}

export const assistantStatus = () => ({
  remote: remoteReady(),
  corpus: corpusSize(),
  model: aiConfig.model || '(未配置，使用本地检索)'
})
