/**
 * 微动画 · 物理模型、数据驱动、融合方法：三条路各自在做什么
 * 填补视频位 `ch06-methods`
 * ---------------------------------------------------------------
 * 页面上的三条路线是**静态对比图 + 切换**，缺的是"三种方法处理同一批数据时
 * 各自在干什么"的动感。这里用三栏并列，让三者的输入/输出形态同时长出来：
 *   物理模型 → 从方程出发的平滑曲线
 *   数据驱动 → 从散点里长出来的拟合线
 *   融合方法 → 曲线被数据牵引、又被物理约束拉住
 *
 * ⚠️ 三条路线下方的评分条是**主观 1—5 档的定性评分**，与第 02 章化学体系
 *   雷达图同一口径（编者依公开综述给出的相对位置），不是量化测量结果。
 *   页面上有常驻声明。
 */

import { C, alpha, chip, easeOut, fillRRect, lerp, rng, seg, strokeRRect, text } from '../stage.js'

const rnd = rng(31415)
// 散点：同一条趋势上叠加确定性抖动（纯装饰，不代表任何实测数据）
const DOTS = Array.from({ length: 26 }, (_, i) => {
  const x = i / 25
  return { x, y: 0.78 - 0.5 * Math.pow(x, 1.3) + (rnd() - 0.5) * 0.13 }
})

const LANES = [
  {
    key: 'physics',
    name: '物理模型',
    sub: '从电化学方程出发',
    color: C.violet,
    from: 0.0,
    to: 0.32,
    bars: { 可解释性: 5, 数据需求: 2, 算力: 3 },
    edge: '数据少也能用，但参数难标定、算得慢'
  },
  {
    key: 'data',
    name: '数据驱动',
    sub: '直接从历史数据学规律',
    color: C.cyan,
    from: 0.06,
    to: 0.55,
    bars: { 可解释性: 1.5, 数据需求: 5, 算力: 4 },
    edge: '拟合能力强，但吃数据、可解释性弱'
  },
  {
    key: 'fusion',
    name: '融合方法（如 PINN）',
    sub: '物理约束 + 神经网络',
    color: C.green,
    from: 0.4,
    to: 0.95,
    bars: { 可解释性: 3.5, 数据需求: 4, 算力: 5 },
    edge: '兼顾两边，训练与验证成本高'
  }
]

function drawLane(ctx, x, y, w, h, lane, t, compact) {
  // 迷你示意框的高度按"剩余空间"反推，而不是取固定比例 ——
  // 否则宽屏下三条路线下方会空出一大截，画面重心全挤在上半部。
  // compact（窄屏三栏上下叠放）每栏只有 ~60px 高，只留标题 + 示意框，
  // 评分条与适用边界一律不画，否则必然溢出。
  const headH = 26
  const miniH = compact ? Math.max(30, h - headH - 8) : Math.max(80, h - headH - 69)
  const p = easeOut(seg(t, lane.from, lane.to))

  chip(ctx, lane.name, x, y, { color: lane.color, size: 10.5 })
  text(ctx, lane.sub, x + w, y + 10, { size: 10, color: C.t3, align: 'right' })

  // ── 迷你示意 ──
  const mx = x + 8
  const my = y + 26
  const mw = w - 16
  strokeRRect(ctx, mx, my, mw, miniH, 8, alpha(lane.color, 0.22))
  // 框内淡网格：让示意框看起来像"坐标纸"，而不是一块空黑板。
  // 窄屏（compact，每栏仅约 64px 高）不画，否则网格比曲线还显眼。
  if (!compact && miniH > 60) {
    ctx.strokeStyle = alpha(lane.color, 0.07)
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const yy = my + (miniH * i) / 4
      ctx.beginPath()
      ctx.moveTo(mx + 4, yy)
      ctx.lineTo(mx + mw - 4, yy)
      ctx.stroke()
    }
    for (let i = 1; i < 4; i++) {
      const xx = mx + (mw * i) / 4
      ctx.beginPath()
      ctx.moveTo(xx, my + 4)
      ctx.lineTo(xx, my + miniH - 4)
      ctx.stroke()
    }
  }
  const insetY = Math.min(12, miniH * 0.22)
  const insetX = Math.min(12, mw * 0.06)
  const ax0 = mx + insetX
  const ax1 = mx + mw - insetX
  const ay0 = my + miniH - insetY
  const ay1 = my + insetY
  ctx.strokeStyle = alpha(lane.color, 0.35)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(ax0, ay0)
  ctx.lineTo(ax1, ay0)
  ctx.moveTo(ax0, ay0)
  ctx.lineTo(ax0, ay1)
  ctx.stroke()

  const px = (u) => lerp(ax0, ax1, u)
  const py = (v) => lerp(ay0, ay1, v)

  if (lane.key === 'physics') {
    // 从方程出发的平滑曲线
    if (!compact) text(ctx, '∂Q/∂t = f(…)', ax0 + 4, py(0.94), { size: 9.5, color: alpha(C.violet, 0.9) })
    ctx.beginPath()
    for (let i = 0; i <= 60; i++) {
      const u = i / 60
      if (u > p) break
      i ? ctx.lineTo(px(u), py(0.78 - 0.5 * Math.pow(u, 1.3))) : ctx.moveTo(px(u), py(0.78 - 0.5 * Math.pow(u, 1.3)))
    }
    ctx.strokeStyle = C.violet
    ctx.lineWidth = 2
    ctx.stroke()
  } else if (lane.key === 'data') {
    // 散点逐渐出现 → 拟合线随后跟上
    const shown = Math.round(p * DOTS.length)
    DOTS.slice(0, shown).forEach((d) => {
      ctx.beginPath()
      ctx.arc(px(d.x), py(d.y), 1.9, 0, Math.PI * 2)
      ctx.fillStyle = alpha(C.cyan, 0.9)
      ctx.fill()
    })
    const fit = easeOut(seg(p, 0.45, 1))
    if (fit > 0) {
      ctx.beginPath()
      for (let i = 0; i <= 60; i++) {
        const u = (i / 60) * fit
        i ? ctx.lineTo(px(u), py(0.78 - 0.5 * Math.pow(u, 1.3))) : ctx.moveTo(px(u), py(0.78 - 0.5 * Math.pow(u, 1.3)))
      }
      ctx.strokeStyle = '#9df1ff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    if (!compact) text(ctx, 'N 条历史记录', ax0 + 4, py(0.94), { size: 9.5, color: alpha(C.cyan, 0.9) })
  } else {
    // 融合：散点 + 被牵引的曲线 + 物理约束括号
    const shown = Math.round(easeOut(seg(p, 0, 0.5)) * DOTS.length)
    DOTS.slice(0, shown).forEach((d) => {
      ctx.beginPath()
      ctx.arc(px(d.x), py(d.y), 1.7, 0, Math.PI * 2)
      ctx.fillStyle = alpha(C.cyan, 0.55)
      ctx.fill()
    })
    const cP = easeOut(seg(p, 0.25, 1))
    // 曲线从"贴合散点"逐渐被拉向"物理形状"：cP=0 时完全跟数据，cP=1 时回到物理形状。
    // 不用随机抖动凑形貌——两边都是上面已经画出来的东西，插值而已。
    const dataAt = (u) => {
      const idx = Math.min(DOTS.length - 1, Math.max(0, Math.round(u * (DOTS.length - 1))))
      return DOTS[idx].y
    }
    ctx.beginPath()
    for (let i = 0; i <= 60; i++) {
      const u = (i / 60) * cP
      const base = 0.78 - 0.5 * Math.pow(u, 1.3)
      const v = lerp(dataAt(u), base, cP)
      i ? ctx.lineTo(px(u), py(v)) : ctx.moveTo(px(u), py(v))
    }
    ctx.strokeStyle = C.green
    ctx.lineWidth = 2
    ctx.stroke()
    if (cP > 0.2 && !compact) {
      text(ctx, '物理约束 ⊗ 数据', ax0 + 4, py(0.94), { size: 9.5, color: alpha(C.green, 0.9) })
    }
  }

  // ── 评分条（主观 1—5 档）+ 适用边界：窄屏空间不够，整段省略 ──
  if (compact) return
  let by = my + miniH + 14
  Object.entries(lane.bars).forEach(([k, v]) => {
    text(ctx, k, x + 4, by, { size: 10, color: C.t2 })
    const tx = x + 62
    const tw = w - 62 - 34
    fillRRect(ctx, tx, by - 3.5, tw, 7, 3.5, 'rgba(255,255,255,.06)')
    fillRRect(ctx, tx, by - 3.5, Math.max(2, tw * (v / 5) * p), 7, 3.5, alpha(lane.color, 0.85))
    text(ctx, v.toFixed(v % 1 ? 1 : 0), x + w - 2, by, { size: 10, color: alpha(lane.color, 0.95), align: 'right', mono: true })
    by += 15
  })
  by += 4
  text(ctx, lane.edge, x + 4, Math.min(by, y + h - 8), { size: 10, color: C.t3 })
}

function draw(ctx, { w, h, t }) {
  const PAD = 16
  const narrow = w < 620
  const top = 34
  const bottom = h - 34

  chip(ctx, '三条路线 · 同一道题', PAD, 4, { color: C.blue, size: 10.5 })
  if (!narrow) {
    text(ctx, '三种方法处理同一批历史数据时，各自在做什么', w - PAD, 15, { size: 11, color: C.t2, align: 'right' })
  }

  if (narrow) {
    const gap = 10
    const lh = (bottom - top - gap * 2) / 3
    LANES.forEach((lane, i) => drawLane(ctx, PAD, top + i * (lh + gap), w - PAD * 2, lh, lane, t, true))
  } else {
    const gap = 14
    const lw = (w - PAD * 2 - gap * 2) / 3
    LANES.forEach((lane, i) => drawLane(ctx, PAD + i * (lw + gap), top, lw, bottom - top, lane, t, false))
  }

  text(
    ctx,
    narrow
      ? '三者不是谁取代谁 —— 按数据量、算力与可解释性择一'
      : '三者不是谁取代谁 —— 数据量、算力、对可解释性的要求，共同决定该选哪一条',
    PAD,
    h - 12,
    { size: 10.5, color: alpha(C.green, 0.92) }
  )
}

export default {
  title: '物理模型、数据驱动、融合方法：三条路各自在做什么',
  seconds: '约 13 秒 · 单遍',
  duration: 13000,
  aria: '三种电池寿命预测方法对照动画：物理模型从方程出发得到平滑曲线，数据驱动从历史散点拟合出趋势，融合方法在物理约束与数据之间折中',
  legend: [
    { color: C.violet, label: '物理模型' },
    { color: C.cyan, label: '数据驱动' },
    { color: C.green, label: '融合方法' }
  ],
  basis:
    '三条路线的输入 / 输出形态依各自的建模方式绘制（方程驱动得到解析型平滑曲线；数据驱动从历史样本拟合趋势；融合方法在物理约束与数据间折中），与页面第 06 章的三条路线说明同源。',
  disclaimer:
    '示意动画。评分条为编者依公开综述给出的**主观 1—5 档定性评分**，与第 02 章化学体系雷达图同一口径，不是量化测量或实验结论；曲线与散点为形貌示意，不代表任何实测数据。',
  draw
}
