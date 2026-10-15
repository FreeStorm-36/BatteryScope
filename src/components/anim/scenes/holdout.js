/**
 * 微动画 · 留出法回测：怎么知道预测靠不靠谱
 * 填补视频位 `ch07-holdout`
 * ---------------------------------------------------------------
 * 这条讲的完全是本团队自己的算法与结果，网上不存在对应内容，
 * 因此**只能自己做**；而它同时是"学生实质性贡献"最直接的证据。
 *
 * 与页面 EndingView 共用 `src/data/holdoutCase.js`：
 * 训练段 = B0005 前 80 次实测；留出段 = 其余记录，只用于比对。
 * 曲线、区间、交点、误差全部由页面同一套 baseline 现算，动画不自造数字。
 */

import { C, alpha, chip, easeOut, fillRRect, seg, strokeRRect, text } from '../stage.js'
import { getHoldout, seriesOf, TRAIN_N } from '../../../data/holdoutCase.js'

const Y_MIN = 66
const Y_MAX = 102
const X_MAX = 175

function draw(ctx, { w, h, t }) {
  const series = seriesOf()
  const r = getHoldout()
  const PAD = 16
  const narrowChart = w < 560

  const L = 48
  const R = 16
  // 窄屏顶部要放两行（阶段胶囊 + EOL 摘要），绘图区相应下压，
  // 否则"SOH"与"第 80 次 · 训练/留出分界"两个轴标会顶到摘要行上。
  const TOP = narrowChart ? 68 : 52
  const BOT = h - 40
  const pw = w - L - R
  const ph = Math.max(50, BOT - TOP)

  const xAt = (c) => L + (Math.min(c, X_MAX) / X_MAX) * pw
  const yAt = (soh) => TOP + (1 - (soh * 100 - Y_MIN) / (Y_MAX - Y_MIN)) * ph

  const fa = seg(t, 0.02, 0.24) // 训练段
  const fb = seg(t, 0.24, 0.36) // 拟合窗口
  const fc = seg(t, 0.36, 0.6) // 外推 + 区间
  const fd = seg(t, 0.6, 0.86) // 留出段揭晓
  const fe = seg(t, 0.86, 1) // 结论标注

  // ── 网格 ──
  ctx.strokeStyle = alpha(C.blue, 0.09)
  ctx.lineWidth = 1
  for (const s of [70, 80, 90, 100]) {
    ctx.beginPath()
    ctx.moveTo(L, yAt(s / 100))
    ctx.lineTo(L + pw, yAt(s / 100))
    ctx.stroke()
    text(ctx, `${s}%`, L - 7, yAt(s / 100), { size: 9.5, color: C.t3, align: 'right', mono: true })
  }
  // 窄屏末位刻度会与右端轴标题叠字，少画一个
  for (const c of narrowChart ? [0, 50, 100] : [0, 50, 100, 150]) {
    text(ctx, String(c), xAt(c), BOT + 14, { size: 9.5, color: C.t3, align: 'center', mono: true })
  }
  text(ctx, 'SOH', L - 7, TOP - 14, { size: 10, color: C.t2, align: 'right' })
  text(ctx, '循环次数 →', L + pw, BOT + 14, { size: 10, color: C.t3, align: 'right' })

  // ── 80% 教学参考线 ──
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = alpha(C.red, 0.7)
  ctx.beginPath()
  ctx.moveTo(L, yAt(0.8))
  ctx.lineTo(L + pw, yAt(0.8))
  ctx.stroke()
  ctx.setLineDash([])
  text(ctx, 'SOH 80% 教学参考线', L + 6, yAt(0.8) - 10, { size: 9.5, color: alpha(C.red, 0.95) })

  // ── 训练段 / 留出段 背景分区 ──
  fillRRect(ctx, xAt(0), TOP, xAt(TRAIN_N) - xAt(0), ph, 0, alpha(C.blue, 0.05))
  fillRRect(ctx, xAt(TRAIN_N), TOP, xAt(X_MAX) - xAt(TRAIN_N), ph, 0, alpha(C.green, 0.04))
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = alpha(C.t3, 0.6)
  ctx.beginPath()
  ctx.moveTo(xAt(TRAIN_N), TOP)
  ctx.lineTo(xAt(TRAIN_N), BOT)
  ctx.stroke()
  ctx.setLineDash([])
  text(ctx, `第 ${TRAIN_N} 次 · 训练 / 留出分界`, xAt(TRAIN_N), TOP - 14, { size: 9.5, color: C.t3, align: 'center' })

  // ── 训练段（真实实测） ──
  if (fa > 0) {
    const end = Math.max(1, Math.round(fa * (TRAIN_N - 1)))
    ctx.beginPath()
    for (let i = 0; i <= end; i++) {
      const p = series[i]
      i ? ctx.lineTo(xAt(p.cycle), yAt(p.soh)) : ctx.moveTo(xAt(p.cycle), yAt(p.soh))
    }
    ctx.strokeStyle = C.blue
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    if (fb > 0) {
      // 拟合窗口：最近 60 条
      ctx.beginPath()
      for (let i = TRAIN_N - 60; i < TRAIN_N; i++) {
        const p = series[i]
        i === TRAIN_N - 60 ? ctx.moveTo(xAt(p.cycle), yAt(p.soh)) : ctx.lineTo(xAt(p.cycle), yAt(p.soh))
      }
      ctx.strokeStyle = alpha('#bcdcff', fb)
      ctx.lineWidth = 3.4
      ctx.stroke()
    }
  }

  if (!r) {
    text(ctx, '正在用页面同一套基线计算…', L + pw / 2, TOP + ph / 2, { size: 11, color: C.t3, align: 'center' })
  } else {
    const fc2 = easeOut(fc)
    const nF = Math.max(2, Math.round(fc2 * r.sohForecast.length))

    // ── 预测区间 ──
    if (nF > 1) {
      ctx.beginPath()
      for (let i = 0; i < nF; i++) {
        const f = r.sohForecast[i]
        i ? ctx.lineTo(xAt(f.cycle), yAt(f.lower)) : ctx.moveTo(xAt(f.cycle), yAt(f.lower))
      }
      for (let i = nF - 1; i >= 0; i--) {
        const f = r.sohForecast[i]
        ctx.lineTo(xAt(f.cycle), yAt(f.upper))
      }
      ctx.closePath()
      ctx.fillStyle = alpha(C.cyan, 0.14)
      ctx.fill()

      // ── 预测曲线 ──
      ctx.beginPath()
      for (let i = 0; i < nF; i++) {
        const f = r.sohForecast[i]
        i ? ctx.lineTo(xAt(f.cycle), yAt(f.mean)) : ctx.moveTo(xAt(f.cycle), yAt(f.mean))
      }
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = C.cyan
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
    }

    // ── 留出段（模型没见过） ──
    if (fd > 0) {
      const end = TRAIN_N - 1 + Math.max(1, Math.round(fd * (series.length - TRAIN_N)))
      ctx.beginPath()
      for (let i = TRAIN_N - 1; i <= end && i < series.length; i++) {
        const p = series[i]
        i === TRAIN_N - 1 ? ctx.moveTo(xAt(p.cycle), yAt(p.soh)) : ctx.lineTo(xAt(p.cycle), yAt(p.soh))
      }
      ctx.strokeStyle = C.green
      ctx.lineWidth = 2.2
      ctx.stroke()
    }

    // ── 结论标注 ──
    if (fe > 0) {
      const a = fe
      // 预测交点 / 实测交点：两者只差 4 次循环，横坐标几乎重合，
      // 所以标签必须**纵向错开**，否则"预测 97"与"实测 101"会叠在一起。
      marker(ctx, xAt(r.eolCycle), yAt(0.8), C.amber, `预测 ${r.eolCycle}`, a, 34)
      if (r.actualEol != null) marker(ctx, xAt(r.actualEol), yAt(0.8), C.green, `实测 ${r.actualEol}`, a, 50)
      // 误差连线
      if (r.actualEol != null) {
        ctx.strokeStyle = alpha(C.amber, 0.6 * a)
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(xAt(r.eolCycle), yAt(0.8) + 6)
        ctx.lineTo(xAt(r.actualEol), yAt(0.8) + 6)
        ctx.stroke()
        text(ctx, `|Δ| = ${r.absError} 次`, (xAt(r.eolCycle) + xAt(r.actualEol)) / 2, yAt(0.8) + 18, {
          size: 10,
          color: alpha(C.amber, 0.95),
          align: 'center',
          mono: true
        })
      }
      // 预测区间括线
      if (r.eolInterval) {
        const [lo, hi] = r.eolInterval
        const yy = yAt(0.8) - 26
        ctx.strokeStyle = alpha(C.cyan, 0.8 * a)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(xAt(lo), yy + 5)
        ctx.lineTo(xAt(lo), yy)
        ctx.lineTo(xAt(hi), yy)
        ctx.lineTo(xAt(hi), yy + 5)
        ctx.stroke()
        text(ctx, `预测区间 ${lo}—${hi} 次`, (xAt(lo) + xAt(hi)) / 2, yy - 9, {
          size: 10,
          color: alpha(C.cyan, 0.95),
          align: 'center',
          mono: true
        })
      }
    }
  }

  // ── 顶部阶段提示与读数 ──
  const steps = [
    { a: 0.02, label: `① 只把前 ${TRAIN_N} 次交给模型`, c: C.blue },
    { a: 0.24, label: '② 用最近 60 条估稳健退化率', c: '#bcdcff' },
    { a: 0.36, label: '③ 外推 SOH 并让区间随距离展宽', c: C.cyan },
    { a: 0.6, label: '④ 揭开留出段，与预测比对', c: C.green },
    { a: 0.86, label: '⑤ 得出 EOL 与误差', c: C.amber }
  ]
  let idx = 0
  steps.forEach((s, i) => {
    if (t >= s.a) idx = i
  })
  const cur = steps[idx]
  const cw = chip(ctx, cur.label, PAD, 4, { color: cur.c, size: 10.5 })

  if (r && fe > 0) {
    const txt = `EOL ${r.eolCycle} · RUL ${r.rul} · 实测 ${r.actualEol} · 误差 ${r.absError}`
    let cx = PAD + cw + 10
    if (w > 640) {
      chip(ctx, txt, cx, 4, { color: C.amber, size: 10.5 })
    } else {
      text(ctx, txt, PAD, 30, { size: 10.5, color: alpha(C.amber, 0.95), mono: true })
    }
  }

  text(
    ctx,
    w < 560
      ? '留出段从未参与拟合 —— 真会外推，还是只背了答案'
      : '留出段的实测记录从未参与拟合 —— 只有这样，才能看出模型是真的会外推，还是只背下了答案',
    PAD,
    h - 10,
    { size: 10.5, color: C.t2 }
  )
}

function marker(ctx, x, y, color, label, a, dy = 20) {
  ctx.beginPath()
  ctx.arc(x, y, 9, 0, Math.PI * 2)
  ctx.strokeStyle = alpha(color, 0.9 * a)
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, Math.PI * 2)
  ctx.fillStyle = alpha(color, a)
  ctx.fill()
  text(ctx, label, x, y + dy, { size: 10, color: alpha(color, a), align: 'center', mono: true })
}

export default {
  title: '留出法回测：怎么知道预测靠不靠谱',
  seconds: '约 15 秒 · 单遍',
  duration: 15000,
  aria: '留出法回测动画：前 80 次实测用于拟合，橙色虚线外推未来 SOH 并给出展宽区间，绿色实线为未参与拟合的留出数据，两者与 80% 参考线的交点相差 4 次循环',
  legend: [
    { color: C.blue, label: '训练段实测（前 80 次，参与拟合）' },
    { color: C.green, label: '留出段实测（未参与拟合）' },
    { color: C.cyan, label: '基线预测外推 + 残差区间' },
    { color: C.amber, label: '预测交点 / 误差' }
  ],
  basis:
    '与第 07 章结果面板同源：调用同一套可解释基线（Theil–Sen 中位斜率 + 单调指数外推 + 残差区间），输入为 NASA PCoE B0005 前 80 次真实放电记录，输出 EOL 97 / RUL 17 / 实测 101 / 误差 4 / 区间 89—106 次。',
  disclaimer:
    '预测区间由历史拟合残差传播得到，只表达这条基线自身的离散程度，不等同于 PINN 置信区间，也不构成概率保证。模型是"稳健指数退化基线"，尚未替换为训练完成的 PINN。',
  draw
}
