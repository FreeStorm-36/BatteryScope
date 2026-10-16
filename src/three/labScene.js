// 共享 Three.js 场景助手 —— 预分配内存池（参考 enterprise-bms-digital-twin 的 GC 优化手法）
// V2.1：EffectComposer + UnrealBloomPass 真·辉光 + RoomEnvironment 环境反射 + ACES 色调映射
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// 具名再导出：给"动态导入本模块"的调用方（HomeView 的首页展台）用。
// 原因：`const THREE = await import('three')` 拿到的是运行时命名空间对象，
// Rollup 无法静态分析它访问了哪些属性，于是整个 three 都会被保留 ——
// 实测这种写法让 three 块从 507 KB（tree-shaken）涨到 684 KB，
// 连 AudioListener / PositionalAudio 这种全站从不使用的部分也被打包进来。
// 走具名再导出，用途在编译期就是确定的，摇树重新生效。
export {
  Group, Mesh, MeshBasicMaterial, TorusGeometry, Clock,
  AdditiveBlending, DoubleSide
} from 'three'

export const pool = {
  dummy: new THREE.Object3D(),
  color: new THREE.Color(),
  v3: new THREE.Vector3(),
  v3b: new THREE.Vector3()
}

export const PALETTE = {
  bg: 0x0a0e1a,
  shell: 0x2a3448,       // 钢壳（蓝灰）
  capMetal: 0xc9d4e4,    // 铝端盖
  cathode: 0x6d5fc7,     // 正极（蓝紫）
  anode: 0x5f7a99,       // 负极（灰蓝）
  separator: 0xb9c4d6,   // 隔膜（浅灰）
  electrolyte: 0x1d4ed8, // 电解液
  li: 0x22d3ee,          // Li⁺（青）
  electron: 0x4da8ff,    // e⁻（蓝）
  copper: 0xd97757,      // 负极集流体（铜）
  aluminium: 0xbfc9d9,   // 正极集流体（铝）
  sei: 0xb45309,         // SEI 黄褐
  dead: 0x93a1b5,        // 失活颗粒（灰，与活性灰蓝拉开差距，否则"掉队"看不出来）
  dendrite: 0xe2e8f0     // 析锂银白
}

/**
 * 创建标准实验场景（深色 + 真·辉光 Bloom + 环境反射）
 * 返回 { scene, camera, renderer, controls, composer, render, dispose }
 */
export function createLabScene(container, {
  fov = 42,
  cameraPos = [0, 2.2, 9.5],
  bloomStrength = 0.2,
  bloomRadius = 0.32,  // 半径略大 + 强度压低：让高光柔和扩散，而非刺眼爆发
  bloomThreshold = 0.86, // 阈值抬高：只有极亮点才泛光，普通高光不再发光
  // 控制器覆盖项。传 false 表示该页面完全不创建 OrbitControls（首页展台靠程序化动画，
  // 不接受用户视角操作）；传对象则按字段覆盖下面的默认手感。
  controls: ctrlOptions = {}
} = {}) {
  // bloomStrength <= 0 时完全跳过后期管线（兼容低稳定性 GPU / 驱动）
  const bloomEnabled = bloomStrength > 0
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(PALETTE.bg)
  scene.fog = new THREE.FogExp2(PALETTE.bg, 0.024)

  const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 200)
  camera.position.set(...cameraPos)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  // 手机设备像素比通常是 3，全量渲染 + Bloom 对中低端机压力大，窄屏再压低一档
  // （画质肉眼差别很小，GPU 负担明显下降）。桌面维持 1.5。
  const dprOf = () => Math.min(window.devicePixelRatio, container.clientWidth < 768 ? 1.25 : 1.5)
  renderer.setPixelRatio(dprOf()) // 压低 DPR 减轻 GPU 负担（Bloom 场景实测易触发 context lost）
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  container.appendChild(renderer.domElement)

  // WebGL context lost 兜底：阻止默认行为，恢复后重建 composer，避免整页白屏
  let composer = null, bloom = null
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    console.warn('[BatteryScope] WebGL context lost — 等待恢复')
  })
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.warn('[BatteryScope] WebGL context restored — 重建后期处理管线')
    rebuildComposer()
  })

  // 环境反射：RoomEnvironment → PMREM，让金属壳/端盖有真实高光（强度压低保持深色氛围）
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture
  scene.environmentIntensity = 0.26

  // 灯光：低强度环境 + 主方向光 + 弱补光（总体强度下调，避免模型表面反光过亮）
  scene.add(new THREE.AmbientLight(0x334466, 0.55))
  const key = new THREE.DirectionalLight(0xbfd8ff, 0.85)
  key.position.set(5, 8, 6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x22d3ee, 0.5)
  rim.position.set(-6, 3, -5)
  scene.add(rim)
  const glowA = new THREE.PointLight(0x4da8ff, 5.5, 40)
  glowA.position.set(-4, 2.5, 4)
  scene.add(glowA)
  const glowB = new THREE.PointLight(0x22d3ee, 3.5, 40)
  glowB.position.set(4, -2, -3)
  scene.add(glowB)
  // 正面柔光（相机方向冷色补光，保证主体可读性）
  const fill = new THREE.DirectionalLight(0x8fb8ff, 0.32)
  fill.position.set(0, 1.5, 9)
  scene.add(fill)

  // 地面网格标尺（实验室氛围）
  const grid = new THREE.GridHelper(60, 60, 0x1d3a5f, 0x122036)
  grid.position.y = -3.2
  grid.material.transparent = true
  grid.material.opacity = 0.32
  scene.add(grid)

  // 后期处理：Render → UnrealBloom → Output（ACES + sRGB 在 OutputPass 完成）
  // Bloom 内部分辨率减半：视觉几乎无损，GPU 负担显著下降
  function rebuildComposer() {
    if (!bloomEnabled) return
    if (composer) composer.dispose()
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(
      new THREE.Vector2(Math.max(2, container.clientWidth >> 1), Math.max(2, container.clientHeight >> 1)),
      bloomStrength, bloomRadius, bloomThreshold
    )
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    composer.setSize(container.clientWidth, container.clientHeight)
  }
  rebuildComposer()

  // 默认手感：只允许小幅旋转观察。
  // 早期版本是 minDistance 3 / maxDistance 30 且 zoomSpeed 1，滚轮一格就把相机推到模型脸上，
  // 表现为"一拖动就放的特别大"。所以默认值收紧：关缩放、关平移、旋转放慢。
  //
  // ⚠️ 默认值不是禁令。**需要"细看"的教学页（如结构页 TypesView）应当显式打开
  // enableZoom / enablePan**，并配 zoomSpeed≈0.4、minDistance≥4 ——
  // "一格贴脸"的根因是 minDistance 太小 + zoomSpeed 太大，不是"开了缩放"本身。
  const o = {
    enabled: true,
    enableZoom: false,        // 标本展台默认不可推拉；细看类页面自行打开
    zoomSpeed: 0.5,
    enablePan: false,
    panSpeed: 0.8,
    screenSpacePanning: true, // 平移跟随屏幕平面，比默认的垂直平面符合直觉
    enableRotate: true,
    rotateSpeed: 0.62,        // 放慢旋转，避免轻轻一拽就转半圈
    autoRotate: false,
    autoRotateSpeed: 0.6,
    dampingFactor: 0.055,     // 兼顾"跟手"与不飘
    minDistance: 6,
    maxDistance: 16,
    minPolarAngle: Math.PI * 0.22,
    maxPolarAngle: Math.PI * 0.72,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    target: [0, 0, 0],
    ...(ctrlOptions === false ? {} : ctrlOptions)
  }
  const ctrl = ctrlOptions === false ? null : new OrbitControls(camera, renderer.domElement)
  if (ctrl) {
    ctrl.enabled = o.enabled
    ctrl.enableDamping = true
    ctrl.dampingFactor = o.dampingFactor
    ctrl.rotateSpeed = o.rotateSpeed
    ctrl.zoomSpeed = o.zoomSpeed
    ctrl.enableZoom = o.enableZoom
    ctrl.enablePan = o.enablePan
    ctrl.panSpeed = o.panSpeed
    ctrl.screenSpacePanning = o.screenSpacePanning
    ctrl.enableRotate = o.enableRotate
    ctrl.autoRotate = o.autoRotate
    ctrl.autoRotateSpeed = o.autoRotateSpeed
    ctrl.minDistance = o.minDistance
    ctrl.maxDistance = o.maxDistance
    ctrl.minPolarAngle = o.minPolarAngle
    ctrl.maxPolarAngle = o.maxPolarAngle
    ctrl.minAzimuthAngle = o.minAzimuthAngle
    ctrl.maxAzimuthAngle = o.maxAzimuthAngle
    ctrl.target.set(...o.target)
    ctrl.update()
  }

  // 触屏滚动穿透：OrbitControls 构造时会把 canvas 的 touch-action 设成 'none'，
  // 于是手指在舞台上纵向滑动不会滚动页面 —— 手机上舞台占了大半屏，
  // 用户想在画面上翻页，实际一直在转模型（"划不动"）。窄屏改成 'pan-y'：
  // 纵向滑动交还浏览器翻页，横向滑动照旧旋转模型，双指仍可缩放平移。
  // ⚠️ 必须是 none，不能按屏幕宽度切成 'pan-y'。
  // 原先窄屏下写 'pan-y'，本意是"一指控页、双指操作模型"；但 pan-y 会把**竖向**手势
  // 判给浏览器滚动，画布只拿得到横向分量 —— 表现就是"能左右转、不能上下转"，
  // 而上下恰恰是看顶盖与底盖必须的那一个自由度。
  // 页面滚动改由画布以外的区域承担（舞台只有 280—530 px 高，画布之外还有大量内容）。
  renderer.domElement.style.touchAction = 'none'

  let disposed = false
  const onResize = () => {
    if (disposed || !container.clientWidth) return
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(dprOf())
    renderer.setSize(container.clientWidth, container.clientHeight)
    composer?.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  // window.resize 在进入/退出全屏时并不总会触发，单靠它同步会留下尺寸错位的窗口；
  // 这里改用 ResizeObserver 直接盯容器，任何尺寸变化（全屏、分栏折叠、旋转屏幕）都能跟上。
  let ro = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(onResize)
    ro.observe(container)
  }

  function render() {
    if (disposed) return
    ctrl?.update()
    try {
      if (bloomEnabled) composer.render()
      else renderer.render(scene, camera)
    } catch (err) {
      // GPU 异常时降级为直接渲染（无 Bloom），保证页面不死
      try { renderer.render(scene, camera) } catch (_) { /* 本帧跳过 */ }
    }
  }

  function dispose() {
    disposed = true
    window.removeEventListener('resize', onResize)
    ro?.disconnect()
    ctrl?.dispose()
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => m.dispose())
      }
    })
    pmrem.dispose()
    composer.dispose()
    renderer.dispose()
    // 浏览器同时可存的 WebGL context 只有十几个，而 renderer.dispose() 只是释放了
    // three 自己持有的资源，context 要等 GC 才真正归还。全站有 4 个 3D 页面，
    // 章节组件又带 :key 每次换章都会整体重建 —— 在 context 归还跟不上创建速度时，
    // 浏览器会丢弃最老的 context（表现为某个页面的 3D 突然变黑）。
    // 显式交还，让 context 立刻释放。
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }

  return { scene, camera, renderer, controls: ctrl, composer, bloom, render, dispose }
}
