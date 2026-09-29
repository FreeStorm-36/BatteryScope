/* 从 NASA 四颗电芯的真实记录中提取趋势图所用的模板：
   (1) 归一化寿命轴上的集成平均退化形状 SHAPE[p]  p=0..1（121 个节点）
   (2) B0005 实测残差序列 RESID（实际 SOH − 自身 9 点滑动平均），用于复现真实逐次起伏
   产出：src/data/nasa/trendTemplate.js
   用法：node scripts/gen-trend-template.cjs
   —— 数据实验室板块 B 的趋势曲线形状与波动直接来自这个文件，
      所以任何时候都不要手改 trendTemplate.js，改数据源后重跑本脚本。 */
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '..', 'src', 'data', 'nasa')
const ids = ['B0005', 'B0006', 'B0007', 'B0018']
const cells = ids.map((id) => JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8')))

const K = 120 // 121 个节点
// 线性插值：给定 p∈[0,1] 取 SOH
function sample(cyc, p) {
  const first = cyc[0].cycle, last = cyc[cyc.length - 1].cycle
  const target = first + p * (last - first)
  if (target <= first) return cyc[0].soh
  if (target >= last) return cyc[cyc.length - 1].soh
  let lo = 0, hi = cyc.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (cyc[mid].cycle <= target) lo = mid; else hi = mid
  }
  const t = (target - cyc[lo].cycle) / (cyc[hi].cycle - cyc[lo].cycle)
  return cyc[lo].soh + (cyc[hi].soh - cyc[lo].soh) * t
}

const SHAPE = []
for (let k = 0; k <= K; k++) {
  const p = k / K
  let s = 0
  for (const c of cells) s += sample(c.cycles, p)
  SHAPE.push(+(s / cells.length).toFixed(5))
}

// B0005 残差：相对自身 centred moving average（窗口 9）的偏离，
// 这样量出的是真实的逐次测量起伏，而不是插值零残差。
const b5 = cells[0]
const sohArr = b5.cycles.map((c) => c.soh)
const W = 4
const RESID = sohArr.map((v, i) => {
  const a = Math.max(0, i - W), b = Math.min(sohArr.length - 1, i + W)
  let s = 0
  for (let j = a; j <= b; j++) s += sohArr[j]
  return +(v - s / (b - a + 1)).toFixed(5)
})
const mean = RESID.reduce((a, b) => a + b, 0) / RESID.length
const sd = Math.sqrt(RESID.reduce((a, b) => a + (b - mean) ** 2, 0) / RESID.length)
const maxAbs = Math.max(...RESID.map(Math.abs))

// 每颗电芯的 qRef 与寿命跨度，便于标注
const facts = cells.map((c) => ({
  id: c.id,
  qRef: c.meta.qRef,
  n: c.cycles.length,
  首: c.cycles[0].soh,
  末: c.cycles[c.cycles.length - 1].soh,
  末容量: c.cycles[c.cycles.length - 1].capacity,
  首容量: c.cycles[0].capacity
}))

console.log('每颗电芯:', JSON.stringify(facts, null, 1))
console.log('模板首末:', SHAPE[0], SHAPE[K])
console.log('残差 mean =', mean.toFixed(5), ' sd =', sd.toFixed(5), ' maxAbs =', maxAbs.toFixed(5))
// 模板在若干进度点的值
;['0', '0.25', '0.45', '0.5', '0.7', '0.85', '1'].forEach((p) => {
  console.log('  SHAPE@' + p + ' =', SHAPE[Math.round(Number(p) * K)])
})
// 各档 severity 在 c=600 的落点（p = k/2.2）
;[0.55, 1, 1.55, 2.2].forEach((k) => {
  const p = k / 2.2
  console.log('  k=' + k + ' → p=600 处 ' + p.toFixed(3) + ' → SOH ≈ ' + (SHAPE[Math.round(p * K)] * 100).toFixed(1) + '%')
})

const out = `// 由 NASA PCoE 四颗 18650 实测记录自动提取（勿手改；重跑 scripts/gen-trend-template.cjs 覆盖）
// SHAPE[p]: 归一化寿命轴上 0..1 的集成平均容量保持率（121 节点，四颗电芯平均）
// RESID[]: B0005 实测 SOH 相对其局部光滑轨迹的残差（168 点），用于复现真实逐次起伏
export const SHAPE_N = ${K}
export const SHAPE = [${SHAPE.join(',')}]

export const RESID = [${RESID.join(',')}]

export const SHAPE_META = {
  source: 'NASA PCoE Battery Dataset (B0005 / B0006 / B0007 / B0018)',
  cells: ${JSON.stringify(ids)},
  spanNote: '四颗电芯起始容量 ${facts.map((f) => f.首容量).join(' / ')} Ah，末次容量 ${facts.map((f) => f.末容量).join(' / ')} Ah',
  residSd: ${sd.toFixed(6)},
  residMaxAbs: ${maxAbs.toFixed(6)},
  endSoh: ${SHAPE[K]}
}
`
fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'nasa', 'trendTemplate.js'), out, 'utf8')
console.log('\n已写出 src/data/nasa/trendTemplate.js')
