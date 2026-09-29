// 电芯 3D 模型工厂 —— 全部程序化建模（无需 Blender 资产）
// 手法参考 enterprise-bms-digital-twin：InstancedMesh 粒子 + 预分配 + MeshBasicMaterial 自发光 + PointLight 辉光
import * as THREE from 'three'
import { PALETTE, pool } from './labScene.js'

/**
 * 圆柱电芯外壳 —— 按真实 18650 / 21700 尺寸比例建模
 *
 * 单位制：1 unit = 10 mm。真实 21700 = Φ21 × 70 mm → r 1.05 / h 7.00；
 * 18650 = Φ18 × 65 mm → r 0.90 / h 6.50。
 *
 * 旧实现用 r 1.05 / h 3.5，高径比只有 1.69:1，而真实规格是 21700 的 3.33:1、
 * 18650 的 3.61:1 —— 等于把电池建成了矮胖罐子，这是"看起来不像真电池"的根本原因。
 * 本版按真实比例重建，并补齐真实结构：正极凸台、顶盖、肩部收口、镀镍钢壳、
 * 热缩膜标签、泄压阀刻痕、底部环槽。
 */
export const CELL_SPECS = {
  // r 壳半径 / h 总高 / topR 肩部收口半径 / capR 正极凸台半径 / capH 凸台高
  // shoulderH 肩高 / plateH 顶盖厚 / bottomH 底盖厚（单位均为 10 mm 的倍数）
  '18650': { r: 0.90, h: 6.50, topR: 0.70, capR: 0.275, capH: 0.11, shoulderH: 0.20, plateH: 0.06, bottomH: 0.085 },
  '21700': { r: 1.05, h: 7.00, topR: 0.80, capR: 0.300, capH: 0.12, shoulderH: 0.22, plateH: 0.07, bottomH: 0.095 }
}

export function buildCylindricalCell({
  format = '21700',
  brand = 'BS-01',
  voltage = 3.6,
  capacity = 5000
} = {}) {
  const spec = CELL_SPECS[format] || CELL_SPECS['21700']
  const { r, h, topR, capR, capH, shoulderH, plateH, bottomH } = spec
  const g = new THREE.Group()

  // 镀镍钢：银白微灰的高金属度表面。真实电芯壳体是抛光镀镍钢，不是深蓝塑料 ——
  // 旧版把壳设成 0x2a3448 深蓝，是"不像真电池"的第二个原因。
  const steel = new THREE.MeshStandardMaterial({ color: 0xa9b4c3, roughness: 0.3, metalness: 0.92 })
  const steelBright = new THREE.MeshStandardMaterial({ color: 0xc6d0dd, roughness: 0.22, metalness: 0.95 })
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x8d97a6, roughness: 0.42, metalness: 0.85 })

  // 几何基准（模型几何中心位于组原点，y ∈ [-h/2, h/2]）
  const capTop = h / 2
  const capBottom = capTop - capH
  const plateBottom = capBottom - plateH
  const shoulderBottom = plateBottom - shoulderH
  const bodyTop = shoulderBottom
  const bodyBottom = -h / 2 + bottomH
  const bodyH = bodyTop - bodyBottom

  // 1) 管身
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, 64, 1, true), steel)
  body.position.y = (bodyTop + bodyBottom) / 2
  body.name = 'shellBody'
  g.add(body)

  // 2) 肩部收口：真实电芯顶部的斜肩，圆柱过渡到顶盖
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(topR, r, shoulderH, 64, 1, true), steel)
  shoulder.position.y = shoulderBottom + shoulderH / 2
  shoulder.name = 'shoulder'
  g.add(shoulder)

  // 3) 顶盖盘
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(topR, topR, plateH, 64), steelBright)
  plate.position.y = plateBottom + plateH / 2
  plate.name = 'positiveCap'
  g.add(plate)

  // 4) 正极凸台（真实尺寸：18650 为 Φ5.5 mm，21700 为 Φ6.0 mm）
  const terminal = new THREE.Mesh(new THREE.CylinderGeometry(capR, capR * 1.08, capH, 40), steelBright)
  terminal.position.y = capBottom + capH / 2
  terminal.name = 'terminal'
  g.add(terminal)

  // 5) 泄压阀刻痕：顶盖上三条径向刻线。真实电芯内压异常时从此处定向撕开泄压。
  const markMat = new THREE.MeshStandardMaterial({ color: 0x59626f, roughness: 0.6, metalness: 0.5 })
  const vent = new THREE.Group()
  vent.name = 'ventMarks'
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const len = (topR - capR) * 1.5
    const mark = new THREE.Mesh(new THREE.BoxGeometry(len, 0.008, 0.016), markMat)
    const mid = capR + len / 2
    mark.position.set(Math.cos(a) * mid, plateBottom + plateH + 0.002, Math.sin(a) * mid)
    mark.rotation.y = -a
    vent.add(mark)
  }
  g.add(vent)

  // 6) 负极端面 + 底部环形凹槽（真实电芯底部的一圈压痕）
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bottomH, 64), steelDark)
  bottom.position.y = -h / 2 + bottomH / 2
  bottom.name = 'negativeCap'
  g.add(bottom)

  const groove = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, 0.014, 8, 48), steelDark)
  groove.rotation.x = Math.PI / 2
  groove.position.y = -h / 2 + bottomH + 0.004
  groove.name = 'bottomGroove'
  g.add(groove)

  // 7) 热缩膜标签：覆盖管身中段，上下各裸露 1.5 mm 金属
  const wrapMargin = 0.15
  const wrapH = bodyH - wrapMargin * 2
  const tex = makeWrapTexture({ model: format, brand, voltage, capacity })
  const wrap = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.012, r * 1.012, wrapH, 64, 1, true),
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.62, metalness: 0.06,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.14 // 标签微光背照，深色场景里保持可读
    })
  )
  wrap.position.y = bodyBottom + wrapMargin + wrapH / 2
  wrap.name = 'wrap'
  g.add(wrap)

  g.userData.radius = r
  g.userData.height = h
  g.userData.spec = spec
  g.userData.format = format
  return g
}

/**
 * 热缩膜标签纹理（圆柱展开图：x 轴 = 周长，y 轴 = 轴向）
 * 层级参照真实消费级 18650/21700 电芯标签：品牌 / 型号 / 电压 / 容量 / 能量 / 极性 / 警示语。
 */
function makeWrapTexture({ model, brand, voltage, capacity }) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const ctx = c.getContext('2d')

  // 膜底色：深蓝渐变，贴合站点主色，同时保留热缩膜的轻微光泽变化
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#1d3760')
  grad.addColorStop(0.5, '#172b4d')
  grad.addColorStop(1, '#122240')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 256)

  // 上下边缘银色收边：热缩膜压在金属壳上的反光
  const edge = ctx.createLinearGradient(0, 0, 0, 256)
  edge.addColorStop(0, 'rgba(205,220,240,0.45)')
  edge.addColorStop(0.05, 'rgba(205,220,240,0)')
  edge.addColorStop(0.95, 'rgba(205,220,240,0)')
  edge.addColorStop(1, 'rgba(205,220,240,0.45)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, 1024, 256)

  ctx.textBaseline = 'middle'

  // 同一组信息沿圆周印两处，且各自"骑"在 UV 接缝两侧：
  // 圆柱只有约 40% 的弧面朝向镜头，块边界若正好落在正面，两块都会被切半、都读不出来。
  // 画三次（-230 / 282 / 794）让接缝恰好处在第一块的正中央，正面永远是一块完整信息。
  // 块宽 380/1024 ≈ 134° < 约 144° 的可见弧面 —— 保证整块信息能同时落在视野内
  const BLOCK_W = 380
  const blocks = [-190, 322, 834].map((x0) => ({ x0, w: BLOCK_W }))
  for (const b of blocks) {
    // 品牌 + 型号命名（真实型号即"直径+高度"）
    ctx.textAlign = 'left'
    ctx.fillStyle = '#dce9fb'
    ctx.font = 'bold 64px Consolas, monospace'
    ctx.fillText(brand, b.x0 + 42, 100)
    ctx.fillStyle = 'rgba(152,182,216,0.85)'
    ctx.font = '28px Consolas, monospace'
    ctx.fillText(`${model} · Li-ion`, b.x0 + 44, 158)

    // 电压 / 容量 / 能量三行规格
    ctx.textAlign = 'right'
    ctx.fillStyle = '#a5dcf2'
    ctx.font = 'bold 40px Consolas, monospace'
    ctx.fillText(`${voltage.toFixed(1)}V`, b.x0 + b.w - 42, 74)
    ctx.fillStyle = '#c3d6ee'
    ctx.font = '30px Consolas, monospace'
    ctx.fillText(`${capacity} mAh`, b.x0 + b.w - 42, 126)
    ctx.fillStyle = 'rgba(152,182,216,0.8)'
    ctx.font = '24px Consolas, monospace'
    ctx.fillText(`${((voltage * capacity) / 1000).toFixed(1)} Wh`, b.x0 + b.w - 42, 170)

    // 底部警示条
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(245,158,11,0.14)'
    ctx.fillRect(b.x0 + 42, 212, b.w - 84, 26)
    ctx.fillStyle = 'rgba(245,192,112,0.92)'
    ctx.font = '18px Consolas, monospace'
    ctx.fillText('DO NOT SHORT · HEAT · PUNCTURE', b.x0 + b.w / 2, 226)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/**
 * 卷绕带材几何体 —— 一段"极片 / 隔膜"
 *
 * 真实卷芯不是管子，而是一张张薄片卷起来的：极片沿螺旋方向延伸（弧长），
 * 在竖直方向有整个电芯的高度（h），径向只有几十微米厚（radOut − radIn）。
 * 所以横截面是"高 h × 厚 t"的竖长矩形，这里直接按 4 个侧面拉出这条带材。
 */
function ribbonArcGeo({ radIn, radOut, a0, a1, h, seg = 44 }) {
  const pos = []
  const idx = []
  const half = h / 2
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg)
    const c = Math.cos(a), s = Math.sin(a)
    // 每个角度采样点 4 个顶点：内下 / 外下 / 外上 / 内上
    pos.push(radIn * c, -half, radIn * s)
    pos.push(radOut * c, -half, radOut * s)
    pos.push(radOut * c, half, radOut * s)
    pos.push(radIn * c, half, radIn * s)
  }
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0]]
  for (let i = 0; i < seg; i++) {
    for (const [p, q] of EDGES) {
      const a = i * 4 + p, b = i * 4 + q, c2 = (i + 1) * 4 + q, d = (i + 1) * 4 + p
      idx.push(a, b, c2, a, c2, d)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/** 卷芯材质：双面，避免薄带材从内侧被剔除 */
function jellyRollMats() {
  const shell = { side: THREE.DoubleSide }
  return {
    cathode: new THREE.MeshStandardMaterial({ ...shell, color: PALETTE.cathode, roughness: 0.62, metalness: 0.12 }),
    anode: new THREE.MeshStandardMaterial({ ...shell, color: PALETTE.anode, roughness: 0.68, metalness: 0.16 }),
    separator: new THREE.MeshStandardMaterial({ ...shell, color: PALETTE.separator, roughness: 0.9, metalness: 0, transparent: true, opacity: 0.42 }),
    insulator: () => new THREE.MeshStandardMaterial({ color: 0x223050, roughness: 0.9 })
  }
}

/**
 * 卷芯（jelly-roll）—— 圆柱电芯内部
 *
 * 按真实叠层顺序卷绕：正极片 → 隔膜 → 负极片 → 隔膜，逐层向外推进。
 * 每层的起始角相对上一层推进一个固定角度，因为真实卷绕就是连续螺旋，
 * 而不是一圈圈同心圆。留出间隙是为了教学时能看清分层（X 光风格）。
 */
export function buildJellyRoll({ r = 1.0, h = 3.1, turns = 6 } = {}) {
  const g = new THREE.Group()
  const M = jellyRollMats()
  const layerGap = (r * 0.9 - r * 0.12) / (turns * 4)
  const layerT = layerGap * 0.74
  const H = h * 0.96
  for (let i = 0; i < turns * 4; i++) {
    const radIn = r * 0.12 + i * layerGap
    const mat = i % 4 === 0 ? M.cathode : i % 4 === 2 ? M.anode : M.separator
    const a0 = i * Math.PI * 0.42
    const geo = ribbonArcGeo({ radIn, radOut: radIn + layerT, a0, a1: a0 + Math.PI * 1.45, h: H })
    g.add(new THREE.Mesh(geo, mat))
  }
  // 上下绝缘垫
  const insMat = M.insulator()
  for (const y of [h / 2 - 0.03, -h / 2 + 0.03]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.05, 40), insMat)
    disc.position.y = y
    g.add(disc)
  }
  return g
}

/**
 * 极耳 + 集流体
 *
 * 真实结构：正极铝极耳从卷芯顶端引出、焊到顶盖；负极铜极耳从卷芯底端引出、焊到钢壳。
 * 两条极耳因此分处上下两端，且是竖直薄片，而不是躺在卷芯顶上的横条。
 */
export function buildTabs({ r = 1.0, h = 6.6, len = 1.1 } = {}) {
  const g = new THREE.Group()
  const alMat = new THREE.MeshStandardMaterial({ color: PALETTE.aluminium, roughness: 0.32, metalness: 0.95 })
  const cuMat = new THREE.MeshStandardMaterial({ color: PALETTE.copper, roughness: 0.34, metalness: 0.95 })
  const w = r * 0.4, th = 0.028
  const al = new THREE.Mesh(new THREE.BoxGeometry(w, len, th), alMat)
  al.position.set(r * 0.52, h / 2 + len / 2, 0)
  const cu = new THREE.Mesh(new THREE.BoxGeometry(w, len, th), cuMat)
  cu.position.set(-r * 0.52, -h / 2 - len / 2, 0)
  g.add(al, cu)
  return g
}

/**
 * Li⁺ / e⁻ 粒子系统 —— InstancedMesh + 预分配进度池
 * pathFn(progress01) -> Vector3（写入 pool.v3）
 */
export function buildParticleFlow({ count = 60, size = 0.09, color = PALETTE.li, pathFn, speed = 0.12 } = {}) {
  const geo = new THREE.SphereGeometry(size, 8, 8)
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }) // 自发光感
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  const data = []
  for (let i = 0; i < count; i++) data.push({ prog: i / count, jitter: Math.random() * 0.6 + 0.7 })

  function update(dt, dir = 1, active = true) {
    mesh.visible = active
    if (!active) return
    for (let i = 0; i < count; i++) {
      const p = data[i]
      p.prog += dir * speed * dt * p.jitter
      if (p.prog > 1) p.prog -= 1
      if (p.prog < 0) p.prog += 1
      pathFn(p.prog, pool.v3, i)
      pool.dummy.position.copy(pool.v3)
      const s = 0.85 + 0.3 * Math.sin(p.prog * Math.PI)
      pool.dummy.scale.setScalar(s)
      pool.dummy.updateMatrix()
      mesh.setMatrixAt(i, pool.dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  function dispose() { geo.dispose(); mat.dispose() }
  return { mesh, update, dispose }
}

/* ═══════════════ V3：独立形态模型（非缩放变形） ═══════════════ */

// 公共材质工厂（PBR 口径：金属靠反射，不靠自发光）
const MATS = {
  steel: () => new THREE.MeshStandardMaterial({ color: 0x9aa7ba, roughness: 0.3, metalness: 0.88 }),
  alu: () => new THREE.MeshStandardMaterial({ color: 0xb9c2cf, roughness: 0.34, metalness: 0.9 }),
  copper: () => new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.35, metalness: 0.92 }),
  aluLam: () => new THREE.MeshStandardMaterial({ color: 0xc7ccd6, roughness: 0.5, metalness: 0.45 }), // 铝塑膜：半金属哑光
  insulator: () => new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.9, metalness: 0.05 }),
  cathode: () => new THREE.MeshStandardMaterial({ color: PALETTE.cathode, roughness: 0.55, metalness: 0.15 }),
  anode: () => new THREE.MeshStandardMaterial({ color: PALETTE.anode, roughness: 0.6, metalness: 0.2 }),
  separator: () => new THREE.MeshStandardMaterial({ color: PALETTE.separator, roughness: 0.85, metalness: 0, transparent: true, opacity: 0.55 }),
  electrolyte: () => new THREE.MeshStandardMaterial({ color: 0x2563eb, transparent: true, opacity: 0.14, roughness: 0.25 })
}

function tagPart(mesh, partId, partLabel) {
  mesh.userData.partId = partId
  mesh.userData.partLabel = partLabel
  return mesh
}

/**
 * 方形电芯（铝壳 · 独立建模）
 * 部件：方壳 / 正极柱 / 负极极柱 / 安全阀 / 顶盖 / 绝缘件 / 叠片组 / 极耳汇流排
 */
export function buildPrismaticCell({ w = 2.3, d = 1.15, h = 3.5 } = {}) {
  const g = new THREE.Group()
  const shellMat = MATS.alu()
  const shell = tagPart(new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), shellMat), 'shell', '方形铝壳')
  shell.name = 'shell'
  g.add(shell)

  // 顶盖组件（可整体抬起的拆解组）
  const capGroup = new THREE.Group()
  capGroup.name = 'capGroup'
  const cap = tagPart(new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.1, d * 0.98), MATS.alu()), 'topCap', '顶盖')
  cap.position.y = h / 2
  capGroup.add(cap)
  const termMat = MATS.alu()
  const posT = tagPart(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.22, 24), termMat), 'posTerminal', '正极极柱')
  posT.position.set(-w * 0.26, h / 2 + 0.16, 0)
  const negT = tagPart(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.22, 24), MATS.copper()), 'negTerminal', '负极极柱')
  negT.position.set(w * 0.26, h / 2 + 0.16, 0)
  capGroup.add(posT, negT)
  // 安全阀（带刻痕的泄压片）
  const vent = tagPart(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), MATS.steel()), 'vent', '安全阀')
  vent.position.set(0, h / 2 + 0.08, 0)
  capGroup.add(vent)
  // 绝缘框
  const insFrame = tagPart(new THREE.Mesh(new THREE.BoxGeometry(w * 0.99, 0.05, d * 0.99), MATS.insulator()), 'insulator', '绝缘件')
  insFrame.position.y = h / 2 - 0.07
  capGroup.add(insFrame)
  g.add(capGroup)

  // 叠片组（剖视可见）
  const stack = new THREE.Group()
  stack.name = 'stack'
  const layers = 7
  for (let i = 0; i < layers; i++) {
    const z = (i - (layers - 1) / 2) * (d * 0.72 / layers)
    const mat = i % 3 === 1 ? MATS.separator() : (i % 3 === 0 ? MATS.cathode() : MATS.anode())
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, h * 0.82, d * 0.72 / layers * 0.62), mat)
    sheet.position.z = z
    stack.add(sheet)
  }
  // 极耳汇流排：连接叠片到两个极柱
  const bus = new THREE.Group()
  bus.name = 'busbar'
  const b1 = tagPart(new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, h * 0.5, 0.03), MATS.alu()), 'busbar', '铝极耳汇流排')
  b1.position.set(-w * 0.34, h * 0.1, 0); b1.rotation.z = 0.5
  const b2 = tagPart(new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, h * 0.5, 0.03), MATS.copper()), 'busbar2', '铜极耳汇流排')
  b2.position.set(w * 0.34, h * 0.1, 0); b2.rotation.z = -0.5
  bus.add(b1, b2)
  g.add(stack, bus)

  // 薄壁金属感：壳体边缘冲压圆角线
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x8f9aab, roughness: 0.4, metalness: 0.85 })
  for (const sy of [1, -1]) {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, 0.05, d * 1.01), edgeMat)
    ring.position.y = sy * (h / 2 - 0.02)
    g.add(ring)
  }

  g.userData.capGroup = capGroup
  g.userData.stack = stack
  g.userData.bus = bus
  return g
}

/**
 * 软包电芯（铝塑膜 · 独立建模）
 * 特征：铝塑膜袋体 / 四周热封边 / 顶部铜+铝两极耳 / 薄片叠片主体 / 可选鼓胀
 */
export function buildPouchCell({ w = 2.7, h = 3.5, t = 0.42 } = {}) {
  const g = new THREE.Group()
  const bodyGroup = new THREE.Group()
  bodyGroup.name = 'pouchBody'

  // 袋体（铝塑膜，哑光半金属）
  const film = tagPart(new THREE.Mesh(new THREE.BoxGeometry(w, h, t), MATS.aluLam()), 'pouchFilm', '铝塑复合膜')
  bodyGroup.add(film)

  // 四周热封边（宽度明显、颜色略深）
  const sealMat = new THREE.MeshStandardMaterial({ color: 0xaeb4bf, roughness: 0.62, metalness: 0.35 })
  const sealW = 0.16
  const seals = [
    [w, sealW, t + 0.03, 0, -h / 2 + sealW / 2, 0],
    [w, sealW, t + 0.03, 0, h / 2 - sealW / 2, 0],
    [sealW, h, t + 0.03, -w / 2 + sealW / 2, 0, 0],
    [sealW, h, t + 0.03, w / 2 - sealW / 2, 0, 0]
  ]
  seals.forEach(([sx, sy, sz, x, y, z], i) => {
    const s = tagPart(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), sealMat), 'seal', '热封边')
    s.position.set(x, y, z)
    s.userData.sealIdx = i
    bodyGroup.add(s)
  })

  // 顶部两片扁平极耳：一铜一铝
  const tabY = h / 2 + 0.24
  const tabCu = tagPart(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.03), MATS.copper()), 'tabPos', '正极极耳（铝）')
  tabCu.position.set(-w * 0.22, tabY, 0)
  const tabAl = tagPart(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.03), MATS.alu()), 'tabNeg', '负极极耳（铜）')
  tabAl.position.set(w * 0.22, tabY, 0)
  // 极耳根部封釉胶块
  const gumMat = new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.95 })
  const gumL = tagPart(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, t * 0.7), gumMat), 'tabSeal', '极耳封釉')
  gumL.position.set(-w * 0.22, h / 2 - 0.02, 0)
  const gumR = gumL.clone(); gumR.position.x = w * 0.22
  bodyGroup.add(tabCu, tabAl, gumL, gumR)

  // 层压褶皱：两条极浅的压痕条
  const creaseMat = new THREE.MeshStandardMaterial({ color: 0xb4bac4, roughness: 0.7, metalness: 0.3 })
  for (const cx of [-0.55, 0.5]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, h * 0.9, t + 0.015), creaseMat)
    c.position.set(cx * w, 0.1, 0)
    bodyGroup.add(c)
  }
  g.add(bodyGroup)

  // 内部叠片（剖视 / 拆解时显示）
  const stack = new THREE.Group()
  stack.name = 'pouchStack'
  const layers = 9
  for (let i = 0; i < layers; i++) {
    const zz = (i - (layers - 1) / 2) * (t * 0.78 / layers)
    const mat = i % 3 === 1 ? MATS.separator() : (i % 3 === 0 ? MATS.cathode() : MATS.anode())
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.86, t * 0.78 / layers * 0.6), mat)
    sheet.position.z = zz
    stack.add(sheet)
  }
  g.add(stack)
  stack.visible = false

  // 鼓胀交互：setSwell(0-1) 让袋体中部隆起
  g.userData.setSwell = (s) => {
    const bulge = 1 + s * 0.85
    film.scale.set(1 + s * 0.03, 1 + s * 0.02, bulge)
    stack.scale.set(1 + s * 0.02, 1 + s * 0.015, bulge * 0.92)
  }
  g.userData.stack = stack
  g.userData.bodyGroup = bodyGroup
  return g
}

/**
 * 紧密卷绕卷芯（V3：正极片—隔膜—负极片 交替密绕，替代粗管螺旋）
 */
export function buildTightJellyRoll({ r = 1.0, h = 3.1, turns = 6 } = {}) {
  const g = new THREE.Group()
  const M = jellyRollMats()
  const layers = turns * 4                  // 正极 / 隔膜 / 负极 / 隔膜 为一组
  const layerGap = (r * 0.88 - r * 0.1) / layers
  const layerT = layerGap * 0.86            // 层间只留很窄的缝：这是"紧密卷绕"版
  const H = h * 0.98
  for (let i = 0; i < layers; i++) {
    const radIn = r * 0.1 + i * layerGap
    const mat = i % 4 === 0 ? M.cathode : i % 4 === 2 ? M.anode : M.separator
    const a0 = i * Math.PI * 0.36
    const geo = ribbonArcGeo({ radIn, radOut: radIn + layerT, a0, a1: a0 + Math.PI * 1.62, h: H, seg: 56 })
    g.add(new THREE.Mesh(geo, mat))
  }
  // 中心卷针孔
  const holeRing = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.1, r * 0.022, 8, 28),
    M.separator
  )
  holeRing.rotation.x = Math.PI / 2
  g.add(holeRing)
  // 极耳：正极铝在顶端、负极铜在底端（真实引出方式）
  g.add(buildTabs({ r, h, len: Math.max(0.55, h * 0.16) }))
  // 上下绝缘垫
  const insMat = M.insulator()
  for (const y of [h / 2 - 0.03, -h / 2 + 0.03]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.05, 40), insMat)
    disc.position.y = y
    g.add(disc)
  }
  return g
}
export function buildAnodeParticles({ count = 150, radius = 1.5, height = 3.0, size = 0.1 } = {}) {
  const geo = new THREE.IcosahedronGeometry(size, 1)
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.anode, roughness: 0.55, metalness: 0.2, flatShading: true })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const colors = new Float32Array(count * 3)
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)

  const base = []
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const rr = Math.sqrt(Math.random()) * radius
    base.push({
      x: Math.cos(a) * rr, z: Math.sin(a) * rr,
      y: (Math.random() - 0.5) * height,
      s: 0.7 + Math.random() * 0.6,
      deadIdx: Math.floor(Math.random() * 100), // 预分配失活次序
      phase: Math.random() * Math.PI * 2
    })
  }
  const active = pool.color.set('#5f7a99').clone()
  const dead = new THREE.Color(PALETTE.dead)
  const stress = new THREE.Color('#8f6f4f') // 开裂前兆：偏向 SEI 黄褐

  function update(time, damage = { lamSeverity: 0, crackSeverity: 0 }) {
    const breathe = 1 + 0.03 * Math.sin(time * 1.6)
    for (let i = 0; i < count; i++) {
      const p = base[i]
      pool.dummy.position.set(p.x * breathe, p.y, p.z * breathe)
      pool.dummy.rotation.set(p.phase + time * 0.1, p.phase, 0)
      pool.dummy.scale.setScalar(p.s)
      pool.dummy.updateMatrix()
      mesh.setMatrixAt(i, pool.dummy.matrix)
      // 失活：lamSeverity 越大，越大比例的颗粒变灰
      const isDead = p.deadIdx / 100 < damage.lamSeverity
      pool.color.copy(isDead ? dead : active)
      // 部分活性颗粒在高压应力下微微偏色（开裂前兆）
      if (!isDead && p.deadIdx / 100 < damage.lamSeverity + damage.crackSeverity * 0.3) {
        pool.color.lerp(stress, 0.5)
      }
      mesh.setColorAt(i, pool.color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  function dispose() { geo.dispose(); mat.dispose() }
  return { mesh, update, dispose }
}
