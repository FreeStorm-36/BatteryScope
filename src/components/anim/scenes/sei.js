/**
 * 微动画 · SEI 膜：电池"生来就有"的一层膜
 * 填补视频位 `ch04-sei`
 * ---------------------------------------------------------------
 * 素材里给 SEI 的方程是 dL/dt ∝ 1/L（见 src/data/index.js 的 mechanisms），
 * 积分即 L ∝ √t —— 也就是"早期长得快、越厚长得越慢"。
 * 动画按这条关系推进，并把**代价**画出来：锂被永久锁进膜里（LLI），
 * 所以"循环数 ↑ → 可循环锂 ↓"。
 *
 * 画面语言（这一条最需要纠正的常见画法）：
 *   SEI **不是**悬在电极上方的一条薄膜，而是**包覆在负极颗粒表面**的壳。
 *   所以这里把负极画成颗粒床，膜画在每颗颗粒的外表面（见 stage.js 的 shell()），
 *   随循环一起增厚；靠得近的颗粒最终被膜连成一片 —— 这正是阻抗上升的直观来源。
 *
 * ⚠️ 厚度与锂损失都是**归一化相对量**：√t 关系取文献常用形式，
 *   比例系数（本动画取 18% 上限）是示意值，不对应任何具体电芯的实测容量曲线。
 *   颗粒形貌同为程序生成的示意结构。
 */

import { C, alpha, ball, chip, clipRRect, easeOut, fillRRect, grainBed, labelTag, lerp, rng, seg, shell, text } from '../stage.js'

const MAX_CYCLE = 300
const LOSS_AT_MAX = 0.18 // 300 循环后损失的归一化可循环锂（示意比例）
// 电解液里的溶剂分子（静态装饰）
const rnd = rng(4242)
const SOLVENT = Array.from({ length: 30 }, () => ({ x: rnd(), y: rnd(), r: 0.7 + rnd() * 0.8, a: 0.1 + rnd() * 0.16 }))

/** 归一化 SEI 厚度：受扩散限制，L ∝ √t（此处 t = 循环数）。 */
const thicknessAt = (n) => Math.sqrt(Math.max(0, n) / MAX_CYCLE)
/** 归一化可循环锂（1 = 初始）。被 SEI 永久"锁住"的那部分与厚度成正比。 */
const lithiumAt = (n) => 1 - LOSS_AT_MAX * thicknessAt(n)

function draw(ctx, { w, h, t }) {
  const narrow = w < 520
  const PAD = 16
  const sx = PAD
  const sw = w - PAD * 2

  // 上半：界面剖面；下半：归一化曲线
  const schemaH = Math.max(100, h * 0.54)
  const sy = 8
  const plotTop = sy + schemaH + 28
  const plotBottom = h - 26
  const plotH = Math.max(40, plotBottom - plotTop)

  // 循环推进（前 12% 留给"首次充电成膜"）
  const n = Math.round(MAX_CYCLE * easeOut(seg(t, 0.12, 0.9)))
  const forming = t < 0.12
  const d = thicknessAt(n)
  const mm = forming ? 0.05 : d // 当前膜厚（0→1）

  // ── 顶部读数（窄屏用短标签，三个胶囊才放得下） ──
  const c1 = chip(
    ctx,
    forming ? (narrow ? 'SEI 形成' : '首次充电 · SEI 形成') : narrow ? `${n} 次` : `已循环 ${n} 次`,
    sx,
    6,
    { color: forming ? C.amber : C.blue, size: 11 }
  )
  const dw = chip(
    ctx,
    narrow ? `厚度 ${mm.toFixed(2)}` : `SEI 厚度 ${mm.toFixed(2)}`,
    sx + c1 + 8,
    6,
    { color: C.amber, size: 11 }
  )
  const lw = chip(
    ctx,
    narrow ? `锂 −${(((1 - lithiumAt(n)) * 100) | 0)}%` : `可循环锂 −${(((1 - lithiumAt(n)) * 100) | 0)}%`,
    sx + c1 + dw + 16,
    6,
    { color: C.green, size: 11 }
  )
  if (!narrow) {
    text(ctx, '归一化相对量 · 非绝对测量值', sx + c1 + dw + lw + 24, 15, { size: 10.5, color: C.t3 })
  }

  // ── 界面剖面 ──
  const innerTop = sy + 16
  const innerBot = sy + schemaH
  const gTop = innerTop + (innerBot - innerTop) * (narrow ? 0.24 : 0.3)

  // 电解液（颗粒床之上）
  fillRRect(ctx, sx, innerTop, sw, Math.max(6, gTop - innerTop), 8, alpha(C.cyan, 0.055))
  // 电解液里的溶剂分子
  for (const s of SOLVENT) {
    ctx.beginPath()
    ctx.arc(sx + 8 + s.x * (sw - 16), innerTop + 4 + s.y * Math.max(2, gTop - innerTop - 8), s.r, 0, Math.PI * 2)
    ctx.fillStyle = alpha(C.cyan, s.a)
    ctx.fill()
  }

  // 负极颗粒床 + 表面 SEI
  const cellSize = narrow ? 19 : 27
  const bed = grainBed(sx + 4, gTop, sw - 8, innerBot - gTop - 4, { seed: 7, cell: cellSize, jitter: 0.28, rK: 0.42 })
  ctx.save()
  // 裁剪区必须从颗粒中心上方开始（gTop - cellSize/2），否则顶排颗粒会被削平
  clipRRect(ctx, sx, gTop - cellSize * 0.55, sw, innerBot - gTop + cellSize * 0.55 + 4, 8)
  fillRRect(ctx, sx, gTop - 2, sw, innerBot - gTop + 2, 8, alpha(C.blue, 0.055))
  // 颗粒本体（略暗，好让琥珀色的膜跳出来）
  for (const g of bed) ball(ctx, g.px, g.py, g.rr, C.blue, 0.34 + g.tone * 0.4)
  // SEI：包覆在每颗粒表面
  for (const g of bed) shell(ctx, g.px, g.py, g.rr, C.amber, mm, { max: narrow ? 5.5 : 7 })
  ctx.restore()

  // 膜表面高光：一条沿着颗粒床顶部的琥珀色光带，强调"膜在界面处最活跃"
  if (!forming) {
    const topRow = bed.filter((g) => g.py - g.rr < gTop + cellSize * 0.7)
    for (const g of topRow) {
      ctx.beginPath()
      ctx.arc(g.px, g.py, g.rr + (narrow ? 5.5 : 7) * mm, Math.PI * 1.08, Math.PI * 1.92)
      ctx.strokeStyle = alpha('#ffd88a', 0.5)
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // 从电解液穿过 SEI 进入石墨的 Li⁺
  const flow = (t * 3.2) % 1
  for (let i = 0; i < 7; i++) {
    const u = (flow + i / 7) % 1
    const x = sx + 16 + ((i * 137) % Math.max(20, sw - 32))
    const y = lerp(innerTop + 8, gTop + (innerBot - gTop) * 0.5, u)
    if (y < innerTop + 4) continue
    const absorbed = y > gTop
    ctx.beginPath()
    ctx.arc(x, y, absorbed ? 1.4 : 1.9, 0, Math.PI * 2)
    ctx.fillStyle = absorbed ? alpha(C.cyan, 0.35) : alpha(C.cyan, 0.95)
    ctx.fill()
    if (!absorbed) {
      ctx.beginPath()
      ctx.arc(x, y, 5.2, 0, Math.PI * 2)
      ctx.fillStyle = alpha(C.cyan, 0.16)
      ctx.fill()
    }
  }

  // 标签（带底衬：直接压在颗粒床上也读得清，不必为它腾空白）
  labelTag(ctx, '电解液', sx + 12, innerTop + 16, { color: alpha(C.cyan, 0.94) })
  const bedLabY = gTop + 14
  labelTag(ctx, "负极颗粒（石墨）", sx + 12, bedLabY, { color: alpha(C.blue, 0.96) })
  if (mm > 0.22) {
    labelTag(ctx, 'SEI 膜包覆在颗粒表面 · 持续增厚', sx + 12, bedLabY + 28, {
      color: alpha('#ffd88a', 0.98),
      bg: 'rgba(26,16,4,.8)'
    })
  }

  // 右侧厚度标尺
  const rx = sx + sw - 10
  const shellT = Math.max(1.2, (narrow ? 5.5 : 7) * mm)
  ctx.strokeStyle = alpha(C.amber, 0.85)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(rx, gTop - shellT)
  ctx.lineTo(rx, gTop)
  ctx.stroke()
  ;[gTop - shellT, gTop].forEach((y) => {
    ctx.beginPath()
    ctx.moveTo(rx - 4, y)
    ctx.lineTo(rx + 4, y)
    ctx.stroke()
  })
  if (!narrow && shellT > 3) {
    text(ctx, '膜厚', rx - 8, gTop - shellT / 2, { size: 10, color: alpha(C.amber, 0.9), align: 'right' })
  }

  // ── 下半：归一化曲线 ──
  const L = narrow ? 42 : 50
  const Rp = 14
  const x0 = L
  const pw = w - L - Rp
  const xAt = (c) => x0 + (c / MAX_CYCLE) * pw
  const yAt = (v) => plotTop + (1 - v) * plotH

  ctx.strokeStyle = alpha(C.blue, 0.1)
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = yAt(i / 4)
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x0 + pw, y)
    ctx.stroke()
    text(ctx, (i / 4).toFixed(2), x0 - 7, y, { size: 9.5, color: C.t3, align: 'right', mono: true })
  }
  text(ctx, '归一化', x0 - 7, plotTop - 12, { size: 10, color: C.t2, align: 'right' })
  text(ctx, '循环次数 →', x0 + pw, plotTop - 12, { size: 10, color: C.t2, align: 'right' })

  const N = 90
  const upTo = (fn, cMax, color, lw, dash) => {
    ctx.setLineDash(dash || [])
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const c = (i / N) * MAX_CYCLE
      if (c > cMax) break
      const x = xAt(c)
      const y = yAt(fn(c))
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
  }
  upTo(thicknessAt, MAX_CYCLE, alpha(C.amber, 0.16), 1.4)
  upTo(lithiumAt, MAX_CYCLE, alpha(C.green, 0.16), 1.4)
  const nowC = Math.max(1, n)
  upTo(thicknessAt, nowC, C.amber, 2, [5, 4])
  upTo(lithiumAt, nowC, C.green, 2, [2, 3])

  text(ctx, 'SEI 厚度 ∝ √t', x0 + pw * 0.28, yAt(0.42) - 12, { size: 10.5, color: alpha(C.amber, 0.95) })
  text(ctx, '可循环锂（LLI）', x0 + pw * 0.6, yAt(0.86) + 12, { size: 10.5, color: alpha(C.green, 0.95) })

  // 扫描点
  const px = xAt(nowC)
  ;[
    [yAt(thicknessAt(nowC)), C.amber],
    [yAt(lithiumAt(nowC)), C.green]
  ].forEach(([y, col]) => {
    ctx.beginPath()
    ctx.arc(px, y, 3.2, 0, Math.PI * 2)
    ctx.fillStyle = col
    ctx.fill()
  })
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = alpha(C.t3, 0.5)
  ctx.beginPath()
  ctx.moveTo(px, plotTop)
  ctx.lineTo(px, plotBottom)
  ctx.stroke()
  ctx.setLineDash([])

  text(
    ctx,
    narrow
      ? '扩散受限：前期快、越厚越慢；锂被永久锁进膜里'
      : '生长受扩散限制 → 早期快、越厚越慢；代价是锂被永久锁进膜里，容量随之缓慢下降',
    x0,
    h - 10,
    { size: 10.5, color: C.t2 }
  )
}

export default {
  title: 'SEI 膜：既是保护层，也在持续消耗可循环锂',
  seconds: '约 14 秒 · 单遍 300 循环',
  duration: 14000,
  aria: 'SEI 膜生长动画：首次充电时在负极颗粒表面形成，随后随循环持续增厚，厚度按平方根关系增长，可循环锂随之下降',
  legend: [
    { color: C.amber, label: 'SEI 膜厚度（归一化）' },
    { color: C.green, label: '可循环锂（归一化）' },
    { color: C.cyan, label: 'Li⁺' },
    { color: C.blue, label: "负极颗粒（石墨）" }
  ],
  basis:
    'SEI 生长遵循受扩散限制的 dL/dt ∝ 1/L 关系（本作品老化机制库中 SEI 一条所用的方程），积分即 L ∝ √t，因此表现为"早期快、越厚越慢"。膜的形貌按其真实存在方式绘制 —— 包覆在负极颗粒表面，而非独立悬浮的一层。',
  disclaimer:
    '归一化相对量：厚度与可循环锂均为 0—1 的无量纲相对值，非绝对测量值。300 循环对应 18% 锂损失的取值是示意比例，不对应任何具体电芯的实测容量曲线；颗粒形貌为程序生成的示意结构。',
  draw
}
