// 数据统一入口 —— UI 只依赖接口，未来可换 API / 真实模型
import B0005 from './nasa/B0005.json'
import B0006 from './nasa/B0006.json'
import B0007 from './nasa/B0007.json'
import B0018 from './nasa/B0018.json'

const NASA = { B0005, B0006, B0007, B0018 }

export function loadBattery(id) {
  const d = NASA[id]
  if (!d) throw new Error(`unknown battery ${id}`)
  return d // { id, cycles: [{cycle, capacity, soh}], meta: { vCutoff, temp, nCycles, qRef, source } }
}

export const NASA_IDS = Object.keys(NASA)

// 电池外形数据（第 2 页 · 板块 A）
export const batteryShapes = [
  {
    key: '18650', name: '18650 圆柱', size: '直径 18 mm × 高 65 mm',
    dim: [18, 65], desc: '最经典的锂电池型号，结构成熟、产量极大，笔记本电脑电池组与早期电动车都常用它。',
    note: '18 = 直径 18mm，650 = 高度 65.0mm', color: '#4da8ff'
  },
  {
    key: '21700', name: '21700 圆柱', size: '直径 21 mm × 高 70 mm',
    dim: [21, 70], desc: '比 18650 更粗更高，单体容量更高，是当前主力动力电池型号之一（如 Model 3）。',
    note: '21 = 直径 21mm，700 = 高度 70.0mm', color: '#22d3ee'
  },
  {
    key: 'prism', name: '方形电芯', size: '铝壳 · 尺寸不统一',
    dim: [40, 96], desc: '硬质铝壳方形电芯，成组效率高、便于大尺寸设计，车规动力电池常用（如刀片电池的祖先）。',
    note: '外壳为铝合金，内部同样是卷芯或叠片', color: '#a78bfa'
  },
  {
    key: 'pouch', name: '软包电芯', size: '铝塑膜 · 形状灵活',
    dim: [55, 80], desc: '用铝塑膜封装，质量轻、形状可以定制，但机械强度和密封要求更高。',
    note: '铝塑膜 ≠ 金属硬壳，受挤压易变形', color: '#f59e0b'
  }
]

// 化学体系数据（第 2 页 · 板块 B）
export const chemistries = [
  {
    key: 'LFP', full: '磷酸铁锂 LiFePO₄', make: '橄榄石结构 · 铁系正极',
    scores: { 能量密度: 2.2, 安全性: 5, 循环寿命: 5, 成本优势: 4.5 },
    apps: '比亚迪刀片电池 · 储能电站 · 电动大巴',
    metaphor: '像一名耐力型选手：单次携带的能量不一定最多，但结构稳定，能承受更多次循环。',
    why: '磷酸铁锂的橄榄石晶体结构非常稳固，充电时氧不易脱出，热失控温度高，因此安全且寿命长；但铁系材料电压平台较低，能量密度受限。'
  },
  {
    key: 'NMC', full: '三元锂 NMC（镍钴锰）', make: '层状结构 · 镍钴锰复合正极',
    scores: { 能量密度: 4.5, 安全性: 3, 循环寿命: 3.5, 成本优势: 3 },
    apps: '主流纯电动车 · 电动工具 · 部分消费电子',
    metaphor: '像一名全能型选手：能量、寿命、成本都比较均衡，是当前电动车的主流选择。',
    why: '镍提高能量密度，锰和钴稳定结构与循环；镍比例越高能量越高，但热稳定性随之下降，需要更精细的电池管理。'
  },
  {
    key: 'NCA', full: '镍钴铝 NCA', make: '层状结构 · 高镍正极',
    scores: { 能量密度: 5, 安全性: 2.5, 循环寿命: 3, 成本优势: 2.5 },
    apps: '特斯拉早期车型 · 航空航天',
    metaphor: '像一名爆发力型选手：能量密度天花板高，但脾气也更"娇气"，需要精心呵护。',
    why: '高镍 + 铝的组合把能量密度推得很高，但高镍材料表面活泼，对湿度、温度和充电策略都更敏感。'
  },
  {
    key: 'LCO', full: '钴酸锂 LiCoO₂', make: '层状结构 · 钴系正极',
    scores: { 能量密度: 4, 安全性: 2.5, 循环寿命: 2, 成本优势: 1.5 },
    apps: '手机 · 笔记本电脑 · 相机等 3C 数码',
    metaphor: '像一名短跑型选手：体积小、能量足，但不耐久，频繁"冲刺"（深充深放）会明显缩短寿命。',
    why: '钴酸锂压实密度高、体积能量密度出色，适合空间紧张的手机；但钴贵、循环性能一般，不适合动力场景。'
  }
]

// 第 4 页 · 六类老化机制（"典型机制观察库"，非同一电池必然顺序）
export const mechanisms = [
  {
    key: 'sei', short: 'SEI 增厚', term: 'SEI 膜持续生长（LLI）', color: '#f59e0b',
    what: '负极表面会自然长出一层叫 SEI 的保护膜。',
    why: '首次充电时电解液在负极表面分解，形成一层固体电解质界面膜。',
    see: '观众会看到：负极表面的黄褐色膜随概念进程逐渐变厚。',
    impact: '膜每长厚一点，就永久"锁住"一点可循环的锂离子，容量缓慢下降。',
    equation: 'dL_SEI/dt ∝ 1/L_SEI',
    symbols: 'L_SEI：SEI 膜厚度。膜越薄长得越快，越厚长得越慢（所以早期老化快、后段趋缓）。',
    factors: '高温、高 SOC 存放会加速 SEI 生长。', link: '容量下降（LLI，损失锂库存）'
  },
  {
    key: 'plating', short: '析锂', term: '锂析出 / Lithium Plating', color: '#e2e8f0',
    what: '本该嵌入负极的锂，来不及进去，就在表面堆成银白色金属锂。',
    why: '低温充电、大倍率快充或充电电压过高时，锂离子"挤不进"负极。',
    see: '观众会看到：负极表面析出银白色枝晶状突起。',
    impact: '枝晶可能刺穿隔膜造成内短路；析出的锂失去活性，容量直接损失。',
    equation: 'j_Li > 0 ⟺ U_anode − φ_s + φ_e < 0',
    symbols: 'j_Li：析锂通量；U_anode：锂沉积平衡电位；φ_s、φ_e：固相/液相电位。电位越过临界值即开始析锂。',
    factors: '低温、快充、过充。', link: '容量损失 + 安全风险上升（内短路隐患）'
  },
  {
    key: 'crack', short: '颗粒开裂', term: '颗粒应力开裂与疲劳', color: '#fbbf24',
    what: '电极颗粒在充放电中反复"呼吸"（膨胀收缩），慢慢出现裂纹。',
    why: '嵌锂/脱锂使晶格体积变化，颗粒内部产生应力，循环往复导致疲劳开裂。',
    see: '观众会看到：完整颗粒上裂纹线逐渐出现、变多变长。',
    impact: '裂纹暴露新表面生成更多 SEI；严重时颗粒碎裂、失去电接触。',
    equation: 'dε_a/dt = −k_LAM · (σ_h / σ_crit)^m',
    symbols: 'σ_h：颗粒内应力；σ_crit：临界应力；k_LAM、m：材料常数。应力越接近临界值，损伤累积越快。',
    factors: '深充深放（大 DOD）、高倍率。', link: '内阻上升、活性材料损失（LAM）'
  },
  {
    key: 'lam', short: '材料失活', term: '活性材料损失（LAM）', color: '#94a3b8',
    what: '一部分电极颗粒"掉队"了——不再参与充放电。',
    why: '开裂、导电网络破坏或粘结剂失效，让颗粒与电极失去电子连接。',
    see: '观众会看到：部分颗粒从活性色渐渐变成灰色。',
    impact: '可用活性材料减少，容量直接下降，且不可逆。',
    equation: 'Q_avail = Σ m_active,i · Q_spec,i',
    symbols: 'm_active,i：仍保持电接触的活性材料质量；失活颗粒不再计入求和。',
    factors: '长期深循环、机械滥用。', link: '容量台阶式下降（LAM，负极/正极侧）'
  },
  {
    key: 'electrolyte', short: '电解液减少', term: '电解液损耗', color: '#22d3ee',
    what: '搬运锂离子的"海水"变少了。',
    why: '电解液参与 SEI 生长等副反应被持续消耗，浸润性变差。',
    see: '观众会看到：电解液区域的透明液体范围缩小、变浑浊。',
    impact: '离子传输阻力变大，内阻上升，倍率性能下降。',
    equation: 'R_ion ∝ l_sep / (ε_e · κ)',
    symbols: 'l_sep：隔膜厚度；ε_e：电解液体积分数；κ：电导率。电解液越少，离子路径电阻越大。',
    factors: '高温储存、长期循环。', link: '内阻上升、功率能力下降'
  },
  {
    key: 'gas', short: '产气鼓胀', term: '产气与形变（鼓胀）', color: '#f87171',
    what: '电池内部"胀气"了——外壳鼓起、变胖。',
    why: '副反应产生气体（H₂、CO₂、烷烃等），在电芯内积聚。',
    see: '观众会看到：外壳轮廓微微鼓起，内部出现气泡。',
    impact: '界面接触变差、局部压力升高，严重时是热失控的前兆信号之一。',
    equation: 'p_gas = n_gas·R·T / V_free',
    symbols: 'n_gas：产气摩尔数；V_free：电芯内自由体积。产气越多、自由空间越小，内压越高。',
    factors: '过充、高温、析锂后副反应。', link: '形变、安全隐患'
  }
]

// 老化统一状态对象（第 4 页唯一状态源）
// 0/100/300/450/600 人工校准概念状态，中间平滑插值 —— 仅驱动科普动画
export const AGING_KEYS = ['cycle', 'soh', 'resistance', 'temperatureRise', 'seiSeverity', 'platingSeverity', 'crackSeverity', 'lamSeverity', 'electrolyteSeverity', 'gasSeverity']

const CAL = [
  // cycle, soh, res, tempRise, sei, plating, crack, lam, electrolyte, gas
  [0,   1.00, 1.00, 1.00, 0.02, 0.00, 0.00, 0.00, 0.02, 0.00],
  [100, 0.97, 1.15, 1.08, 0.30, 0.00, 0.05, 0.02, 0.15, 0.02],
  [300, 0.91, 1.45, 1.30, 0.55, 0.10, 0.45, 0.20, 0.35, 0.12],
  [450, 0.85, 1.85, 1.65, 0.70, 0.25, 0.70, 0.50, 0.55, 0.30],
  [600, 0.78, 2.40, 2.10, 0.85, 0.45, 0.90, 0.75, 0.75, 0.55]
]

export function agingStateAt(cycle) {
  const c = Math.max(0, Math.min(600, cycle))
  let a = CAL[0], b = CAL[CAL.length - 1]
  for (let i = 0; i < CAL.length - 1; i++) {
    if (c >= CAL[i][0] && c <= CAL[i + 1][0]) { a = CAL[i]; b = CAL[i + 1]; break }
  }
  const t = (c - a[0]) / Math.max(1e-6, b[0] - a[0])
  const smooth = t * t * (3 - 2 * t) * 0.3 + t * 0.7 // 轻度平滑插值
  const out = { cycle: c }
  for (let i = 1; i < AGING_KEYS.length; i++) {
    out[AGING_KEYS[i]] = a[i] + (b[i] - a[i]) * smooth
  }
  return out
}

// 概念老化进程（0-100%）：仅用于连接机制动画，不对应固定循环次数，
// 也不代表某一型号电池必然达到相同状态。页面需常驻此口径说明。
export const PROGRESS_SPAN = 600 // 内部插值刻度上限

export const progressToCycle = (p) => Math.max(0, Math.min(100, p)) / 100 * PROGRESS_SPAN
export const cycleToProgress = (c) => Math.round(Math.max(0, Math.min(PROGRESS_SPAN, c)) / PROGRESS_SPAN * 100)

export const AGING_MILESTONES = [
  { cycle: 0, label: '初始状态' }, { cycle: 120, label: '早期副反应示意' },
  { cycle: 300, label: '损伤积累示意' }, { cycle: 450, label: '加速阶段示意' }, { cycle: 600, label: '严重老化示意' }
]

// 第 5 页 · 环境趋势科普规则矩阵（固定，不伪装成寿命模型）
export const envRules = {
  temperature: {
    name: '温度', options: [
      { key: 'low', label: '低温', trend: 2, explain: '离子迁移变慢，快充时析锂风险增加' },
      { key: 'mid', label: '适宜', trend: 1, explain: '反应和传输处在较合适范围' },
      { key: 'high', label: '高温', trend: 2, explain: '副反应和 SEI 生长加速' }
    ]
  },
  rate: {
    name: '充放电倍率', options: [
      { key: 'slow', label: '慢充', trend: 0, explain: '极化与发热相对较小' },
      { key: 'mid', label: '常规', trend: 1, explain: '作为比较基线' },
      { key: 'fast', label: '快充', trend: 2, explain: '极化、发热与析锂风险提高' }
    ]
  },
  dod: {
    name: '放电深度', options: [
      { key: 'shallow', label: '浅循环', trend: 0, explain: '电极材料体积变化较小' },
      { key: 'mid', label: '中等', trend: 1, explain: '作为比较基线' },
      { key: 'deep', label: '深循环', trend: 2, explain: '颗粒应力与材料损伤累积更明显' }
    ]
  }
}
export const TREND_LEVELS = ['较慢', '接近基准', '加快', '明显加快']
