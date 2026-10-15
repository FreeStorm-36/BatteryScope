/**
 * 微动画 · CC-CV 充电：为什么最后要转恒压
 * 填补视频位 `ch03-cccv`
 * ---------------------------------------------------------------
 * 这条原本的建议是"页面录屏 + 口播"。但页面上没有"充电过程随时间推进"
 * 的可视化（原理页只给了倍率读数），所以这里补一条真正的时序动画：
 * 电压曲线 + 电流曲线 + SOC 液位三者同步推进，扫描线走到哪就读到哪。
 *
 * ⚠️ 曲线是 CC-CV **标准协议的形状示意**，不是某一颗电芯的实测记录。
 *   电流取值按本作品 BS-01 概念设定（1C = 5.0 A，0.05C 终止 = 250 mA），
 *   这两个数在页面上有出处；曲线本身不代表实测。页面常驻口径已声明这一点。
 */

import { C, alpha, chip, clamp, fillRRect, seg, strokeRRect, text, easeInOut, measure } from '../stage.js'

const CC_END = 0.62 // 归一化充电时间轴上，恒流转恒压的位置
const V_CUT = 4.2 // 充电截止电压（V）
const V0 = 3.3 // 起始电压（V）
const I_CC = 5.0 // 恒流段电流 = 1C（A），对应 BS-01 的 5 Ah
const I_END = 0.25 // 恒压段终止电流 = 0.05C（A）

const dec = (x, n = 2) => x.toFixed(n)

/** 电压：CC 段按幂函数爬升到截止电压，CV 段保持。 */
function voltageAt(u) {
  if (u <= CC_END) return V0 + (V_CUT - V0) * Math.pow(u / CC_END, 0.72)
  return V_CUT
}
/** 电流：CC 段恒定，CV 段指数衰减到终止电流。 */
function currentAt(u) {
  if (u <= CC_END) return I_CC
  return I_CC * Math.exp(-3 * ((u - CC_END) / (1 - CC_END)))
}
/** SOC：示意用的单调上升（CC 段充到约 80%，CV 段补到接近满）。 */
function socAt(u) {
  if (u <= CC_END) return 0.06 + 0.74 * Math.pow(u / CC_END, 0.9)
  return 0.8 + 0.18 * (1 - Math.exp(-3.2 * ((u - CC_END) / (1 - CC_END))))
}

function draw(ctx, { w, h, t }) {
  const narrow = w < 520
  const BATT = narrow ? 0 : 56
  const L = narrow ? 44 : 54
  const R = 14
  const T = 38
  const B = 36
  const plotW = w - L - R - BATT
  const plotH = h - T - B
  const vH = plotH * 0.56
  const gap = plotH * 0.06
  const iTop = T + vH + gap
  const iH = plotH - vH - gap

  const u = easeInOut(seg(t, 0.06, 0.94)) // 扫描进度
  const inCC = u <= CC_END

  const xAt = (v) => L + v * plotW
  const vY = (v) => T + (1 - (v - 3.0) / 1.45) * vH
  const iY = (a) => iTop + (1 - clamp(a, 0, 5.4) / 5.4) * iH

  // ── 顶部：阶段 + 读数 ──
  // 胶囊从绘图区左边界起画，避免压住左侧「电压 V」纵轴标（此前起点为 L-40，会叠字）。
  const chipX = L + 4
  const chipW = chip(ctx, inCC ? '恒流 CC 段' : '恒压 CV 段', chipX, 8, {
    color: inCC ? C.cyan : C.green,
    size: 11.5
  })
  const readout = `U ${dec(voltageAt(u))} V　I ${dec(currentAt(u))} A　SOC ${Math.round(socAt(u) * 100)}%`
  // 窄屏绘图区窄，读数缩小一号，否则会顶出画布右边界。
  text(ctx, readout, chipX + chipW + 12, 19, { size: narrow ? 10 : 11.5, color: C.t1, mono: true })

  // ── 网格 ──
  for (const v of [3.0, 3.5, 4.0]) {
    ctx.strokeStyle = alpha(C.blue, 0.14)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(L, vY(v))
    ctx.lineTo(L + plotW, vY(v))
    ctx.stroke()
    text(ctx, `${v.toFixed(1)}`, L - 8, vY(v), { size: 10, color: C.t3, align: 'right', mono: true })
  }
  for (const a of [0, 2.5, 5.0]) {
    ctx.strokeStyle = alpha(C.blue, 0.14)
    ctx.beginPath()
    ctx.moveTo(L, iY(a))
    ctx.lineTo(L + plotW, iY(a))
    ctx.stroke()
    text(ctx, a.toFixed(1), L - 8, iY(a), { size: 10, color: C.t3, align: 'right', mono: true })
  }
  text(ctx, '电压 V', L - 8, T - 12, { size: 10.5, color: C.t2, align: 'right' })
  text(ctx, '电流 A', L - 8, iTop - 12, { size: 10.5, color: C.t2, align: 'right' })
  // 窄屏底注较长，与横轴标题错开一行，避免叠字
  text(ctx, '充电时长 →', L + plotW / 2, narrow ? h - 26 : h - 12, { size: 10.5, color: C.t3, align: 'center' })

  // ── 参考线：4.2 V 截止 / 5.0 A 恒流 / 0.25 A 终止 ──
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = alpha(C.amber, 0.75)
  ctx.beginPath()
  ctx.moveTo(L, vY(V_CUT))
  ctx.lineTo(L + plotW, vY(V_CUT))
  ctx.stroke()
  ctx.strokeStyle = alpha(C.cyan, 0.45)
  ctx.beginPath()
  ctx.moveTo(L, iY(I_CC))
  ctx.lineTo(L + plotW, iY(I_CC))
  ctx.stroke()
  ctx.strokeStyle = alpha(C.green, 0.6)
  ctx.beginPath()
  ctx.moveTo(L, iY(I_END))
  ctx.lineTo(L + plotW, iY(I_END))
  ctx.stroke()
  ctx.setLineDash([])
  text(ctx, `${V_CUT} V 截止电压`, L + plotW - 4, vY(V_CUT) - 9, { size: 10, color: alpha(C.amber, 0.95), align: 'right' })
  text(ctx, '1C = 5.0 A', L + plotW - 4, iY(I_CC) - 9, { size: 10, color: alpha(C.cyan, 0.95), align: 'right' })
  text(ctx, `0.05C = ${Math.round(I_END * 1000)} mA 终止`, L + plotW - 4, iY(I_END) - 9, {
    size: 10,
    color: alpha(C.green, 0.95),
    align: 'right'
  })

  // ── 转 CV 的竖线 ──
  const xCv = xAt(CC_END)
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = alpha(C.t3, 0.6)
  ctx.beginPath()
  ctx.moveTo(xCv, T)
  ctx.lineTo(xCv, iTop + iH)
  ctx.stroke()
  ctx.setLineDash([])

  // ── 曲线：底图（暗）+ 已扫描段（亮） ──
  const N = 140
  const vs = []
  const is = []
  for (let i = 0; i <= N; i++) {
    const uu = i / N
    vs.push([xAt(uu), vY(voltageAt(uu))])
    is.push([xAt(uu), iY(currentAt(uu))])
  }
  const strokeUpTo = (pts, upto, color, lw) => {
    ctx.beginPath()
    let started = false
    for (const [x, y] of pts) {
      if (x > upto + 0.5) break
      if (!started) {
        ctx.moveTo(x, y)
        started = true
      } else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  // 曲线下渐变面积：扫描到哪里填到哪里 —— 曲线不再只是"一条飘着的细线"
  const fillUnder = (pts, upto, color, baseY) => {
    const g = ctx.createLinearGradient(0, T, 0, baseY)
    g.addColorStop(0, alpha(color, 0.26))
    g.addColorStop(1, alpha(color, 0.012))
    ctx.beginPath()
    ctx.moveTo(pts[0][0], baseY)
    let lastX = pts[0][0]
    for (const [x, y] of pts) {
      if (x > upto + 0.5) break
      ctx.lineTo(x, y)
      lastX = x
    }
    ctx.lineTo(lastX, baseY)
    ctx.closePath()
    ctx.fillStyle = g
    ctx.fill()
  }
  const xNow = xAt(u)
  fillUnder(vs, xNow, C.blue, T + vH)
  fillUnder(is, xNow, C.cyan, iTop + iH)
  strokeUpTo(vs, xAt(1), alpha(C.blue, 0.18), 1.4)
  strokeUpTo(is, xAt(1), alpha(C.blue, 0.18), 1.4)
  strokeUpTo(vs, xNow, C.blue, 2.2)
  strokeUpTo(is, xNow, C.cyan, 2.2)
  // 曲线末端光点
  const pv = [xNow, vY(voltageAt(u))]
  const pi = [xNow, iY(currentAt(u))]
  ctx.beginPath()
  ctx.arc(pv[0], pv[1], 8, 0, Math.PI * 2)
  ctx.fillStyle = alpha(C.blue, 0.2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(pv[0], pv[1], 3.4, 0, Math.PI * 2)
  ctx.fillStyle = '#bcdcff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(pi[0], pi[1], 3.4, 0, Math.PI * 2)
  ctx.fillStyle = '#7df3ff'
  ctx.fill()

  // ── 段内说明 ──
  if (plotW > 320) {
    const midCC = xAt(CC_END / 2)
    const midCV = xAt(CC_END + (1 - CC_END) / 2)
    text(ctx, inCC ? '电流恒定 1C' : '电流逐渐衰减', midCC, iTop + iH - 8, {
      size: 10.5,
      color: inCC ? alpha(C.cyan, 0.95) : C.t3,
      align: 'center'
    })
    text(ctx, inCC ? '电压逐渐上升' : '电压保持 4.2 V', midCC, T + vH - 8, {
      size: 10.5,
      color: inCC ? alpha(C.blue, 0.95) : C.t3,
      align: 'center'
    })
    if (u > CC_END) {
      text(ctx, 'CV 段把容量补到接近满', midCV, T + 14, { size: 10.5, color: alpha(C.green, 0.95), align: 'center' })
    }
  }
  if (u > 0.3 && u < CC_END + 0.12) {
    text(ctx, '转恒压', xCv, T - 12, { size: 10.5, color: C.t2, align: 'center' })
  }

  // ── 右侧 SOC 液位（窄屏省略，避免把绘图区压太扁） ──
  if (!narrow) {
    const bx = L + plotW + 20
    const bw2 = 30
    const bh = T + vH + gap + iH - T
    const by = T
    strokeRRect(ctx, bx, by, bw2, bh, 8, alpha(C.blue, 0.5), 1.4)
    const soc = socAt(u)
    const ih = (bh - 8) * soc
    ctx.save()
    rrectClip(ctx, bx + 4, by + 4, bw2 - 8, bh - 8, 5)
    const g = ctx.createLinearGradient(0, by + bh, 0, by)
    g.addColorStop(0, alpha(C.blue, 0.65))
    g.addColorStop(1, alpha(C.cyan, 0.8))
    ctx.fillStyle = g
    ctx.fillRect(bx + 4, by + bh - 4 - ih, bw2 - 8, ih)
    ctx.restore()
    text(ctx, 'SOC', bx + bw2 / 2, by - 12, { size: 10.5, color: C.t2, align: 'center' })
    text(ctx, `${Math.round(soc * 100)}%`, bx + bw2 / 2, by + bh + 14, { size: 11.5, color: C.cyan, align: 'center', mono: true })
  }

  // ── 底部结论（窄屏换短句，否则会顶出画布右边界） ──
  const note = narrow
    ? inCC
      ? 'CC 段：电流锁定 1C，电压逐步逼近截止值'
      : 'CV 段：电流衰减到 0.05C 即停，既防过充又补饱'
    : inCC
      ? 'CC 段：电流锁定 1C，电压随电荷积累逐步逼近截止值'
      : 'CV 段：电压锁定 4.2 V，电流自然衰减；衰减到 0.05C 即停止 —— 既防过充，又把容量补饱'
  text(ctx, note, 16, narrow ? h - 9 : h - 12, { size: narrow ? 10.5 : 11, color: alpha(C.green, 0.92) })
}

function rrectClip(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.clip()
}

export default {
  title: 'CC-CV 充电：为什么最后要转恒压',
  seconds: '约 13 秒 · 单遍',
  duration: 13000,
  aria: '恒流恒压充电曲线动画：电流在恒流段保持 5 安培，电压升至 4.2 伏后转恒压，电流衰减至 250 毫安结束',
  legend: [
    { color: C.blue, label: '充电电压' },
    { color: C.cyan, label: '充电电流' },
    { color: C.green, label: '0.05C 终止电流' },
    { color: C.amber, label: '4.2 V 截止电压' }
  ],
  basis:
    '曲线形状取自 CC-CV 标准充电协议的教科书形式；电流取值按本作品 BS-01 概念设定换算：1C = 5.0 A（5000 mAh ÷ 1 h），0.05C = 250 mA 终止。',
  disclaimer:
    '形状示意，非某一颗电芯的实测记录；曲线无实测起伏与温漂，仅用于说明两段式充电的先后与必要性。窄屏不显示右侧 SOC 液位。',
  draw
}
