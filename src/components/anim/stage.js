/**
 * 微动画公共舞台（Canvas 2D）
 * ---------------------------------------------------------------
 * 本模块把"页内科普视频"改造成**本站自制微动画**所需的全部机械部分收在一处：
 *   - requestAnimationFrame 时间轴（t: 0→1，播完停顿再循环）
 *   - DPR 适配与尺寸监听（画布尺寸完全由容器决定，绘制一律用 CSS 像素）
 *   - 进入视口才播放 / 离开视口即停（同页放两条动画也不会一起空转）
 *   - 尊重 prefers-reduced-motion：直接停在末帧，不自动播放
 *   - 播放 / 暂停 / 重播 / 拖动进度（评审可以反复回看某一帧）
 *
 * ⚠️ 画面里凡是"数值"都必须能说出依据：
 *   实测数据画实数点；机制示意一律在页面常驻口径里标"示意 / 归一化相对量"。
 *   不要用 Math.sin / Math.random 造"看起来像数据"的曲线。
 *   （本文件里的 mulberry32 只用于粒子起始位置等**纯装饰**抖动，不参与任何数值。）
 */

import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// ── 全站配色（与 base.scss :root 对齐，画布里取不到 CSS 变量，只能硬写） ──
export const C = {
  blue: '#4da8ff',
  blueDeep: '#2563eb',
  cyan: '#22d3ee',
  green: '#34d399',
  amber: '#f59e0b',
  red: '#ef4444',
  violet: '#a78bfa',
  t1: '#eaf2ff',
  t2: '#9fb0c8',
  t3: '#64748b',
  line: 'rgba(90,150,220,.22)',
  lineStrong: 'rgba(120,180,255,.42)'
}

/** #rrggbb → rgba(...)，用于铺半透明底色。 */
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const SANS = '-apple-system, "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", sans-serif'
const MONO = '"SF Mono", "Cascadia Code", Consolas, "Courier New", monospace'

export function font(ctx, size, weight = 400, mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? MONO : SANS}`
}

/** 画一行字。所有文字都走这里，保证字号与颜色口径统一。 */
export function text(ctx, str, x, y, o = {}) {
  const { size = 12, color = C.t2, align = 'left', baseline = 'middle', weight = 400, mono = false } = o
  font(ctx, size, weight, mono)
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
}

export function measure(ctx, str, size = 12, weight = 400, mono = false) {
  font(ctx, size, weight, mono)
  return ctx.measureText(str).width
}

/** 圆角矩形路径（不依赖 ctx.roundRect，兼容性更稳）。 */
export function rrect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

export function fillRRect(ctx, x, y, w, h, r, fill) {
  rrect(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

export function strokeRRect(ctx, x, y, w, h, r, stroke, lw = 1) {
  rrect(ctx, x, y, w, h, r)
  ctx.strokeStyle = stroke
  ctx.lineWidth = lw
  ctx.stroke()
}

/** 胶囊标签，返回占用的宽度，便于横向串联。 */
export function chip(ctx, str, x, y, o = {}) {
  const { size = 11, color = C.cyan, pad = 9, bg } = o
  const tw = measure(ctx, str, size, 500)
  const w = tw + pad * 2
  const h = size + 10
  fillRRect(ctx, x, y, w, h, h / 2, bg || alpha(color, 0.12))
  strokeRRect(ctx, x, y, w, h, h / 2, alpha(color, 0.4))
  text(ctx, str, x + pad, y + h / 2, { size, color, weight: 500 })
  return w
}

/** 带箭头的线段（箭头画在末端）。 */
export function arrow(ctx, x1, y1, x2, y2, color, lw = 1.4, head = 6) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42))
  ctx.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42))
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

/** 折线路径上的点（u：0→1 按弧长）。用于让电子沿"外电路"走。 */
export function polyPoint(points, u) {
  const segs = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    const len = Math.hypot(dx, dy)
    segs.push({ a: points[i - 1], b: points[i], len })
    total += len
  }
  let d = Math.max(0, Math.min(1, u)) * total
  for (const s of segs) {
    if (d <= s.len) {
      const k = s.len < 1e-6 ? 0 : d / s.len
      return [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k]
    }
    d -= s.len
  }
  const last = points[points.length - 1]
  return [last[0], last[1]]
}

export function polyline(ctx, points, color, lw = 1) {
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

// ── 小工具 ───────────────────────────────────────────────────
export const lerp = (a, b, u) => a + (b - a) * u
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3)
export const easeInOut = (u) => {
  const x = clamp(u, 0, 1)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
/** 把全局进度 t 映射到 [a,b] 段内的 0→1（超出即钳位）。分阶段动画全靠它。 */
export const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1)
/** 确定性伪随机：只用于粒子初始摆位等装饰，绝不参与数值。 */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** 淡入淡出：进入/离开某一阶段时用，避免元素突然出现。 */
export const fade = (u, edge = 0.12) => Math.min(clamp(u / edge, 0, 1), clamp((1 - u) / edge, 0, 1))

/* ═══════════════════════════════════════════════════════════════
 * 微观场景原语
 * ---------------------------------------------------------------
 * 上面那批是"示意图"件（矩形、胶囊、箭头）。这一批负责把电极从
 * **纯色色块**变成**颗粒堆积床** —— 也就是同步辐射 X 射线影像、
 * 枝晶纳米影像、电芯剖面动画里共有的那种视觉语言。
 *
 * ⚠️ 这里画的颗粒形貌是**程序生成的示意结构**：
 *    它让"锂嵌进哪里、膜长在哪里"看得见，但**不代表**真实颗粒尺寸、
 *    粒径分布或堆积方式。凡是用了这批原语的场景，
 *    口径栏必须写明"形貌为示意"。
 * ═══════════════════════════════════════════════════════════════ */

/**
 * 球状颗粒 sprite（离屏预渲染一次，之后只做 drawImage）。
 * 直接每帧 createRadialGradient 画几百个球会拖垮低端机，
 * 这里把"渐变 + 高光 + 边缘暗化"烘焙成 3 档亮度的贴图。
 */
const _spr = new Map()
function ballSprite(hex, tone) {
  const key = `${hex}|${tone}`
  const hit = _spr.get(key)
  if (hit) return hit
  const S = 64
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const c = cv.getContext('2d')
  const R = S / 2 - 3
  const cx = S / 2
  const cy = S / 2
  // 底色：从"受光面"到"背光面"的径向渐变
  const g = c.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.06, cx, cy, R * 1.06)
  g.addColorStop(0, alpha(hex, 0.16 + tone * 0.5))
  g.addColorStop(0.55, alpha(hex, 0.1 + tone * 0.3))
  g.addColorStop(1, alpha(hex, 0.16 + tone * 0.12))
  c.beginPath()
  c.arc(cx, cy, R, 0, Math.PI * 2)
  c.fillStyle = g
  c.fill()
  // 高光：一小块偏左上的柔光
  const hl = c.createRadialGradient(cx - R * 0.36, cy - R * 0.42, 0, cx - R * 0.36, cy - R * 0.42, R * 0.62)
  hl.addColorStop(0, `rgba(255,255,255,${0.16 + tone * 0.34})`)
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  c.beginPath()
  c.arc(cx - R * 0.36, cy - R * 0.42, R * 0.62, 0, Math.PI * 2)
  c.fillStyle = hl
  c.fill()
  // 边缘：一圈细描边，把颗粒从背景里"抠"出来
  c.beginPath()
  c.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
  c.strokeStyle = alpha(hex, 0.42 + tone * 0.34)
  c.lineWidth = 1.3
  c.stroke()
  _spr.set(key, cv)
  return cv
}

/** 画一个球状颗粒。tone∈[0,1] 控制明暗，用于制造"堆积厚度"的层次。 */
export function ball(ctx, x, y, r, hex = C.violet, tone = 0.5) {
  const k = tone < 0.34 ? 0 : tone < 0.67 ? 1 : 2
  const spr = ballSprite(hex, k)
  ctx.drawImage(spr, x - r, y - r, r * 2, r * 2)
}

/**
 * 生成一床颗粒（交错密排 + 确定性抖动）。
 * 纯计算，不绘制；布局按 (尺寸, 种子) 缓存，尺寸不变就不会重算。
 */
const _bed = new Map()
export function grainBed(x, y, w, h, o = {}) {
  const { seed = 1, cell = 24, jitter = 0.3, rK = 0.44, grow = 1 } = o
  const key = `${seed}|${x.toFixed(1)},${y.toFixed(1)},${w.toFixed(1)},${h.toFixed(1)}|${cell}|${jitter}|${rK}|${grow}`
  const hit = _bed.get(key)
  if (hit) return hit
  const out = []
  const R = rng(seed)
  const cols = Math.ceil(w / cell) + 1
  const rows = Math.ceil(h / cell) + 1
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const ox = (iy % 2) * cell * 0.5
      const px = x + ix * cell + ox + (R() - 0.5) * cell * jitter
      const py = y + iy * cell + (R() - 0.5) * cell * jitter
      const rr = cell * rK * grow * (0.82 + R() * 0.36)
      if (px + rr < x || px - rr > x + w || py + rr < y || py - rr > y + h) continue
      out.push({ px, py, rr, tone: R(), depth: (py - y) / Math.max(1, h) })
    }
  }
  _bed.set(key, out)
  if (_bed.size > 48) _bed.clear() // 换分辨率时旧布局没有价值，防无限增长
  return out
}

/** 画一床颗粒。靠近顶部/底部的颗粒略暗，制造景深。 */
export function drawBed(ctx, bed, hex = C.violet, o = {}) {
  const { dark = 0.34 } = o
  for (const g of bed) ball(ctx, g.px, g.py, g.rr, hex, g.tone * (1 - dark) + dark * g.depth)
}

/**
 * 石墨片晶：不规则多边形 + 内部层线。
 * 石墨是**片层**结构，画成球会误导；这里用带层理的薄片表示。
 */
export function flake(ctx, x, y, r, rot, hex = C.blue, o = {}) {
  const { layers = 3, tone = 0.5 } = o
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  const n = 6
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (i % 2 ? 0.82 : 1)
    const px = Math.cos(a) * rr * 1.18
    const py = Math.sin(a) * rr * 0.78
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = alpha(hex, 0.14 + tone * 0.22)
  ctx.fill()
  ctx.strokeStyle = alpha(hex, 0.38 + tone * 0.34)
  ctx.lineWidth = 1.15
  ctx.stroke()
  // 层理：几道平行短线，暗示层间通道
  if (r > 7) {
    ctx.strokeStyle = alpha(hex, 0.34 + tone * 0.3)
    ctx.lineWidth = 0.9
    for (let i = 1; i <= layers; i++) {
      const yy = -r * 0.5 + (r * 1.0 * i) / (layers + 1)
      ctx.beginPath()
      ctx.moveTo(-r * 0.72, yy)
      ctx.lineTo(r * 0.72, yy)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** 生成一床片晶（石墨负极）。 */
const _bedF = new Map()
export function flakeBed(x, y, w, h, o = {}) {
  const { seed = 2, cell = 26, jitter = 0.34 } = o
  const key = `f${seed}|${x.toFixed(1)},${y.toFixed(1)},${w.toFixed(1)},${h.toFixed(1)}|${cell}|${jitter}`
  const hit = _bedF.get(key)
  if (hit) return hit
  const out = []
  const R = rng(seed)
  const cols = Math.ceil(w / cell) + 1
  const rows = Math.ceil(h / cell) + 1
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const px = x + ix * cell + (iy % 2) * cell * 0.5 + (R() - 0.5) * cell * jitter
      const py = y + iy * cell + (R() - 0.5) * cell * jitter
      const rr = cell * 0.4 * (0.86 + R() * 0.34)
      if (px + rr * 1.4 < x || px - rr * 1.4 > x + w || py + rr < y || py - rr > y + h) continue
      out.push({ px, py, rr, rot: (R() - 0.5) * 1.1, tone: R(), depth: (py - y) / Math.max(1, h) })
    }
  }
  _bedF.set(key, out)
  if (_bedF.size > 48) _bedF.clear()
  return out
}

export function drawFlakeBed(ctx, bed, hex = C.blue, o = {}) {
  const { dark = 0.3 } = o
  for (const g of bed) {
    flake(ctx, g.px, g.py, g.rr, g.rot, hex, { tone: g.tone * (1 - dark) + dark * g.depth })
  }
}

/**
 * 发光粒子：核心 + 辉光 + 可选拖尾。
 * trail 是 [[x,y],...] 的历史点（新的在前），越靠后越淡越细。
 */
export function glowDot(ctx, x, y, r, hex = C.cyan, o = {}) {
  const { glow = 1, trail = null, tailLen = 3 } = o
  if (trail) {
    for (let i = 0; i < Math.min(trail.length, tailLen); i++) {
      const p = trail[i]
      const k = 1 - i / (tailLen + 0.6)
      ctx.beginPath()
      ctx.arc(p[0], p[1], r * (0.42 + k * 0.5), 0, Math.PI * 2)
      ctx.fillStyle = alpha(hex, 0.3 * k)
      ctx.fill()
    }
  }
  if (glow > 0) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.6)
    g.addColorStop(0, alpha(hex, 0.42 * glow))
    g.addColorStop(0.45, alpha(hex, 0.14 * glow))
    g.addColorStop(1, alpha(hex, 0))
    ctx.beginPath()
    ctx.arc(x, y, r * 3.6, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r * 0.62, 0, Math.PI * 2)
  ctx.fillStyle = alpha(hex, 0.92)
  ctx.fill()
}

/**
 * 包覆膜：沿颗粒表面画一圈"壳"。
 * 用于 SEI —— 膜长在颗粒外表面，不是悬在电极上方的一条横带。
 * @param {number} k 0→1 相对厚度
 */
export function shell(ctx, x, y, r, hex, k, o = {}) {
  const { max = 5, alphaK = 1 } = o
  if (k <= 0.01) return
  const t = max * k
  ctx.beginPath()
  ctx.arc(x, y, r + t * 0.5, 0, Math.PI * 2)
  ctx.strokeStyle = alpha(hex, (0.42 + 0.5 * k) * alphaK)
  ctx.lineWidth = t
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, r + t, 0, Math.PI * 2)
  ctx.strokeStyle = alpha(hex, 0.5 * alphaK)
  ctx.lineWidth = 1
  ctx.stroke()
}

/**
 * 苔状沉积：在一条基线之上做出"堆积的疏松物质"轮廓。
 * 用于析出的金属锂 —— 它不是光滑的一层，而是苔藓状/海绵状。
 * 用两段不同频率的正弦叠加出**不规则轮廓**（纯形貌装饰，不含数值）。
 */
export function mossyProfile(baseY, x0, x1, amp, seed, n = 54) {
  const R = rng(seed)
  const ph = [R() * 6.28, R() * 6.28, R() * 6.28]
  const pts = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = x0 + (x1 - x0) * u
    // 骨架包络（中间厚两端薄）+ 三层正弦叠加出绒毛感
    const env = Math.sin(Math.PI * u) * 0.62 + 0.38
    const w =
      0.52 * Math.sin(u * 21 + ph[0]) + 0.3 * Math.sin(u * 47 + ph[1]) + 0.18 * Math.sin(u * 89 + ph[2])
    pts.push([x, baseY - amp * env * (0.62 + 0.5 * w)])
  }
  return pts
}

export function fillUnder(ctx, pts, baseY, fill) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], baseY)
  for (const [x, y] of pts) ctx.lineTo(x, y)
  ctx.lineTo(pts[pts.length - 1][0], baseY)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** 把 ctx 裁剪到一个圆角矩形区域（画完记得 restore）。 */
export function clipRRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
  ctx.clip()
}

/**
 * 带深色底衬的标注：画在颗粒床之上也能看清，不必为它另找空白处。
 * x 是文字左边缘，y 是垂直中心。
 */
export function labelTag(ctx, str, x, y, o = {}) {
  const { size = 10.5, color = C.violet, weight = 500, bg = 'rgba(5,9,16,.78)' } = o
  const tw = measure(ctx, str, size, weight)
  const h = size + 10
  fillRRect(ctx, x - 6, y - h / 2, tw + 12, h, 5, bg)
  strokeRRect(ctx, x - 6, y - h / 2, tw + 12, h, 5, 'rgba(120,180,255,.22)')
  text(ctx, str, x, y, { size, color, weight })
  return tw + 12
}

/**
 * 六向星形/针状晶体（枝晶）。
 * 真实锂枝晶是**针状 / 苔藓状**的晶体，有主干也有分叉；
 * 这里按"确定性随机游走"生成主干，再挂侧枝，最后补高光。
 */
export function dendrite(ctx, pts, o = {}) {
  const { hex = '#eef4ff', w = 2.2, tipW = 0.7, branch = [] } = o
  if (pts.length < 2) return
  // 主干：从根到尖，线宽渐细
  const n = pts.length
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 1; i < n; i++) {
    const k = i / n
    ctx.beginPath()
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1])
    ctx.lineTo(pts[i][0], pts[i][1])
    ctx.strokeStyle = alpha(hex, 0.5 + 0.45 * (1 - k))
    ctx.lineWidth = lerp(tipW, w, 1 - k)
    ctx.stroke()
  }
  // 高光：主干中轴一道更亮的细线
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i]
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.strokeStyle = alpha('#ffffff', 0.55)
  ctx.lineWidth = 0.9
  ctx.stroke()
  // 侧枝
  branch.forEach((b) => {
    const p = pts[b.at]
    if (!p) return
    ctx.beginPath()
    ctx.moveTo(p[0], p[1])
    ctx.quadraticCurveTo(
      p[0] + b.dir * b.len * 0.6,
      p[1] - b.len * 0.5,
      p[0] + b.dir * b.len,
      p[1] - b.len * (0.72 + b.up)
    )
    ctx.strokeStyle = alpha(hex, 0.72)
    ctx.lineWidth = 1.35
    ctx.stroke()
  })
}

/**
 * 动画舞台。draw(ctx, { w, h, t, done, T }) 必须是**纯绘制**函数。
 * @param {Function} draw
 * @param {{duration?:number, hold?:number, loop?:boolean, deps?:import('vue').Ref[]}} opts
 *   duration 单位毫秒（单遍时长）；hold 是播完后停顿多久再重播。
 */
export function useAnimStage(draw, opts = {}) {
  const { duration = 11000, hold = 1800, loop = true, deps = [] } = opts

  const canvasRef = ref(null)
  const playing = ref(false)
  const progress = ref(0)
  const finished = ref(false)

  const reduced =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  let ctx = null
  let raf = 0
  let ro = null
  let io = null
  let elapsed = 0
  let last = 0
  let box = { w: 0, h: 0 }
  let inView = false
  let userStopped = false // 用户手动暂停后，不再被"滚回来"自动接管

  function paint() {
    if (!ctx || !box.w || !box.h) return
    ctx.clearRect(0, 0, box.w, box.h)
    draw(ctx, { w: box.w, h: box.h, t: Math.min(1, elapsed / duration), done: elapsed >= duration, T: C })
  }

  function resize() {
    const el = canvasRef.value
    if (!el) return
    const host = el.parentElement
    const r = host ? host.getBoundingClientRect() : el.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width))
    const h = Math.max(1, Math.round(r.height))
    if (w === box.w && h === box.h) return
    box = { w, h }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    el.width = Math.round(w * dpr)
    el.height = Math.round(h * dpr)
    ctx = el.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paint()
  }

  function tick(now) {
    if (!playing.value) return
    const dt = last ? Math.min(now - last, 60) : 16.7
    last = now
    elapsed += dt
    const total = duration + hold
    if (elapsed >= total) {
      if (loop) elapsed = 0
      else {
        elapsed = duration
        playing.value = false
        finished.value = true
      }
    }
    progress.value = Math.min(1, elapsed / duration)
    paint()
    if (playing.value) raf = requestAnimationFrame(tick)
  }

  function play() {
    if (playing.value || reduced) return
    if (elapsed >= duration + hold) {
      elapsed = 0
      progress.value = 0
      finished.value = false
    }
    playing.value = true
    last = 0
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(tick)
  }

  function pause() {
    playing.value = false
    cancelAnimationFrame(raf)
  }

  function toggle() {
    userStopped = true
    if (playing.value) pause()
    else play()
  }

  function replay() {
    userStopped = true
    pause()
    elapsed = 0
    progress.value = 0
    finished.value = false
    paint()
    play()
  }

  function seek(p) {
    userStopped = true
    elapsed = clamp(p, 0, 1) * duration
    progress.value = Math.min(1, elapsed / duration)
    finished.value = elapsed >= duration
    paint()
  }

  onMounted(() => {
    resize()
    requestAnimationFrame(resize)

    if (typeof ResizeObserver !== 'undefined' && canvasRef.value?.parentElement) {
      ro = new ResizeObserver(() => resize())
      ro.observe(canvasRef.value.parentElement)
    }

    if (reduced) {
      // 减少动效：直接给末帧，不自动播放（用户仍可手动播放/拖动）。
      elapsed = duration
      progress.value = 1
      finished.value = true
      paint()
      return
    }

    if (typeof IntersectionObserver !== 'undefined' && canvasRef.value) {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[0]
          inView = e.intersectionRatio > 0.25
          if (userStopped || reduced) return
          if (inView) play()
          else pause()
        },
        { threshold: [0, 0.25, 0.6] }
      )
      io.observe(canvasRef.value)
    } else {
      play()
    }
  })

  onBeforeUnmount(() => {
    pause()
    ro?.disconnect()
    io?.disconnect()
  })

  if (deps.length) watch(deps, () => paint())

  return { canvasRef, playing, progress, finished, play, pause, toggle, replay, seek, reduced, repaint: paint }
}
