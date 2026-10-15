/**
 * 微动画 · 锂离子在充放电中的双路径迁移
 * 填补视频位 `ch03-ion-path`
 * ---------------------------------------------------------------
 * 为什么值得做成动画（而不是等实拍）：这条内容最容易被讲错——
 * 中文网上大量"锂电池原理"图把电子画进电解液、甚至画成穿过隔膜。
 * 本动画把**两条路径同框**并强制标注"离子走内部、电子走外部"，
 * 用可控、准确的示意去替代来路不明且含错的现成视频。
 *
 * 画面语言（对齐同步辐射剖面影像与电芯剖面动画的观感）：
 *   · 电极不是色块，而是**颗粒堆积床**——正极画成球形二次颗粒（NMC 的
 *     典型形貌），负极画成**石墨片晶**（层状结构，画成球会误导）。
 *   · 锂离子是**带辉光与拖尾的光点**，穿行时在颗粒缝隙间留下余晖。
 *   · 充电时负极颗粒被逐步"点亮"、正极逐步变暗——把"锂到底去哪了"
 *     直接画在颗粒明暗上，而不只是靠箭头。
 *
 * ⚠️ 颗粒粒径分布、堆积方式是**程序生成的示意结构**，
 *   不代表真实电极的粒径与孔隙率；粒子数量与迁移速率亦为示意。
 */

import { C, alpha, ball, chip, clipRRect, drawFlakeBed, easeInOut, fillRRect, flakeBed, glowDot, grainBed, lerp, polyPoint, polyline, rng, seg, strokeRRect, text } from '../stage.js'

const frac = (x) => x - Math.floor(x)
const TAU = Math.PI * 2

// 粒子摆位用确定性伪随机（纯装饰，不参与任何数值）
const r1 = rng(20261015)
const IONS = Array.from({ length: 14 }, (_, i) => ({
  base: i / 14 + (r1() - 0.5) * 0.04,
  y: 0.1 + r1() * 0.8,
  r: 1.9 + r1() * 0.8,
  sp: 0.9 + r1() * 0.5
}))
const r2 = rng(771)
const ELECTRONS = Array.from({ length: 9 }, (_, i) => ({ base: i / 9, r: 1.8 + r2() * 0.7 }))
// 电解液里的溶剂分子（静态装饰点阵，暗示"离子不是走在真空里"）
const r3 = rng(31337)
const SOLVENT = Array.from({ length: 46 }, () => ({ x: r3(), y: r3(), r: 0.7 + r3() * 0.7, a: 0.12 + r3() * 0.16 }))

/** 在一条水平线上等距画箭头，统一指向 dir。 */
function tickArrows(ctx, x1, x2, y, color, dir, n = 3, size = 5) {
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const p = x1 + ((i + 0.5) / n) * (x2 - x1)
    ctx.beginPath()
    ctx.moveTo(p + dir * size, y)
    ctx.lineTo(p - dir * size * 0.7, y - size * 0.72)
    ctx.lineTo(p - dir * size * 0.7, y + size * 0.72)
    ctx.closePath()
    ctx.fill()
  }
}

/** 居中画一行"由多段不同颜色拼成"的文字。 */
function mixedLine(ctx, parts, cx, y, size = 12) {
  const widths = parts.map((p) => {
    ctx.font = `${p.weight || 400} ${size}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
    return ctx.measureText(p.s).width
  })
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2
  parts.forEach((p, i) => {
    text(ctx, p.s, x, y, { size, color: p.c, weight: p.weight || 400, align: 'left' })
    x += widths[i]
  })
}

function draw(ctx, { w, h, t }) {
  const padX = 16
  const X0 = padX
  const bw = w - padX * 2
  const narrow = w < 620

  const wireY = 54
  const bodyTop = Math.min(126, Math.max(wireY + 50, h * 0.47))
  const bodyBottom = h - 56
  const bodyH = Math.max(40, bodyBottom - bodyTop)

  const col = (a, b) => [X0 + bw * a, X0 + bw * b]
  const POS = col(0.015, 0.285)
  const E1 = col(0.285, 0.465)
  const SEP = col(0.465, 0.535)
  const E2 = col(0.535, 0.715)
  const NEG = col(0.715, 0.985)
  const cen = (a) => (a[0] + a[1]) / 2
  const posCx = cen(POS)
  const negCx = cen(NEG)
  const sepCx = (SEP[0] + SEP[1]) / 2
  const bodyCy = bodyTop + bodyH / 2

  const inTop = bodyTop + 5
  const inBot = bodyBottom - 5
  const inH = inBot - inTop

  // ── 充 / 放 阶段：前半程充电、后半程放电 ──
  const HALF = 0.5
  const charging = t < HALF
  const f = charging ? easeInOut(seg(t, 0, HALF)) : 1 - easeInOut(seg(t, HALF, 1))
  const dir = charging ? 1 : -1

  // ── 顶部状态条 ──
  const wLabel = chip(ctx, charging ? '充电中' : '放电中', X0, 10, {
    color: charging ? C.green : C.blue,
    size: 11.5
  })
  text(ctx, charging ? 'Li⁺ 从正极脱出 → 嵌入负极' : 'Li⁺ 从负极脱出 → 回到正极', X0 + wLabel + 10, 21, {
    size: 11.5,
    color: C.t2
  })

  // ── 电芯本体 ──
  fillRRect(ctx, X0, bodyTop, bw, bodyH, 12, 'rgba(8,13,24,.78)')
  strokeRRect(ctx, X0, bodyTop, bw, bodyH, 12, C.line)

  // 电解液整体底色（跨正极—隔膜—负极之间的两段）
  fillRRect(ctx, E1[0], inTop, E2[1] - E1[0], inH, 6, alpha(C.cyan, 0.045))

  // ── 电极：颗粒堆积床 ──
  const cellSize = narrow ? 15 : 22
  // 充电时负极嵌锂（逐步点亮），正极脱锂（逐步变暗）
  const negLit = lerp(0.22, 1, f)
  const posLit = lerp(1, 0.3, f)

  const posBed = grainBed(POS[0] + 3, inTop + 4, POS[1] - POS[0] - 6, inH - 8, {
    seed: 11,
    cell: cellSize,
    jitter: 0.3,
    rK: 0.44
  })
  const negBed = flakeBed(NEG[0] + 3, inTop + 4, NEG[1] - NEG[0] - 6, inH - 8, {
    seed: 23,
    cell: cellSize,
    jitter: 0.34
  })

  ctx.save()
  clipRRect(ctx, POS[0], inTop, POS[1] - POS[0], inH, 8)
  fillRRect(ctx, POS[0], inTop, POS[1] - POS[0], inH, 8, alpha(C.violet, 0.07))
  for (const g of posBed) ball(ctx, g.px, g.py, g.rr, C.violet, (g.tone * 0.5 + 0.5) * posLit)
  ctx.restore()
  strokeRRect(ctx, POS[0], inTop, POS[1] - POS[0], inH, 8, alpha(C.violet, 0.45))

  ctx.save()
  clipRRect(ctx, NEG[0], inTop, NEG[1] - NEG[0], inH, 8)
  fillRRect(ctx, NEG[0], inTop, NEG[1] - NEG[0], inH, 8, alpha(C.blue, 0.07))
  drawFlakeBed(
    ctx,
    negBed.map((g) => ({ ...g, tone: (g.tone * 0.5 + 0.5) * negLit })),
    C.blue,
    { dark: 0 }
  )
  ctx.restore()
  strokeRRect(ctx, NEG[0], inTop, NEG[1] - NEG[0], inH, 8, alpha(C.blue, 0.45))

  // ── 电解液里的溶剂分子（静态装饰） ──
  for (const s of SOLVENT) {
    const inE1 = s.x < 0.5
    const bx = inE1 ? E1[0] : E2[0]
    const bxe = inE1 ? E1[1] : E2[1]
    const x = bx + (inE1 ? s.x * 2 : (s.x - 0.5) * 2) * (bxe - bx)
    ctx.beginPath()
    ctx.arc(x, inTop + s.y * inH, s.r, 0, TAU)
    ctx.fillStyle = alpha(C.cyan, s.a)
    ctx.fill()
  }

  // ── 隔膜：斜条纹的窄带 ──
  const sepW = SEP[1] - SEP[0]
  ctx.save()
  clipRRect(ctx, SEP[0], inTop, sepW, inH, 3)
  ctx.fillStyle = alpha(C.cyan, 0.1)
  ctx.fillRect(SEP[0], inTop, sepW, inH)
  ctx.strokeStyle = alpha(C.cyan, 0.34)
  ctx.lineWidth = 1
  for (let x = SEP[0] - inH; x < SEP[1] + inH; x += 6) {
    ctx.beginPath()
    ctx.moveTo(x, inBot)
    ctx.lineTo(x + inH, inTop)
    ctx.stroke()
  }
  ctx.restore()
  strokeRRect(ctx, SEP[0], inTop, sepW, inH, 3, alpha(C.cyan, 0.55))

  // ── 外电路 ──
  const wire = [
    [posCx, bodyTop],
    [posCx, wireY],
    [negCx, wireY],
    [negCx, bodyTop]
  ]
  polyline(ctx, wire, alpha(C.amber, 0.42), 1.6)

  const bulbX = (posCx + negCx) / 2
  // 负载运行时外圈有微光（放电时更亮）
  const loadGlow = charging ? 0.3 : 0.75
  const lg = ctx.createRadialGradient(bulbX, wireY, 2, bulbX, wireY, 34)
  lg.addColorStop(0, alpha(C.amber, 0.3 * loadGlow))
  lg.addColorStop(1, alpha(C.amber, 0))
  ctx.beginPath()
  ctx.arc(bulbX, wireY, 34, 0, TAU)
  ctx.fillStyle = lg
  ctx.fill()
  ctx.beginPath()
  ctx.arc(bulbX, wireY, 11, 0, TAU)
  ctx.fillStyle = '#0a0f1c'
  ctx.fill()
  ctx.strokeStyle = alpha(C.amber, 0.75)
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(bulbX - 5, wireY + 4)
  ctx.lineTo(bulbX, wireY - 5)
  ctx.lineTo(bulbX + 5, wireY + 4)
  ctx.stroke()
  text(ctx, '外电路 · 负载', bulbX, wireY - 26, { size: 10.5, color: alpha(C.amber, 0.9), align: 'center' })

  const wireGapL = posCx + 26
  const wireGapR = negCx - 26
  if (wireGapR - wireGapL > 120) {
    tickArrows(ctx, wireGapL, bulbX - 18, wireY, alpha(C.amber, 0.7), dir)
    tickArrows(ctx, bulbX + 18, wireGapR, wireY, alpha(C.amber, 0.7), dir)
  }

  // ── 内部 Li⁺ 流：带辉光与拖尾 ──
  const yTop = inTop + 12
  const yBot = inBot - 12

  // 电子：沿外电路，带解析拖尾
  ELECTRONS.forEach((e) => {
    const u = frac(f * 1.05 + e.base)
    const [x, y] = polyPoint(wire, u)
    if (y >= bodyTop - 1) return
    const tail = []
    for (let k = 1; k <= 3; k++) {
      const uu = u - 0.012 * k
      if (uu < 0) break
      tail.push(polyPoint(wire, uu))
    }
    glowDot(ctx, x, y, e.r, C.amber, { glow: 0.9, trail: tail })
  })

  // 离子：从正极穿电解液与隔膜到负极
  IONS.forEach((p) => {
    const u = frac(f * p.sp + p.base)
    const x = lerp(posCx, negCx, u)
    const y = lerp(yTop, yBot, p.y)
    const tail = []
    for (let k = 1; k <= 3; k++) {
      const uu = u - 0.02 * k
      if (uu < 0) break
      const xk = lerp(posCx, negCx, uu)
      tail.push([xk, y + (k % 2 ? 1 : -1) * 1.6 * k])
    }
    const nearSep = Math.abs(x - sepCx) < 13
    glowDot(ctx, x, y, nearSep ? p.r * 1.2 : p.r, nearSep ? '#7df3ff' : C.cyan, {
      glow: nearSep ? 1.5 : 0.7,
      trail: tail
    })
  })

  // ── 组件标签 ──
  const labY = bodyTop - 14
  text(ctx, '正极', posCx, labY, { size: 11.5, color: C.violet, align: 'center', weight: 600 })
  text(ctx, '负极', negCx, labY, { size: 11.5, color: C.blue, align: 'center', weight: 600 })
  if (!narrow) {
    text(ctx, '电解液', cen(E1), labY, { size: 10.5, color: alpha(C.cyan, 0.85), align: 'center' })
    text(ctx, '电解液', cen(E2), labY, { size: 10.5, color: alpha(C.cyan, 0.85), align: 'center' })
  }
  ctx.save()
  ctx.translate(sepCx, bodyCy)
  ctx.rotate(-Math.PI / 2)
  text(ctx, '隔 膜', 0, 0, { size: 10, color: alpha(C.cyan, 0.95), align: 'center', weight: 600 })
  ctx.restore()

  // ── 底部结论：本项目最想纠正的一处误解 ──
  // 窄屏（画布仅约 320px 宽）放不下整句，另给一套等义短句，避免被裁。
  if (w < 520) {
    mixedLine(
      ctx,
      [
        { s: '离子走内部', c: C.cyan },
        { s: '　·　', c: C.t3 },
        { s: '电子走外部', c: C.amber }
      ],
      w / 2,
      bodyBottom + 20,
      12
    )
    text(ctx, '电子不穿过隔膜，也不在电解液里游动', w / 2, bodyBottom + 40, {
      size: 11,
      color: alpha(C.amber, 0.95),
      align: 'center'
    })
  } else {
    mixedLine(
      ctx,
      [
        { s: '离子走内部', c: C.cyan },
        { s: '（电解液 + 隔膜）　·　', c: C.t3 },
        { s: '电子走外部', c: C.amber },
        { s: '（外电路）', c: C.t3 }
      ],
      w / 2,
      bodyBottom + 18,
      12
    )
    text(ctx, '电解液与隔膜是电子绝缘体 —— 电子不穿过隔膜，也不在电解液里游动', w / 2, bodyBottom + 38, {
      size: 11,
      color: alpha(C.amber, 0.95),
      align: 'center'
    })
  }
}

export default {
  title: '锂离子迁移的双路径：离子走内部，电子走外部',
  seconds: '约 12 秒 · 充放各一遍',
  duration: 12000,
  aria: '锂离子电池充放电剖面示意：锂离子经电解液与隔膜在正负极之间迁移，电子沿外电路流动',
  legend: [
    { color: C.cyan, label: 'Li⁺（走电解液与隔膜）' },
    { color: C.amber, label: 'e⁻（走外电路）' },
    { color: C.violet, label: '正极（球形二次颗粒）' },
    { color: C.blue, label: '负极（石墨片晶）' }
  ],
  basis:
    '依电化学基本原理绘制：充放电时 Li⁺ 在正负极之间往返迁移、穿透隔膜；电子只能经外电路流动（电解液与隔膜为电子绝缘体）。电极形貌参照商用锂电的典型结构 —— 正极为球形二次颗粒、负极为石墨片层。',
  disclaimer:
    '机理示意，非显微观测影像。颗粒粒径分布与堆积方式为程序生成的示意结构，不代表真实电极的粒径与孔隙率；粒子数量与迁移速率亦为示意，不代表真实通量与浓度分布。',
  draw
}
