// 电芯 3D 模型工厂 —— 全部程序化建模（无需 Blender 资产）
// 手法参考 enterprise-bms-digital-twin：InstancedMesh 粒子 + 预分配 + MeshBasicMaterial 自发光 + PointLight 辉光
import * as THREE from 'three'
import { PALETTE, pool } from './labScene.js'

/**
 * 圆柱电芯外壳（18650 / 21700 通用，单位约 1:10 比例）
 * 返回 Group：shellBody / positiveCap / negativeCap / wrap（标签热缩膜）
 */
export function buildCylindricalCell({ r = 1.05, h = 3.5, label = '21700' } = {}) {
  const g = new THREE.Group()

  const shellMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shell, roughness: 0.32, metalness: 0.85,
    emissive: 0x0c1626, emissiveIntensity: 0.5
  })
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, false), shellMat)
  body.name = 'shellBody'
  g.add(body)

  const capMat = new THREE.MeshStandardMaterial({ color: PALETTE.capMetal, roughness: 0.25, metalness: 0.95 })
  const posCap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.985, r * 0.985, 0.09, 48), capMat)
  posCap.position.y = h / 2 + 0.045
  posCap.name = 'positiveCap'
  g.add(posCap)

  // 正极端子（凸起小圆盘）
  const terminal = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.36, r * 0.36, 0.1, 32), capMat)
  terminal.position.y = h / 2 + 0.12
  terminal.name = 'terminal'
  g.add(terminal)

  const negCap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.985, r * 0.985, 0.09, 48), capMat)
  negCap.position.y = -h / 2 - 0.045
  negCap.name = 'negativeCap'
  g.add(negCap)

  // 顶部防爆阀刻痕环
  const ventRing = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.55, 0.012, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x8a94a8, roughness: 0.5, metalness: 0.8 })
  )
  ventRing.rotation.x = Math.PI / 2
  ventRing.position.y = h / 2 + 0.095
  g.add(ventRing)

  // 热缩膜标签（略大于壳，带型号文字 canvas 纹理）
  const labelTex = makeLabelTexture(label, r, h)
  const wrap = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.005, r * 1.005, h * 0.86, 48, 1, true),
    new THREE.MeshStandardMaterial({
      map: labelTex, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.96,
      emissive: 0xffffff, emissiveMap: labelTex, emissiveIntensity: 0.22 // 标签微光背照
    })
  )
  wrap.name = 'wrap'
  g.add(wrap)

  g.userData.radius = r
  g.userData.height = h
  return g
}

function makeLabelTexture(label, r, h) {
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 256
  const ctx = c.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#22385f'); grad.addColorStop(1, '#14223c')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 256)
  // 细线标尺装饰
  ctx.strokeStyle = 'rgba(77,168,255,0.25)'; ctx.lineWidth = 2
  for (let x = 40; x < 1024; x += 60) { ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x, 40); ctx.stroke() }
  ctx.fillStyle = '#dbeeff'
  ctx.font = 'bold 92px Consolas, monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, 512, 128)
  ctx.fillStyle = 'rgba(139,152,176,0.9)'
  ctx.font = '36px Consolas, monospace'
  ctx.fillText('BS-01 · CONCEPT CELL', 512, 210)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * 卷芯（jelly-roll 螺旋）—— 圆柱电芯内部
 * 用一圈圈交替的薄板近似螺旋卷绕结构
 */
export function buildJellyRoll({ r = 1.0, h = 3.1, turns = 5 } = {}) {
  const g = new THREE.Group()
  const cathodeMat = new THREE.MeshStandardMaterial({ color: PALETTE.cathode, roughness: 0.55, metalness: 0.15, emissive: 0x1a1545, emissiveIntensity: 0.5 })
  const anodeMat = new THREE.MeshStandardMaterial({ color: PALETTE.anode, roughness: 0.6, metalness: 0.2 })
  const sepMat = new THREE.MeshStandardMaterial({ color: PALETTE.separator, roughness: 0.85, metalness: 0.0, transparent: true, opacity: 0.5 })

  const thickness = r / (turns * 2 + 1)
  for (let i = 0; i < turns * 2; i++) {
    const mat = i % 2 === 0 ? cathodeMat : anodeMat
    const rad = thickness * (i + 1)
    const arc = (i + 1) * Math.PI * 0.9
    const pts = []
    for (let a = 0; a <= arc; a += 0.12) pts.push(new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad))
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, 0, p.y)))
    const geo = new THREE.TubeGeometry(curve, 48, thickness * 0.42, 6, false)
    const mesh = new THREE.Mesh(geo, i % 3 === 2 ? sepMat : mat)
    g.add(mesh)
  }
  // 中心轴
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness * 1.4, thickness * 1.4, h, 16),
    sepMat
  )
  g.add(core)
  // 上下绝缘垫
  const insMat = new THREE.MeshStandardMaterial({ color: 0x223050, roughness: 0.9 })
  for (const y of [h / 2 - 0.03, -h / 2 + 0.03]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.05, 40), insMat)
    disc.position.y = y
    g.add(disc)
  }
  return g
}

/**
 * 极耳 + 集流体（爆炸拆解用小零件）
 */
export function buildTabs() {
  const g = new THREE.Group()
  const alMat = new THREE.MeshStandardMaterial({ color: PALETTE.aluminium, roughness: 0.35, metalness: 0.9 })
  const cuMat = new THREE.MeshStandardMaterial({ color: PALETTE.copper, roughness: 0.35, metalness: 0.9 })
  const al = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.22), alMat)
  al.position.set(0.3, 0.18, 0)
  const cu = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.22), cuMat)
  cu.position.set(-0.3, -0.18, 0)
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
export function buildTightJellyRoll({ r = 1.0, h = 3.1, turns = 9 } = {}) {
  const g = new THREE.Group()
  const cathodeMat = MATS.cathode()
  const anodeMat = MATS.anode()
  const sepMat = MATS.separator()
  const thickness = (r * 0.92) / (turns * 2)
  for (let i = 0; i < turns * 2; i++) {
    const mat = i % 2 === 0 ? cathodeMat : anodeMat
    const rad = thickness * (i + 1)
    const arc = (i + 1) * Math.PI * 1.05
    const pts = []
    for (let a = 0; a <= arc; a += 0.1) pts.push(new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad))
    const curve = new THREE.CatmullRomCurve3(pts)
    const geo = new THREE.TubeGeometry(curve, 64, thickness * 0.38, 5, false)
    const mesh = new THREE.Mesh(geo, i % 4 === 2 ? sepMat : mat)
    g.add(mesh)
  }
  // 中心孔（卷针轴心留空）
  const holeRing = new THREE.Mesh(
    new THREE.TorusGeometry(thickness * 1.1, thickness * 0.5, 8, 24),
    sepMat
  )
  holeRing.rotation.x = Math.PI / 2
  g.add(holeRing)
  // 极耳（从卷芯顶部引出）
  const tabs = buildTabs()
  tabs.position.y = h / 2 - 0.1
  g.add(tabs)
  // 上下绝缘垫
  const insMat = MATS.insulator()
  for (const y of [h / 2 - 0.03, -h / 2 + 0.03]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.05, 40), insMat)
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
