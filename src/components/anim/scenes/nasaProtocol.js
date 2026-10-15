/**
 * 微动画 · 这些曲线是怎么测出来的：认识 NASA 电池数据集
 * 填补视频位 `ch05-nasa`
 * ---------------------------------------------------------------
 * 这条讲的是"数据可信度"，网上找不到参数对得上的现成视频，只能自己做。
 * 上半段把一个测试循环的五步走一遍（参数全是数据集原始口径），
 * 下半段把 **B0005 的真实逐循环放电容量** 直接画出来 —— 用的是仓库里的 JSON，
 * 不是拟合曲线。
 *
 * ⚠️ 两条参考线口径不同，必须分别标注（这是本页最容易讲糊的一处）：
 *   · 首循环容量 1.856 Ah  → 本作品的 SOH 基准（SOH(n) = Q(n) / qRef）
 *   · 1.4 Ah（额定 2.0 Ah 的 70%）→ 数据集自身的停测参考
 *   两者来源不同，页面上分开画。
 */

import { C, alpha, chip, easeOut, fillRRect, lerp, measure, seg, strokeRRect, text } from '../stage.js'
import B0005 from '../../../data/nasa/B0005.json'

const CELLS = [
  { id: 'B0005', cutoff: '2.7 V' },
  { id: 'B0006', cutoff: '2.5 V' },
  { id: 'B0007', cutoff: '2.2 V' },
  { id: 'B0018', cutoff: '2.5 V' }
]

const STEPS = [
  { t: '恒流充电', p: '1.5 A → 4.2 V', s: '恒流充', c: C.green },
  { t: '恒压充电', p: '4.2 V → 20 mA', s: '恒压充', c: C.cyan },
  { t: '静置', p: '恢复到稳态', s: '静置', c: C.t3 },
  { t: '恒流放电', p: '2.0 A → 截止', s: '放电', c: C.amber },
  { t: '记录容量', p: '本次放电容量', s: '记录', c: C.blue }
]

const CYCLES = B0005.cycles
const Q_REF = CYCLES[0].capacity // 1.856 Ah，本作品的 SOH 基准
const EOL_TEACH = Q_REF * 0.8 // 教学参考线
const Y_MIN = 1.2
const Y_MAX = 2.0

function draw(ctx, { w, h, t }) {
  const PAD = 16
  const narrow = w < 560

  // ── 上半：一个测试循环的时序 ──
  const tTop = 36
  const tH = Math.min(46, Math.max(34, h * 0.16))
  const bw = (w - PAD * 2) / 5
  const stepProg = seg(t, 0.02, 0.34)
  const activeIdx = Math.min(4, Math.floor(stepProg * 5))
  const afterCycle = t > 0.34

  text(ctx, '① 一个测试循环的五步（NASA PCoE 原始口径）', PAD, tTop - 16, { size: 11, color: C.t2 })

  STEPS.forEach((s, i) => {
    const x = PAD + i * bw
    const on = afterCycle || i <= activeIdx
    const cur = !afterCycle && i === activeIdx
    const bg = on ? alpha(s.c, cur ? 0.2 : 0.09) : 'rgba(255,255,255,.025)'
    fillRRect(ctx, x + 3, tTop, bw - 8, tH, 8, bg)
    strokeRRect(ctx, x + 3, tTop, bw - 8, tH, 8, cur ? alpha(s.c, 0.85) : on ? alpha(s.c, 0.32) : C.line, cur ? 1.6 : 1)
    text(ctx, narrow ? s.s : s.t, x + bw / 2 - 1, tTop + tH * 0.36, {
      size: narrow ? 10.5 : 11.5,
      color: on ? s.c : C.t3,
      align: 'center',
      weight: cur ? 600 : 400
    })
    if (!narrow) {
      text(ctx, s.p, x + bw / 2 - 1, tTop + tH * 0.72, { size: 10, color: on ? C.t2 : C.t3, align: 'center', mono: true })
    }
  })
  if (afterCycle) {
    text(ctx, `同一制度重复 × ${CYCLES.length} 循环，逐循环记录`, w - PAD, tTop + tH + 12, {
      size: 10.5,
      color: alpha(C.blue, 0.95),
      align: 'right'
    })
  } else {
    text(ctx, '同一制度重复执行，逐循环记录放电容量', PAD + w - PAD * 2, tTop + tH + 12, {
      size: 10.5,
      color: C.t3,
      align: 'right'
    })
  }

  // ── 下半：真实容量曲线 ──
  const L = narrow ? 46 : 56
  const R = 16
  const plotTop = tTop + tH + 30
  const plotBottom = h - 44
  const pw = w - L - R
  const ph = Math.max(40, plotBottom - plotTop)
  const xAt = (c) => L + ((c - 1) / (CYCLES.length - 1)) * pw
  const yAt = (q) => plotTop + (1 - (q - Y_MIN) / (Y_MAX - Y_MIN)) * ph

  // 网格
  ctx.strokeStyle = alpha(C.blue, 0.09)
  ctx.lineWidth = 1
  for (const q of [1.2, 1.4, 1.6, 1.8, 2.0]) {
    ctx.beginPath()
    ctx.moveTo(L, yAt(q))
    ctx.lineTo(L + pw, yAt(q))
    ctx.stroke()
    text(ctx, q.toFixed(1), L - 8, yAt(q), { size: 9.5, color: C.t3, align: 'right', mono: true })
  }
  text(ctx, '放电容量 Ah', L - 8, plotTop - 13, { size: 10, color: C.t2, align: 'right' })
  for (const c of [1, 50, 100, 150]) {
    if (c > CYCLES.length) continue
    text(ctx, String(c), xAt(c), plotBottom + 14, { size: 9.5, color: C.t3, align: 'center', mono: true })
  }
  text(ctx, '循环次数 →', L + pw, plotBottom + 14, { size: 10, color: C.t3, align: 'right' })

  // 参考线：首循环容量（SOH 基准）
  ctx.setLineDash([2, 4])
  ctx.strokeStyle = alpha(C.cyan, 0.6)
  ctx.beginPath()
  ctx.moveTo(L, yAt(Q_REF))
  ctx.lineTo(L + pw, yAt(Q_REF))
  ctx.stroke()
  text(ctx, `首循环 ${Q_REF.toFixed(2)} Ah（SOH 基准 qRef）`, L + pw - 2, yAt(Q_REF) - 9, {
    size: 9.5,
    color: alpha(C.cyan, 0.95),
    align: 'right'
  })

  // 参考线：教学用 SOH 80%
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = alpha(C.green, 0.75)
  ctx.beginPath()
  ctx.moveTo(L, yAt(EOL_TEACH))
  ctx.lineTo(L + pw, yAt(EOL_TEACH))
  ctx.stroke()
  text(ctx, `SOH 80% ≈ ${EOL_TEACH.toFixed(2)} Ah（本作品教学参考线）`, L + pw - 2, yAt(EOL_TEACH) + 12, {
    size: 9.5,
    color: alpha(C.green, 0.95),
    align: 'right'
  })

  // 参考线：数据集自身停测参考 1.4 Ah
  ctx.setLineDash([1, 3])
  ctx.strokeStyle = alpha(C.amber, 0.6)
  ctx.beginPath()
  ctx.moveTo(L, yAt(1.4))
  ctx.lineTo(L + pw, yAt(1.4))
  ctx.stroke()
  ctx.setLineDash([])
  if (!narrow) {
    text(ctx, '数据集停测参考 1.4 Ah（额定 2.0 Ah 的 70%）', L + 4, yAt(1.4) - 9, {
      size: 9.5,
      color: alpha(C.amber, 0.9)
    })
  }

  // 真实数据曲线（逐点直取 JSON，未做拟合、未做平滑）
  const drawProg = easeOut(seg(t, 0.34, 0.94))
  const upto = Math.max(1, Math.round(drawProg * (CYCLES.length - 1)))

  const pathOf = (end) => {
    ctx.beginPath()
    for (let i = 0; i <= end; i++) {
      const p = CYCLES[i]
      i ? ctx.lineTo(xAt(p.cycle), yAt(p.capacity)) : ctx.moveTo(xAt(p.cycle), yAt(p.capacity))
    }
  }
  pathOf(CYCLES.length - 1)
  ctx.strokeStyle = alpha(C.blue, 0.2)
  ctx.lineWidth = 1.3
  ctx.stroke()
  pathOf(upto)
  ctx.strokeStyle = C.blue
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.stroke()

  // 扫描点 + 读数
  const nowP = CYCLES[upto]
  const nx = xAt(nowP.cycle)
  const ny = yAt(nowP.capacity)
  ctx.beginPath()
  ctx.arc(nx, ny, 3.4, 0, Math.PI * 2)
  ctx.fillStyle = '#bcdcff'
  ctx.fill()
  const readTxt = `第 ${nowP.cycle} 次 · ${nowP.capacity.toFixed(3)} Ah · SOH ${(nowP.soh * 100).toFixed(1)}%`
  if (narrow) {
    // 窄屏读数跟着扫描点会顶出右边界，改成左对齐并夹在画布内；
    // 纵向也压低到绘图区内，避免与"放电容量 Ah"纵轴标叠字。
    const tw = measure(ctx, readTxt, 10, 400, true)
    text(ctx, readTxt, Math.min(Math.max(nx, PAD), w - PAD - tw), Math.max(plotTop + 12, ny - 14), {
      size: 10,
      color: C.t1,
      mono: true
    })
  } else {
    text(ctx, readTxt, nx, ny - 14, { size: 10, color: C.t1, align: 'center', mono: true })
  }

  // ── 底部：四颗电芯 + 结论 ──
  let cx = PAD
  CELLS.forEach((cell) => {
    const on = cell.id === 'B0005'
    // 窄屏只留编号，四个胶囊才排得下（带截止电压会溢出）
    const wCell = chip(ctx, narrow ? cell.id : `${cell.id} · ${cell.cutoff}`, cx, h - 34, {
      color: on ? C.blue : C.t3,
      size: 10,
      bg: on ? alpha(C.blue, 0.14) : 'rgba(255,255,255,.03)'
    })
    cx += wCell + 6
  })
  if (!narrow) {
    text(ctx, '四颗 18650 · 额定 2.0 Ah · 24 ℃ 恒温 · 同充电制度、不同放电截止电压', PAD, h - 8, {
      size: 10,
      color: C.t3
    })
  }
}

export default {
  title: '这些曲线是怎么测出来的：认识 NASA 电池数据集',
  seconds: '约 14 秒 · 单遍',
  duration: 14000,
  aria: 'NASA 电池数据集测试流程动画：恒流恒压充电、静置、恒流放电、记录容量依次进行，随后绘制 B0005 逐循环放电容量实测曲线',
  legend: [
    { color: C.blue, label: 'B0005 实测放电容量（逐点直取）' },
    { color: C.cyan, label: '首循环容量 1.856 Ah（SOH 基准）' },
    { color: C.green, label: 'SOH 80% 教学参考线' },
    { color: C.amber, label: '数据集停测参考 1.4 Ah' }
  ],
  basis:
    '测试流程与参数取自 NASA PCoE Battery Data Set 的原始说明（18650 / 额定 2.0 Ah / 24 ℃ / 1.5 A 恒流充至 4.2 V 后恒压至 20 mA / 2.0 A 放电至各电芯截止电压）；下方曲线为 B0005 的 168 次逐循环放电容量实测记录，逐点直取数据文件，未做拟合或平滑。',
  disclaimer:
    '时序图五块的**宽度不代表实际时长**（未按真实时长等比绘制）。两条参考线口径不同：首循环容量 1.856 Ah 是本作品 SOH 的归一化基准（SOH = Q / qRef），而 1.4 Ah 是数据集自身以额定容量的 70% 给出的停测参考，二者不可混用。',
  draw
}
