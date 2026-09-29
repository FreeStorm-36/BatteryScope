// 共享 Three.js 场景助手 —— 预分配内存池（参考 enterprise-bms-digital-twin 的 GC 优化手法）
// V2.1：EffectComposer + UnrealBloomPass 真·辉光 + RoomEnvironment 环境反射 + ACES 色调映射
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

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
  dead: 0x64748b,        // 失活颗粒（灰）
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
  bloomThreshold = 0.86 // 阈值抬高：只有极亮点才泛光，普通高光不再发光
} = {}) {
  // bloomStrength <= 0 时完全跳过后期管线（兼容低稳定性 GPU / 驱动）
  const bloomEnabled = bloomStrength > 0
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(PALETTE.bg)
  scene.fog = new THREE.FogExp2(PALETTE.bg, 0.024)

  const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 200)
  camera.position.set(...cameraPos)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // 压低 DPR 减轻 GPU 负担（Bloom 场景实测易触发 context lost）
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

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.maxPolarAngle = Math.PI / 2 + 0.15
  controls.minDistance = 3
  controls.maxDistance = 30

  let disposed = false
  const onResize = () => {
    if (disposed || !container.clientWidth) return
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    composer?.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)

  function render() {
    if (disposed) return
    controls.update()
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
    controls.dispose()
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
    renderer.domElement.remove()
  }

  return { scene, camera, renderer, controls, composer, bloom, render, dispose }
}
