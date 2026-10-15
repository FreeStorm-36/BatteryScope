// 微动画专项体检：scripts/check-anim.cjs
// ---------------------------------------------------------------
// 逐页把页内微动画滚进视口，检查三件事：
//   ① 画布真的画出了东西（采样统计非透明像素，防止"白板"上线）；
//   ② 过程中没有 JS 异常 / 控制台报错；
//   ③ 顺手出一张裁剪到动画卡片的截图，作为交付佐证。
//
// 用法：
//   node scripts/check-anim.cjs                      # 默认打 5188（交付构建预览）
//   ANIM_BASE=http://127.0.0.1:5173/ node scripts/check-anim.cjs   # 打 dev server
//   ANIM_W=1600 ANIM_H=1100
//
// ⚠️ CDP 类脚本必须**串行**跑（shots / verify-app / diagnose-nav / audit-mobile 互斥），
//    并行会因负载假报失败（2026-10-15 踩过）。本脚本自带 profile 清理。

const { spawn, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const http = require('http')
const { mkProfile, dropProfile, dropProfileSync, sweepStale } = require('./_profile.cjs')

let child = null
let profile = null
function killTree() {
  if (!child) return
  try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }
  child = null
}

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.ANIM_BASE || 'http://127.0.0.1:5188/'
const OUT = process.env.ANIM_OUT || '演示截图/微动画/'
const W = Number(process.env.ANIM_W || 1600)
const H = Number(process.env.ANIM_H || 1100)
const WAIT = Number(process.env.ANIM_WAIT || 7000)
const DWELL = Number(process.env.ANIM_DWELL || 3600)
// ANIM_SEEK=1 让每条动画先跳到末帧再截图 —— 有些元素（如回测的预测/实测标记）
// 只在后半程才出现，只看默认时刻会漏掉叠字问题。
const SEEK = process.env.ANIM_SEEK ? Math.max(0, Math.min(1, Number(process.env.ANIM_SEEK))) : null

// 页面 → 该页按顺序出现的微动画 id（顺序必须与视图里的 VideoSlot 顺序一致）
// ANIM_ONLY=aging,datalab 可只跑其中几页（改动画时快速复检，不必等全量 8 分钟）。
const ONLY = (process.env.ANIM_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean)
const ALL_PAGES = [
  ['principle', '#/principle', ['ch03-ion-path', 'ch03-cccv']],
  ['aging', '#/aging', ['ch04-sei', 'ch04-plating']],
  ['datalab', '#/datalab', ['ch05-nasa']],
  ['prediction', '#/prediction', ['ch06-methods']],
  ['ending', '#/ending', ['ch07-holdout']],
  ['types', '#/types', []] // 第 02 章仍保留真实视频位，这里只确认它不泄漏占位内容
]
const PAGES = ONLY.length ? ALL_PAGES.filter(([n]) => ONLY.includes(n)) : ALL_PAGES

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
})

async function open(hash, port) {
  profile = mkProfile('anim-' + port + '-')
  child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
    `--window-size=${W},${H}`, '--hide-scrollbars',
    `${BASE}?p=anim#` + hash.replace(/^#/, '')
  ], { stdio: 'ignore' })

  let list = null
  for (let i = 0; i < 80; i++) {
    try { list = await get(`http://127.0.0.1:${port}/json/list`); if (list?.some((t) => t.type === 'page')) break } catch (e) { /* retry */ }
    await sleep(400)
  }
  if (!list) throw new Error('无法连接调试端口 ' + port)

  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  const problems = []
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return }
    if (m.method === 'Runtime.exceptionThrown') {
      problems.push('JS异常: ' + (m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || '?'))
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params?.type)) {
      const txt = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')
      if (txt) problems.push(`console.${m.params.type}: ${txt}`)
    }
  }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: false })
    return r.result?.result?.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await sleep(WAIT)
  return { send, evaluate, problems, ws }
}

/** 采样统计画布上的非透明像素，确认"真的画了"。 */
const STATS_JS = (i) => `(() => {
  const c = document.querySelectorAll('.ma-stage canvas')[${i}]
  if (!c) return JSON.stringify({ ok: false, why: 'no canvas' })
  const g = c.getContext('2d')
  const d = g.getImageData(0, 0, c.width, c.height).data
  const stride = 4 * 53
  let painted = 0, sampled = 0
  for (let k = 3; k < d.length; k += stride) { sampled++; if (d[k] > 10) painted++ }
  const card = c.closest('.micro-anim')
  return JSON.stringify({
    ok: true, w: c.width, h: c.height, painted, sampled,
    ratio: +(painted / Math.max(1, sampled)).toFixed(3),
    tag: card ? card.querySelector('.ma-tag')?.textContent?.trim() : '',
    title: card ? card.querySelector('b')?.textContent?.trim() : '',
    basis: card ? (card.querySelector('.ma-basis')?.textContent || '').trim().length : 0,
    note: card ? (card.querySelector('.ma-note')?.textContent || '').trim().length : 0
  })
})()`

const BOX_JS = (i) => `(() => {
  const c = document.querySelectorAll('.ma-stage canvas')[${i}]
  if (!c) return 'null'
  const card = c.closest('.micro-anim')
  const r = card.getBoundingClientRect()
  return JSON.stringify({ x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height, sy: window.scrollY })
})()`

async function run() {
  sweepStale('anim-')
  fs.mkdirSync(OUT, { recursive: true })
  let bad = 0
  let total = 0

  for (let p = 0; p < PAGES.length; p++) {
    const [name, hash, slots] = PAGES[p]
    const port = 9500 + p
    const ctx = await open(hash, port)
    const gotHash = await ctx.evaluate('location.hash')
    console.log(`\n── ${name} ${hash} → hash=${gotHash || '(空)'}`)

    const stageCount = Number(await ctx.evaluate("document.querySelectorAll('.ma-stage').length"))
    console.log(`   .ma-stage 数量 = ${stageCount}（期望 ${slots.length}）`)
    if (stageCount !== slots.length) bad++

    for (let i = 0; i < slots.length; i++) {
      total++
      await ctx.evaluate(`(() => { const c = document.querySelectorAll('.ma-stage canvas')[${i}]; if (c) c.scrollIntoView({ block: 'center' }); return 1 })()`)
      await sleep(DWELL)
      if (SEEK != null) {
        await ctx.evaluate(`(() => {
          const c = document.querySelectorAll('.ma-stage canvas')[${i}]
          const r = c && c.closest('.micro-anim') && c.closest('.micro-anim').querySelector('.ma-seek')
          if (!r) return 0
          r.value = String(Math.round(${SEEK} * 1000))
          r.dispatchEvent(new Event('input', { bubbles: true }))
          return 1
        })()`)
        await sleep(500)
      }
      const stats = JSON.parse(await ctx.evaluate(STATS_JS(i)))
      const box = JSON.parse((await ctx.evaluate(BOX_JS(i))) || 'null')
      const ok = stats.ok && stats.ratio > 0.02
      if (!ok) bad++
      console.log(
        `   ${ok ? 'ok  ' : 'BAD '} ${slots[i].padEnd(16)} 像素覆盖率 ${stats.ratio} (${stats.painted}/${stats.sampled}) ` +
          `canvas=${stats.w}×${stats.h} 标签="${stats.tag}" 依据${stats.basis}字 口径${stats.note}字`
      )
      if (box && box.w > 0) {
        const shot = await ctx.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
          clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h) - 6, scale: 1 }
        })
        fs.writeFileSync(path.join(OUT, `anim-${slots[i]}.png`), Buffer.from(shot.result.data, 'base64'))
      }
    }

    if (ctx.problems.length) {
      bad++
      console.log('   控制台问题：')
      ctx.problems.slice(0, 8).forEach((x) => console.log('     · ' + x))
    } else {
      console.log('   控制台：无异常')
    }

    ctx.ws.close()
    killTree()
    await dropProfile(profile)
    profile = null
  }

  console.log(`\n共检查 ${total} 条微动画，问题 ${bad} 处。截图输出到 ${OUT}`)
  process.exit(bad ? 2 : 0)
}

run().catch((e) => { killTree(); dropProfileSync(profile); console.error('ERROR', e.message); process.exit(1) })
