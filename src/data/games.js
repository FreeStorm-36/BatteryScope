/**
 * 第 08 章 · 趣味互动小游戏的数据层
 * ---------------------------------------------------------------
 * 两个游戏共用同一套底层知识（第 04 章机制库 / envRules / 知识库语料），
 * 不新造任何"页面上没讲过"的知识点。
 *
 * 数据真实性口径（与全站铁律一致）：
 *   - 电芯小医生：症状—机制判定完全确定，无随机成分；
 *   - 快充抉择：每段衰减量是**编者人工设定的概念值**（按「温度 × 倍率」
 *     与机制耦合关系标定），页面常驻声明"概念模拟，非真实电化学仿真"；
 *   - 这里没有 Math.random / Math.sin 造数据。
 */

import { mechanisms } from './index.js'
import { envRules } from './index.js'

const mechBy = (key) => mechanisms.find((m) => m.key === key)

/* ── 游戏一 · 电芯小医生 ─────────────────────────────────────── */
// 每例：症状文本（visual 决定动画）+ 正确机制 + 干扰项（从六机制里轮取，不重复）
function distract(correctKey, others) {
  const pool = mechanisms.filter((m) => m.key !== correctKey).map((m) => m.short)
  const picked = []
  for (const k of others) {
    const m = mechBy(k)
    if (m && picked.length < 3) picked.push(m.short)
  }
  for (const s of pool) {
    if (picked.length >= 3) break
    if (!picked.includes(s)) picked.push(s)
  }
  return picked
}

export const doctorRounds = [
  {
    visual: 'sei',
    case: '一块电池用了两年：早期容量掉得挺快，后来越掉越慢。车主用车很温和，从不快充，也基本没在高温下放过电。',
    answer: 'sei',
    options: ['SEI 增厚', ...distract('sei', ['plating', 'gas', 'lam'])],
    note: 'SEI 受扩散限制（dL/dt ∝ 1/L），所以"早期快、后段缓"正是它的指纹。'
  },
  {
    visual: 'plating',
    case: '东北的冬天，车主坚持用大功率快充。三个月后容量明显跳水，拆解后发现负极表面有一层银白色絮状物。',
    answer: 'plating',
    options: ['析锂', ...distract('plating', ['sei', 'crack', 'electrolyte'])],
    note: '低温 + 快充 = 锂离子到达界面的速率超过固相扩散速率，多出来的锂只能堆在表面。'
  },
  {
    visual: 'lam',
    case: '一辆网约车深充深放跑了十几万公里。检测发现：总容量下降的同时，相当一部分活性材料干脆不参与反应了。',
    answer: 'lam',
    options: ['材料失活', ...distract('lam', ['crack', 'electrolyte', 'sei'])],
    note: '开裂、导电网络破坏或粘结剂失效，都会让颗粒与电极失去电子连接——这就是 LAM。'
  },
  {
    visual: 'gas',
    case: '一块退役电池侧面明显鼓胀，摸起来比同批产品更烫，极片之间的界面接触也变差了。',
    answer: 'gas',
    options: ['产气鼓胀', ...distract('gas', ['electrolyte', 'plating', 'crack'])],
    note: '副反应产气（H₂、CO₂ 等）在电芯内积聚，内压升高把外壳顶鼓，同时挤压界面。'
  },
  {
    visual: 'crack',
    case: '长期高倍率工况下，电极颗粒反复膨胀收缩，表面出现裂纹；新暴露的表面又长出了更多的膜，内阻随之上升。',
    answer: 'crack',
    options: ['颗粒开裂', ...distract('crack', ['lam', 'gas', 'plating'])],
    note: '嵌锂 / 脱锂让晶格反复"呼吸"，应力循环导致疲劳开裂，裂纹新表面又加速 SEI 生长。'
  }
]

/* ── 游戏二 · 快充抉择 ─────────────────────────────────────── */
// 每选一次 = 使用 10 个循环。衰减与机制增量均为编者设定的概念值。
const tempExplain = (k) => envRules.temperature.options.find((o) => o.key === k).explain
const rateExplain = (k) => envRules.rate.options.find((o) => o.key === k).explain

export const strategies = [
  {
    key: 'slow-mid', label: '慢充 · 25 ℃', hint: '约 1/3 C 常规充电，温度适宜',
    soh: -1.1, sei: 0.030, plating: 0, gas: 0.005, temp: 0.005,
    flavor: `${tempExplain('mid')}；${rateExplain('slow')}。`
  },
  {
    key: 'fast-mid', label: '快充 · 25 ℃', hint: '1C 快充，温度适宜',
    soh: -2.2, sei: 0.060, plating: 0.030, gas: 0.020, temp: 0.030,
    flavor: `${tempExplain('mid')}；${rateExplain('fast')}。`
  },
  {
    key: 'fast-high', label: '快充 · 40 ℃', hint: '1C 快充，叠加高温环境',
    soh: -4.0, sei: 0.100, plating: 0.060, gas: 0.050, temp: 0.060,
    flavor: `${tempExplain('high')}；${rateExplain('fast')}。`
  },
  {
    key: 'slow-low', label: '慢充 · 0 ℃', hint: '1/3 C 慢充，但环境低温',
    soh: -1.8, sei: 0.020, plating: 0.080, gas: 0.005, temp: -0.020,
    flavor: `${tempExplain('low')}；${rateExplain('slow')}。`
  }
]

export const STRATEGY_CALIBER =
  '概念模拟：每一"段"代表 10 个循环，衰减量与机制增量由编者按「温度 × 倍率」与机制耦合关系人工设定，只用于理解趋势，不是真实电化学仿真，也不对应任何具体电芯。'

// 事件阈值：确定性触发（同一串选择必然得到同一串事件，可复现）
// 返回 { key, text }；key 用于让小锂按对应知识库条目讲解
export function strategyEvent(state, fired) {
  if (state.plating >= 0.25 && !fired.plating) {
    fired.plating = true
    return { key: 'plating', text: '负极表面出现银白色沉积——低温或大倍率让锂来不及嵌入，这就是析锂；枝晶还有刺穿隔膜的风险。' }
  }
  if (state.sei >= 0.5 && !fired.sei) {
    fired.sei = true
    return { key: 'sei', text: 'SEI 膜明显增厚，可循环锂库存持续下降——容量损失早期快、后段缓。' }
  }
  if (state.gas >= 0.4 && !fired.gas) {
    fired.gas = true
    return { key: 'gas', text: '电芯鼓胀、内压升高，界面接触变差——产气是热失控的前兆信号之一。' }
  }
  if (state.temp >= 0.15 && !fired.temp) {
    fired.temp = true
    return { key: 'temp', text: '温升偏高：副反应速率随温度指数式加快，高温是老化最猛的加速器。' }
  }
  return null
}

export function strategyRank(segments) {
  if (segments >= 16) return { grade: 'S', title: '电池管家', line: '温和使用 + 避开极端温度，电池被你用到了极限。' }
  if (segments >= 12) return { grade: 'A', title: '老练车主', line: '大部分选择都避开了高危组合，已经相当克制。' }
  if (segments >= 8) return { grade: 'B', title: '普通用户', line: '有几段高危操作加速了衰减——试试全程避开「快充 · 40 ℃」。' }
  return { grade: 'C', title: '暴力选手', line: '高温快充 + 低温快充轮番上阵，电池衰得最快。' }
}
