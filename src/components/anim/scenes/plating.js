/**
 * 微动画 · 析锂与枝晶：快充和低温下最危险的那件事
 * 填补视频位 `ch04-plating`（原优先级：必做）
 * ---------------------------------------------------------------
 * 这一条本来的首选是 NASA/NREL 的同步辐射 X 射线实拍（公有领域、全网独一份），
 * 但实拍影像的获取链路长（要下 Excel → 逐条点链接 → 剪辑 → 配中文旁白）。
 * 这里先给出**机理动画**，把该讲的四件事讲全；实拍素材仍可在拿到后覆盖同一个视频位
 * （VideoSlot 的优先序：真实视频 > 本动画），两者是"示意 + 实证"的互补，不是重复。
 *
 * 对照结构：左右两个同构的界面剖面，左边正常嵌入、右边析锂。
 * 这一版把"差别"落到**颗粒明暗**上——这是最有说服力的一处细节：
 *   · 正常工况：锂真的进了颗粒，负极颗粒随充电逐步点亮；
 *   · 析锂工况：锂进不去，颗粒始终暗着，锂全堆在表面（苔状金属锂）。
 *
 * ⚠️ 枝晶与苔状沉积的形貌为程序生成的**示意**，
 *   不代表真实形核密度与长大速率；死锂比例是示意刻度，不是实测值。
 *   真实影像（同步辐射 X 射线 / 纳米影像）见 NASA、NREL 开放素材。
 */

import { C, alpha, chip, clipRRect, dendrite, drawBed, easeOut, fillRRect, fillUnder, glowDot, grainBed, labelTag, lerp, mossyProfile, rng, seg, strokeRRect, text } from '../stage.js'

const rnd = rng(9091)
const TAU = Math.PI * 2

/** 枝晶主干：从根部向上的一段确定性随机游走（纯形貌装饰，不参与数值）。
 *  真实锂枝晶是**针状**晶体 —— 摆幅要小才像针，摆幅大就成了"闪电"。
 *  y 归一化到 0→-1，绘制时按"根部到隔膜"的实际间距缩放，
 *  这样桌面与窄屏都能真的够到隔膜，也不会伸到面板外面。 */
function makeSpike(seed, n, sway) {
  const R = rng(seed)
  const pts = [[0, 0]]
  let x = 0
  for (let i = 1; i <= n; i++) {
    x += (R() - 0.5) * sway
    pts.push([x, -(i / n)])
  }
  return pts
}
const SPIKE_MAIN = makeSpike(4477, 24, 2.6)
const SPIKE_MINOR = makeSpike(991, 15, 2.2)
const BRANCHES = Array.from({ length: 7 }, () => ({
  at: 5 + Math.floor(rnd() * 18),
  dir: rnd() > 0.5 ? 1 : -1,
  len: 7 + rnd() * 11,
  up: rnd() * 0.3
}))
const FALL = Array.from({ length: 16 }, (_, i) => ({ x: rnd(), base: i / 16, r: 1.7 + rnd() * 0.8, sp: 0.85 + rnd() * 0.4 }))
// 电解液里的溶剂分子（静态装饰，纯装饰、不参与任何数值）
const SOLVENT = Array.from({ length: 34 }, () => ({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 0.7, a: 0.1 + rnd() * 0.14 }))

function drawPanel(ctx, bx, by, bw, bh, kind, prog, narrow) {
  const plating = kind === 'plating'
  const infoH = narrow ? 17 : 22 // 底部读数条：给读数一块自己的地方，否则会被颗粒压住
  // ── 剖面构成（自上而下）：正极颗粒床 → 隔膜（多孔带）→ 电解液 → 负极颗粒床 ──
  // 宽屏才画正极床：窄屏面板只有约 64px 高，四层塞不进去，
  // 硬塞会把负极床（本页的主角）压成一行。窄屏退化为"隔膜 + 电解液 + 负极床"。
  let catTop = 0
  let catBot = 0
  let sepBandH = 0
  if (!narrow) {
    catTop = by + 5
    catBot = catTop + Math.min(bh * 0.15, 26) // 正极床：薄，只作背景
    sepBandH = Math.min(11, bh * 0.12) // 隔膜多孔带
  }
  const sepY = narrow ? by + 15 : catBot + 7 + sepBandH / 2 // 隔膜中心线
  // 窄屏的 minElec 故意给小值：让 gTop 仍由 bh*0.5 决定，
  // 这样窄屏布局与加正极之前**逐像素一致**（那版已双分辨率验证过），只宽屏加层。
  const minElec = narrow ? 12 : 40 // 电解液至少要留出离子可穿越的高度
  const gTop = Math.max(by + bh * (narrow ? 0.5 : 0.42), sepY + minElec) // 负极颗粒床顶面 = "负极表面"
  const bedBot = by + bh - infoH
  const bedH = bedBot - gTop

  fillRRect(ctx, bx, by, bw, bh, 10, 'rgba(9,14,26,.7)')
  strokeRRect(ctx, bx, by, bw, bh, 10, alpha(plating ? C.red : C.blue, 0.42), 1.2)

  // ══ 正极颗粒床（宽屏）：球形二次颗粒，配色与第 03 章一致（正极紫） ══
  if (!narrow) {
    const catBed = grainBed(bx + 6, catTop, bw - 12, catBot - catTop, { seed: 3, cell: 15, jitter: 0.26, rK: 0.4 })
    ctx.save()
    clipRRect(ctx, bx + 4, catTop - 3, bw - 8, catBot - catTop + 4, 7)
    drawBed(ctx, catBed, C.violet, { dark: 0.34 })
    ctx.restore()
    labelTag(ctx, '正极', bx + 12, catTop + 10, { color: alpha(C.violet, 0.96), bg: 'rgba(20,12,40,.78)' })
  }

  // ══ 隔膜 ══
  // 真实隔膜是**多孔**聚合物膜（孔隙率约四成），所以画成一条带细孔的带，
  // 而不是一根虚线 —— 多孔才是"锂离子能过、电子不能过"的物理原因。
  let bandTop = 0
  if (!narrow) {
    bandTop = catBot + 7
    fillRRect(ctx, bx + 6, bandTop, bw - 12, sepBandH, sepBandH / 2, alpha(C.cyan, 0.1))
    strokeRRect(ctx, bx + 6, bandTop, bw - 12, sepBandH, sepBandH / 2, alpha(C.cyan, 0.4), 1)
    const poreR = rng(771)
    for (let i = 0; i < Math.round((bw - 24) / 9); i++) {
      const px = bx + 12 + i * 9 + poreR() * 3
      const py = bandTop + 2 + poreR() * (sepBandH - 4)
      ctx.beginPath()
      ctx.arc(px, py, 0.9, 0, TAU)
      ctx.fillStyle = alpha(C.cyan, 0.32)
      ctx.fill()
    }
  } else {
    // 窄屏：面板太矮，退回虚线
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = alpha(C.cyan, 0.5)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(bx + 8, sepY)
    ctx.lineTo(bx + bw - 8, sepY)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // 隔膜标注：宽屏放在"正极床与隔膜带之间"的 7px 缝隙里，不与任何元素叠字
  text(
    ctx,
    narrow ? '隔膜（示意位置）' : '隔膜（多孔 · 示意）',
    bx + 10,
    narrow ? sepY - 9 : catBot + 4,
    { size: 9.5, color: alpha(C.cyan, 0.8) }
  )

  // ══ 电解液：底色 + 溶剂分子（纯装饰，不参与任何数值） ══
  const elecTop = narrow ? sepY + 4 : bandTop + sepBandH + 2
  fillRRect(ctx, bx + 5, elecTop, bw - 10, Math.max(4, gTop - elecTop - 3), 6, alpha(C.cyan, 0.055))
  if (!narrow) {
    for (const s of SOLVENT) {
      const sx2 = bx + 10 + s.x * (bw - 20)
      const sy2 = elecTop + 3 + s.y * Math.max(4, gTop - elecTop - 9)
      ctx.beginPath()
      ctx.arc(sx2, sy2, s.r, 0, TAU)
      ctx.fillStyle = alpha(C.cyan, s.a * 0.5)
      ctx.fill()
    }
  }

  // ── 负极颗粒床 ──
  const cell = narrow ? 13 : 22
  const bed = grainBed(bx + 6, gTop, bw - 12, Math.max(20, bedH), { seed: plating ? 41 : 17, cell, jitter: 0.28, rK: 0.42 })
  // 关键对比：正常工况颗粒随充电点亮（锂进去了），析锂工况嵌锂被截断（锂留在表面）
  const lit = plating ? 0.34 : lerp(0.3, 1, easeOut(seg(prog, 0.15, 0.95)))
  ctx.save()
  // 裁剪区必须从颗粒中心上方开始（gTop - cell/2），否则顶排颗粒会被削平，
  // 而这一排正是"负极表面"，被削平就看不见锂沉积在哪了。
  clipRRect(ctx, bx + 4, gTop - cell * 0.55, bw - 8, bedH + cell * 0.55 + 2, 8)
  drawBed(
    ctx,
    bed.map((g) => ({ ...g, tone: (g.tone * 0.5 + 0.5) * lit })),
    C.blue,
    { dark: 0.2 }
  )
  ctx.restore()

  // 标题（窄屏面板只有约 140px 宽，长标题放不下，改用短版）
  const label = narrow
    ? plating
      ? '析锂工况'
      : '正常工况'
    : plating
      ? '析锂工况：快充 / 低温'
      : '正常工况：低倍率 / 常温'
  chip(ctx, label, bx + 6, by - (narrow ? 22 : 24), { color: plating ? C.red : C.blue, size: narrow ? 10 : 10.5 })
  text(ctx, plating ? '2C · −10 ℃' : '0.5C · 25 ℃', bx + bw - 6, by - (narrow ? 12 : 13), {
    size: narrow ? 9 : 10.5,
    color: plating ? alpha(C.red, 0.95) : C.t3,
    align: 'right',
    mono: true
  })

  // ── 下落的 Li⁺ ──
  FALL.forEach((p) => {
    const speed = plating ? 1.7 : 0.85
    const u = (prog * speed * p.sp + p.base) % 1
    const x = bx + 14 + p.x * (bw - 28)
    // 离子从正极出发，穿隔膜与电解液，落到负极表面
    const y = lerp(elecTop + 3, gTop - 3, u)
    if (y <= elecTop + 2) return
    const absorbed = y > gTop - 10 && !plating
    glowDot(ctx, x, y, absorbed ? p.r * 0.6 : p.r, C.cyan, { glow: absorbed ? 0.3 : 0.85 })
  })

  if (!plating) {
    // 正常：锂真的进了层间 —— 颗粒点亮，同时给一行读数
    const absorbed = Math.min(1, easeOut(seg(prog, 0.15, 0.95)))
    text(
      ctx,
      narrow ? `嵌入 ${Math.round(absorbed * 100)}%` : `已嵌入负极颗粒 ${Math.round(absorbed * 100)}%`,
      bx + bw / 2,
      by + bh - infoH / 2 - 1,
      { size: narrow ? 10 : 10.5, color: alpha(C.green, 0.95), align: 'center' }
    )
    return
  }

  // ══ 析锂侧 ══
  // 金属锂：苔状（海绵状）疏松沉积，覆盖在负极表面颗粒之上 ——
  // 不是光滑的一层。用两段不同频率的起伏叠出绒毛感。
  const layerT = easeOut(seg(prog, 0.16, 0.62))
  const amp = (narrow ? 11 : 19) * layerT
  if (amp > 1.2) {
    const baseY = gTop + 9
    const pts = mossyProfile(baseY, bx + 9, bx + bw - 9, amp, 8123, narrow ? 40 : 60)
    fillUnder(ctx, pts, baseY, alpha('#dbe6f5', 0.3))
    // 轮廓描边（亮银白，模拟金属光泽）
    ctx.beginPath()
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i]
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.strokeStyle = alpha('#eef4ff', 0.82)
    ctx.lineWidth = 1.3
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  // 枝晶：主枝 + 侧枝，线宽由根到尖渐细，中轴补一道高光
  const growT = seg(prog, 0.36, 0.9)
  const full = SPIKE_MAIN.length
  const k = Math.max(0, Math.floor(growT * full))
  const rootY = gTop - amp * 0.55
  // "根部到隔膜"的实际间距：桌面与窄屏都按它缩放，
  // 两处都真的能长到隔膜，又都不会伸出面板外。
  const reach = Math.max(18, rootY - (sepY + 3))
  const rootX = bx + bw * 0.36
  const bwSc = narrow ? 0.6 : 1
  if (k > 1) {
    ctx.save()
    // 枝晶可以"刺过"隔膜线（那正是要表现的），但不能伸出面板外
    clipRRect(ctx, bx + 3, by + 3, bw - 6, bh - 6, 9)
    const pts = SPIKE_MAIN.slice(0, k).map(([dx, dy]) => [rootX + dx, rootY + dy * reach])
    dendrite(ctx, pts, {
      hex: '#f2f7ff',
      w: narrow ? 1.8 : 2.4,
      tipW: 0.8,
      branch: BRANCHES.filter((b) => b.at < k).map((b) => ({ at: b.at, dir: b.dir, len: b.len * bwSc, up: b.up }))
    })

    // 第二根较矮的枝晶，避免"孤零零一根"
    const k2 = Math.max(0, Math.floor(growT * SPIKE_MINOR.length))
    if (k2 > 1) {
      const root2 = bx + bw * 0.63
      const pts2 = SPIKE_MINOR.slice(0, k2).map(([dx, dy]) => [root2 + dx, (gTop - amp * 0.45) + dy * reach * 0.72])
      dendrite(ctx, pts2, { hex: '#dce8f8', w: narrow ? 1.5 : 1.9, tipW: 0.7, branch: [] })
    }
    ctx.restore()
  }

  // 枝晶触及隔膜 → 内短路警示
  const tipK = k > 1 ? SPIKE_MAIN[k - 1][1] : 0
  const tipTop = rootY + tipK * reach
  if (k > 1 && tipTop <= sepY + 8) {
    const blink = 0.5 + 0.5 * Math.sin(prog * 34)
    const sparkR = narrow ? 14 : 22
    const markW = narrow ? 9 : 14
    ctx.strokeStyle = alpha(C.red, blink)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(rootX - markW, sepY)
    ctx.lineTo(rootX + markW, sepY)
    ctx.stroke()
    // 短路点火花
    const spark = ctx.createRadialGradient(rootX, sepY, 0, rootX, sepY, sparkR)
    spark.addColorStop(0, alpha(C.red, 0.5 * blink))
    spark.addColorStop(1, alpha(C.red, 0))
    ctx.beginPath()
    ctx.arc(rootX, sepY, sparkR, 0, TAU)
    ctx.fillStyle = spark
    ctx.fill()
    text(ctx, narrow ? '触及隔膜 · 短路隐患' : '触及隔膜 · 内短路隐患', bx + bw / 2, by + bh - infoH / 2 - 1, {
      size: narrow ? 10 : 10.5,
      color: C.red,
      align: 'center',
      weight: 600
    })
  } else {
    text(
      ctx,
      narrow
        ? `死锂 ${Math.round(easeOut(seg(prog, 0.2, 0.92)) * 34)}%`
        : `表面析出金属锂 · 死锂 ${Math.round(easeOut(seg(prog, 0.2, 0.92)) * 34)}%`,
      bx + bw / 2,
      by + bh - infoH / 2 - 1,
      { size: narrow ? 10 : 10.5, color: alpha(C.amber, 0.95), align: 'center' }
    )
  }
}

function draw(ctx, { w, h, t }) {
  const PAD = 16
  const narrow = w < 560
  // 顶部两行：宽屏把说明与胶囊并排；窄屏说明另起一行。
  // 面板标题画在 `top - 24`，所以 top 必须留够两行的高度，否则会与标题压在一起。
  const top = narrow ? 76 : 54
  // 窄屏两栏上下叠放，栏间距要 ≥ 26，否则下栏标题会压住上栏。
  const gap = narrow ? 28 : 14
  // 桌面留 48：底部"后果一/后果二"两行要贴在面板外，留够间距才不显得和颗粒挤在一起
  const bottom = h - (narrow ? 62 : 48)

  const prog = seg(t, 0.06, 0.9)

  if (narrow) {
    // 窄屏也走**左右并排**：320×280 里若上下叠放，每栏只剩约 55px 高，
    // 颗粒床会被压成一行、枝晶完全没有生长空间（实测截图确认过）。
    // 并排后每栏约 139×142，颗粒床有 50 余像素，枝晶才长得出来。
    const g = 10
    const pw = (w - PAD * 2 - g) / 2
    const ph = bottom - top
    drawPanel(ctx, PAD, top, pw, ph, 'normal', prog, true)
    drawPanel(ctx, PAD + pw + g, top, pw, ph, 'plating', prog, true)
  } else {
    const pw = (w - PAD * 2 - gap) / 2
    const ph = bottom - top
    drawPanel(ctx, PAD, top, pw, ph, 'normal', prog, false)
    drawPanel(ctx, PAD + pw + gap, top, pw, ph, 'plating', prog, false)
  }

  // 顶部说明
  chip(ctx, '同一条界面 · 两种工况', PAD, 4, { color: C.cyan, size: 10.5 })
  text(
    ctx,
    '锂来不及嵌入负极 → 只能在表面以金属锂析出',
    narrow ? PAD : PAD + 172,
    narrow ? 30 : 15,
    { size: 11, color: C.t2 }
  )

  // 底部两个后果（窄屏拆行，否则一行放不下会溢出画布）
  if (narrow) {
    text(ctx, '后果一：锂失去活性 → 容量直接损失', PAD, h - 46, { size: 10.5, color: alpha(C.amber, 0.95) })
    text(ctx, '后果二：枝晶刺穿隔膜 → 内短路隐患', PAD, h - 30, { size: 10.5, color: alpha(C.amber, 0.95) })
    text(ctx, '真实影像见 NASA / NREL 开放素材', PAD, h - 12, { size: 10, color: C.t3 })
  } else {
    text(ctx, '后果一：析出的锂失去活性，容量直接损失　·　后果二：枝晶可能刺穿隔膜，造成内短路安全隐患', PAD, h - 24, {
      size: 10.5,
      color: alpha(C.amber, 0.95)
    })
    text(ctx, '真实同步辐射 X 射线影像见资料来源（NASA / NREL 公有领域素材）', PAD, h - 8, {
      size: 10,
      color: C.t3
    })
  }
}

export default {
  title: '析锂与枝晶：低温或大倍率充电时，锂为什么进不去负极',
  seconds: '约 14 秒 · 单遍',
  duration: 14000,
  aria: '析锂机理动画：正常工况下锂离子嵌入负极颗粒并使其点亮；快充低温工况下锂离子进不去，在负极表面析出苔状金属锂并长出枝晶，最终触及隔膜',
  // 图例只收"两栏都画"的元素：正极床仅宽屏绘制（窄屏面板太矮），
  // 它在画布内已有"正极"标注，进图例反而会在窄屏造成名不副实。
  legend: [
    { color: C.blue, label: '负极颗粒' },
    { color: C.cyan, label: 'Li⁺' },
    { color: '#e2e8f0', label: '析出的金属锂 / 枝晶' },
    { color: C.red, label: '内短路隐患' }
  ],
  basis:
    '依析锂判据绘制：界面处锂的到达速率超过固相扩散速率时，表面锂浓度累积、局部电位越过锂沉积平衡电位（本作品机制库中的 j_Li > 0 判据），锂即在负极表面以金属形式析出。左右两栏为同一界面的两种工况对照 —— 正常侧颗粒被嵌入的锂逐步点亮；析锂侧嵌锂在较低水平就被迫停止（颗粒保持偏暗），多余锂堆在表面。',
  disclaimer:
    '机理定性示意，非实测影像。枝晶与苔状沉积的形貌为程序生成，形核密度与长大速率不代表真实值；颗粒明暗与死锂百分比均为示意刻度。真实影像请见 NASA/NREL 开放素材。',
  draw
}
