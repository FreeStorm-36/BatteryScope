<template>
  <main class="home">
    <canvas ref="bgCanvas" class="bg-canvas"></canvas>
    <div class="vignette"></div>

    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">BATTERYSCOPE · LITHIUM LIFE EXPLORER</p>
        <h1>看见一块电池<br /><span>从结构到寿命的一生</span></h1>
        <p class="lead">
          以同一块概念标本 <b>BS-01</b> 为主角，沿“结构—工作—老化—数据—模型—预测”
          逐层理解锂离子电池，而不是只看一条结果曲线。
        </p>
        <div class="hero-actions">
          <router-link to="/types" class="btn-primary cta">
            开始观察
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>
          </router-link>
          <router-link to="/datalab" class="btn-ghost data-link">查看真实数据</router-link>
        </div>
        <p class="object-tag">
          <span class="live-dot"></span>
          当前观察对象 <b class="num">BS-01</b>
          <span>概念标本 · 演示读数</span>
          <span class="num">SOC {{ soc.toFixed(0) }}%</span>
          <span class="num">{{ temp.toFixed(1) }} ℃</span>
        </p>

        <div class="hero-metrics" aria-label="项目概览">
          <div v-for="m in metrics" :key="m.label">
            <strong class="num">{{ m.value }}</strong>
            <span>{{ m.label }}</span>
          </div>
        </div>
      </div>

      <div ref="stage" class="observation-stage" @mousemove="onParallax">
        <div class="stage-head">
          <span><i></i> BS-01 生命观测台</span>
          <b class="num">CONCEPT · 演示读数</b>
        </div>
        <div class="stage-inner" :style="parallaxStyle">
          <div ref="threeBox" class="three-box"></div>
          <div class="scanline"></div>
          <transition-group name="scan" tag="div" class="scan-tags">
            <span v-for="t in visibleTags" :key="t.k" class="scan-tag num" :style="t.pos">{{ t.text }}</span>
          </transition-group>
        </div>
        <aside class="console">
          <div class="console-title">
            <span>状态快照</span>
            <i class="num">SPECIMEN 01</i>
          </div>
          <dl>
            <div><dt>外形</dt><dd>圆柱 26650 · Φ26×65 mm</dd></div>
            <div><dt>化学体系</dt><dd>NMC · 概念设定</dd></div>
            <div><dt>状态</dt><dd class="healthy">健康观测</dd></div>
            <div><dt>读数性质</dt><dd>演示数值 · 非实时测量</dd></div>
            <div><dt>边界</dt><dd>非 NASA B0005 实体</dd></div>
          </dl>
        </aside>
        <p class="stage-note">按住拖动可环视电芯 · 松手后继续缓缓回转 · 扫描标签用于教学演示</p>
      </div>
    </section>

    <section class="journey">
      <div class="section-head">
        <div>
          <p class="chapter-eyebrow">ONE OBJECT · FOUR QUESTIONS</p>
          <h2>沿一条生命线，回答四个关键问题</h2>
        </div>
        <p>从看得见的结构进入看不见的机制，最后回到可验证的数据与预测。</p>
      </div>
      <div class="journey-grid">
        <router-link v-for="(item, i) in journey" :key="item.to" :to="item.to" class="journey-card">
          <span class="step num">0{{ i + 1 }}</span>
          <span class="card-icon" v-html="item.icon"></span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
          <b>{{ item.link }} <i>→</i></b>
        </router-link>
      </div>
      <div class="evidence-boundary">
        <span class="boundary-mark">E</span>
        <div>
          <b>证据边界</b>
          <p>BS-01 用于解释结构与机理；NASA B0005/B0006/B0007/B0018 用于真实数据分析；模型输出仅在完成实际计算后展示。</p>
        </div>
        <router-link to="/datalab">进入数据实验室 →</router-link>
      </div>
    </section>

    <!-- 首页不是 flex 容器（它是 position:relative 的自定义布局），
         所以这里必须自带一层带宽度与间距的容器，不能靠父级 gap。 -->
    <div class="home-goals">
      <ChapterGoals :chapter="1" />
    </div>

    <ChapterFooter conclusion="同一观察对象将贯穿结构、工作、老化、真实数据与预测方法，避免把概念演示误认为实验结果。" />
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import ChapterFooter from '../components/ChapterFooter.vue'
import ChapterGoals from '../components/ChapterGoals.vue'

// ⚠️ three / labScene / batteryModel 一律不做静态导入。
// 首页是 main.js 里唯一被同步引入的视图，一旦在这里静态 import 'three'，
// 整包 three（约 508 KB 原始 / 128 KB gzip）会被写进 index.html 的 modulepreload，
// 直接变成首屏关键路径上最大的一块 —— 而它只服务右侧那个装饰性展台。
// 改成动态导入后，首屏先出 DOM 与 2D 背景，three 在后台并行下载。

const bgCanvas = ref(null)
const threeBox = ref(null)
const stage = ref(null)
const soc = ref(78.4)
const temp = ref(24.6)
const visibleTags = ref([])
const parallaxStyle = ref({})

const metrics = [
  // 这里必须与实际章节数一致（tour.js 的 chapters 长度）。
  // 2026-10-15 新增第 08 章「学习地图与资料来源」后由 07 改为 08 ——
  // 首页自述数字对不上，是这类作品最容易露怯的地方。
  { value: '08', label: '连续章节' },
  { value: '04', label: '真实电池样本' },
  { value: '03', label: '同任务模型路线' },
  { value: '80%', label: '教学参考线' }
]

const journey = [
  {
    to: '/types', title: '里面有什么？', link: '观察结构',
    text: '拆解圆柱、方形与软包电芯，区分外形、内部层级与化学体系。',
    icon: '<svg viewBox="0 0 32 32"><rect x="9" y="5" width="14" height="22" rx="6"/><path d="M13 3h6M12 12h8M12 17h8M12 22h5"/></svg>'
  },
  {
    to: '/principle', title: '能量怎样流动？', link: '进入实验台',
    text: '切换充电、放电、静置与开路状态，分别追踪 Li⁺ 与电子路径。',
    icon: '<svg viewBox="0 0 32 32"><path d="M6 19h7l3-12v18l4-12h6"/><circle cx="6" cy="19" r="2"/><circle cx="26" cy="13" r="2"/></svg>'
  },
  {
    to: '/aging', title: '为什么会衰老？', link: '观察损伤',
    text: '把循环进度映射到 SEI、锂损失、裂纹与阻抗等多尺度机制。',
    icon: '<svg viewBox="0 0 32 32"><path d="M6 22c4-8 7-4 10-10s6-2 10-7"/><path d="M7 26h19M10 9l4 4-3 4 5 4"/></svg>'
  },
  {
    to: '/prediction', title: '还能用多久？', link: '比较模型',
    text: '在同一任务下比较经验、数据驱动与物理信息方法的输入与依据。',
    icon: '<svg viewBox="0 0 32 32"><path d="M6 25V8m0 17h21"/><path d="m9 21 5-5 4 2 7-9"/><circle cx="25" cy="9" r="2"/></svg>'
  }
]

const TAGS = [
  { k: 'model', text: 'OBJECT  BS-01', pos: { top: '15%', left: '7%' } },
  { k: 'soc', text: 'SOC  78.4%', pos: { top: '33%', right: '6%' } },
  { k: 'volt', text: 'V  3.72 V', pos: { top: '59%', left: '5%' } },
  { k: 'temp', text: 'T  24.6 ℃', pos: { top: '76%', right: '8%' } }
]

let scene = null
let raf = 0
let tagTimer = null
let readingTimer = null
let ctx = null
let bgRaf = 0
// three 是异步下载的：组件可能在下载完成前就被卸载，用它来放弃迟到的挂载。
let disposed = false
const dots = []
const mouse = { x: 0, y: 0 }

const fit = () => {
  const c = bgCanvas.value
  if (!c) return
  c.width = innerWidth
  c.height = innerHeight
}

onMounted(async () => {
  gsap.from('.home .eyebrow', { opacity: 0, y: 16, duration: 0.65, delay: 0.05 })
  gsap.from('.home h1', { opacity: 0, y: 28, duration: 0.85, delay: 0.18 })
  gsap.from('.home .lead', { opacity: 0, y: 18, duration: 0.75, delay: 0.38 })
  gsap.from('.home .hero-actions', { opacity: 0, y: 14, duration: 0.65, delay: 0.55 })
  gsap.from('.home .hero-metrics > div', { opacity: 0, y: 14, duration: 0.55, stagger: 0.08, delay: 0.72 })

  let ti = 0
  const cycleTags = () => {
    ti = (ti + 1) % (TAGS.length + 2)
    visibleTags.value = TAGS.slice(0, Math.min(ti, TAGS.length))
  }
  cycleTags()
  tagTimer = setInterval(cycleTags, 2200)
  readingTimer = setInterval(() => {
    soc.value = 78.4 + Math.sin(Date.now() / 3000) * 0.3
    temp.value = 24.6 + Math.sin(Date.now() / 5200) * 0.2
  }, 800)

  const canvas = bgCanvas.value
  ctx = canvas.getContext('2d')
  fit()
  window.addEventListener('resize', fit)
  for (let i = 0; i < 34; i++) {
    dots.push({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 0.5 + Math.random() * 1.2, vy: 0.08 + Math.random() * 0.22,
      vx: (Math.random() - 0.5) * 0.12, o: 0.06 + Math.random() * 0.13
    })
  }
  const bgLoop = () => {
    bgRaf = requestAnimationFrame(bgLoop)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const d of dots) {
      d.y -= d.vy
      d.x += d.vx
      if (d.y < -4) { d.y = canvas.height + 4; d.x = Math.random() * canvas.width }
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(77,168,255,${d.o})`
      ctx.fill()
    }
  }
  bgLoop()

  // 3D 展台刻意放在最后：three 走动态导入，下载期间上面的 2D 背景与计时器已经在跑，
  // 首屏不会为了一个装饰性展台而空着。
  if (threeBox.value) {
    const [
      { createLabScene, PALETTE, Group, Mesh, MeshBasicMaterial, TorusGeometry, Clock, AdditiveBlending, DoubleSide },
      { buildCylindricalCell, buildParticleFlow }
    ] = await Promise.all([
      import('../three/labScene.js'),
      import('../three/batteryModel.js')
    ])
    // 下载期间用户可能已经切到别的章节，此时 threeBox 已卸载，直接放弃挂载。
    // 注意这里必须用 return 而不是 if 包住下面 —— 否则迟到的挂载会往已销毁的容器里塞 canvas。
    if (!threeBox.value || disposed) return

    // 首页展台：**开放旋转（可拖动环视）**，但关闭缩放与平移。
    // 旧版的问题是 minDistance 3 + zoomSpeed 1：滚轮一格相机就贴到模型上，
    // 那才是用户说的"一拖动就放的特别大"。所以这里保留视野缩放关闭、只留旋转。
    // autoRotate 交给 OrbitControls 自己管：拖拽时它自动停，松手后继续缓缓回转，
    // 比"模型自转 + 相机也动"更稳 —— 两个旋转源同时跑会互相打架。
    scene = createLabScene(threeBox.value, {
      cameraPos: [0, 0.2, 16.4], fov: 33,
      controls: {
        enableRotate: true, enableZoom: false, enablePan: false,
        autoRotate: true, autoRotateSpeed: 0.5,
        minDistance: 14, maxDistance: 19,
        minPolarAngle: Math.PI * 0.32, maxPolarAngle: Math.PI * 0.66,
        target: [-1.15, 0, 0]   // 绕电池本体旋转（标本被左移到 x = -1.15）
      }
    })
    const specimen = new Group()
    // 整体左移：右下角有「状态快照」浮层，电池居中时其右侧会被浮层压住
    specimen.position.x = -1.15
    scene.scene.add(specimen)

    // 真实规格圆柱电芯：26650 = Φ26 × 65 mm（1 unit = 10 mm），不做非等比变形。
    // 由 21700 改为 26650：同为真实标称规格，直径粗 24%、高径比 3.33→2.50，
    // 在首页这块横向画框里不再是一根细长的签子；且容量仍在 5000 mAh 量级，
    // 全站"1C = 5.0 A"的推导不受影响。
    const CELL_H = 6.5
    const HALF = CELL_H / 2
    const cell = buildCylindricalCell({ format: '26650', brand: 'BS-01', voltage: 3.6, capacity: 5000 })
    specimen.add(cell)

    // 展台底座：双层光环，做极缓慢的呼吸
    const ringMat = new MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.34 })
    const ring = new Mesh(new TorusGeometry(2.35, 0.012, 8, 128), ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = -HALF - 0.5
    ring.scale.z = 0.78
    specimen.add(ring)

    const ringInner = new Mesh(
      new TorusGeometry(3.15, 0.006, 8, 128),
      new MeshBasicMaterial({ color: 0x4da8ff, transparent: true, opacity: 0.15 })
    )
    ringInner.rotation.x = Math.PI / 2
    ringInner.position.y = -HALF - 0.5
    ringInner.scale.z = 0.78
    specimen.add(ringInner)
    gsap.to(ringMat, { opacity: 0.1, duration: 3.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // 光带扫描：一条细环沿轴向缓慢上移，两端用 sin 包络淡出，避免循环时"跳回"
    const sweepMat = new MeshBasicMaterial({
      color: 0x7fe6ff, transparent: true, opacity: 0,
      blending: AdditiveBlending, depthWrite: false, side: DoubleSide
    })
    const sweep = new Mesh(new TorusGeometry(1.075, 0.007, 8, 96), sweepMat)
    sweep.rotation.x = Math.PI / 2
    specimen.add(sweep)

    // Li⁺ 粒子：贴着壳身缓慢螺旋上升，幅度收敛，不与主体抢视觉
    const liFlow = buildParticleFlow({
      count: 26, color: PALETTE.li, size: 0.05, speed: 0.085,
      pathFn: (t, v, i) => {
        const a = i * 2.399 + t * 2.6
        const rr = 1.42 + 0.26 * Math.sin(t * 6.2 + i)
        v.set(Math.cos(a) * rr, (t - 0.5) * 8.2, Math.sin(a) * rr)
      }
    })
    specimen.add(liFlow.mesh)

    const clock = new Clock()
    let sweepT = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(clock.getDelta(), 0.05)

      // 电池本体不再自转：旋转交给 OrbitControls（autoRotate）驱动相机。
      // 这样用户拖动时是"观察者在绕行"，扫掠光带与 Li⁺ 粒子相对电芯的位置关系保持物理上合理。

      sweepT = (sweepT + dt * 0.15) % 1
      sweep.position.y = -HALF + sweepT * CELL_H
      sweepMat.opacity = Math.sin(sweepT * Math.PI) * 0.42

      liFlow.update(dt, 1, true)
      // 注意：这里不能再写 camera.position —— OrbitControls 每帧用球坐标重算相机位置，
      // 手动覆写会和它打架（表现为抖动/被拽回）。视差只留给 DOM 浮层（parallaxStyle）。
      scene.render()
    }
    loop()
  }

})

function onParallax(e) {
  const r = stage.value.getBoundingClientRect()
  mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2
  mouse.y = -((e.clientY - r.top) / r.height - 0.5) * 2
  parallaxStyle.value = { transform: `translate(${mouse.x * 4}px, ${mouse.y * 3}px)` }
}

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(raf)
  cancelAnimationFrame(bgRaf)
  clearInterval(tagTimer)
  clearInterval(readingTimer)
  window.removeEventListener('resize', fit)
  if (scene) scene.dispose()
})
</script>

<style scoped lang="scss">
.home { position: relative; min-height: 100vh; overflow: clip; }
/* 首页的学习目标容器：宽度与 .journey 对齐（1240），自带上下间距。
   它属于"内容之后、页脚之前"的位置，不影响首屏预算。 */
.home-goals {
  position: relative; z-index: 2;
  width: min(1240px, calc(100% - 80px)); margin: 26px auto 40px;
}
.bg-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.vignette {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(ellipse 70% 58% at 72% 28%, rgba(37, 99, 235, 0.13), transparent 62%);
}
.hero {
  position: relative; z-index: 2; width: min(1320px, calc(100% - 80px)); min-height: 100vh; margin: 0 auto;
  padding: 128px 0 60px; display: grid; grid-template-columns: minmax(0, .98fr) minmax(480px, 1.02fr);
  gap: clamp(34px, 4.4vw, 72px); align-items: center;
}
.hero-copy { padding-top: 20px; }
.eyebrow { color: var(--cyan); font-size: 11px; font-weight: 600; letter-spacing: .27em; }
h1 {
  margin-top: 16px; color: var(--text-1); font-size: clamp(33px, 3.7vw, 52px); line-height: 1.24;
  letter-spacing: -.028em; font-weight: 700;
  span { display: inline-block; color: #9dbde8; font-weight: 520; }
}
.lead {
  max-width: 600px; margin: 25px 0 31px; color: var(--text-2); font-size: 16px; line-height: 1.95;
  b { color: var(--text-1); }
}
.hero-actions { display: flex; align-items: center; gap: 12px; }
.cta { text-decoration: none; svg { width: 19px; fill: none; stroke: currentColor; stroke-width: 1.5; } }
.data-link { padding: 12px 23px; color: var(--text-1); text-decoration: none; }
.object-tag {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 13px; margin-top: 26px;
  color: var(--text-3); font-size: 11.5px;
  b { color: var(--cyan); }
  span:not(.live-dot) { padding-left: 13px; border-left: 1px solid var(--hairline); }
}
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 7px rgba(34, 211, 238, 0.55); animation: blink 2s infinite; }
@keyframes blink { 50% { opacity: .35; } }
.hero-metrics {
  display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 38px; border-top: 1px solid var(--hairline);
  > div { padding: 18px 12px 0 0; }
  strong { display: block; color: var(--text-1); font-size: 23px; font-weight: 520; }
  span { color: var(--text-3); font-size: 10.5px; letter-spacing: .04em; }
}
.observation-stage {
  position: relative; height: min(556px, 64vh); min-height: 452px; overflow: hidden;
  border: 1px solid rgba(90, 150, 220, .24); border-radius: 24px;
  background:
    linear-gradient(rgba(73, 120, 190, .05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(73, 120, 190, .05) 1px, transparent 1px),
    radial-gradient(circle at 50% 43%, rgba(50, 110, 200, .16), transparent 42%),
    rgba(10, 14, 26, .78);
  background-size: 34px 34px, 34px 34px, auto, auto;
  box-shadow: 0 34px 80px rgba(0, 8, 20, .45);
}
.stage-head {
  position: absolute; z-index: 5; inset: 0 0 auto; height: 50px; padding: 0 20px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--hairline); background: rgba(11, 16, 28, .74);
  span { display: inline-flex; align-items: center; gap: 9px; color: var(--text-2); font-size: 12px; }
  span i { width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); }
  b { color: var(--text-3); font-size: 9.5px; font-weight: 500; letter-spacing: .1em; }
}
.stage-inner { position: absolute; inset: 50px 0 0; transition: transform .22s ease-out; }
.three-box { position: absolute; inset: 0; cursor: grab; }
.three-box:active { cursor: grabbing; }
.scanline {
  position: absolute; left: 8%; right: 8%; top: 8%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(34,211,238,.6), transparent);
  animation: scan 5.4s ease-in-out infinite; pointer-events: none;
}
@keyframes scan { 0%, 100% { top: 9%; opacity: 0; } 12%, 88% { opacity: 1; } 50% { top: 79%; } }
.scan-tags { position: absolute; inset: 0; pointer-events: none; }
.scan-tag {
  position: absolute; padding: 4px 9px; border-left: 1px solid var(--cyan);
  background: rgba(8, 13, 26, .6); color: #7dd8f5; font-size: 10px; letter-spacing: .04em;
}
.scan-enter-active, .scan-leave-active { transition: all .4s ease; }
.scan-enter-from, .scan-leave-to { opacity: 0; transform: translateY(6px); }
.console {
  position: absolute; z-index: 6; right: 18px; bottom: 42px; width: 230px; padding: 15px 16px;
  border: 1px solid rgba(107, 155, 210, .22); border-radius: 14px;
  background: rgba(9, 13, 26, .82); backdrop-filter: blur(12px);
}
.console-title {
  display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--hairline);
  span { color: var(--text-1); font-size: 11.5px; }
  i { color: var(--text-3); font-size: 8.5px; font-style: normal; }
}
.console dl div { display: flex; justify-content: space-between; gap: 16px; padding-top: 8px; font-size: 10.5px; }
.console dt { color: var(--text-3); }
.console dd { color: var(--text-2); text-align: right; }
.console .healthy { color: var(--green); }
.stage-note { position: absolute; z-index: 6; left: 18px; bottom: 16px; color: var(--text-3); font-size: 9.5px; }

.journey { position: relative; z-index: 2; width: min(1240px, calc(100% - 80px)); margin: 70px auto 16px; }
.section-head {
  display: flex; align-items: end; justify-content: space-between; gap: 40px; margin-bottom: 26px;
  h2 { font-size: clamp(28px, 3.2vw, 42px); line-height: 1.2; letter-spacing: -.025em; }
  > p { max-width: 370px; color: var(--text-2); font-size: 13.5px; line-height: 1.8; }
}
.journey-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--hairline); border-radius: 20px; overflow: hidden; }
.journey-card {
  position: relative; min-height: 284px; padding: 24px; color: var(--text-1); text-decoration: none;
  background: rgba(14, 20, 34, .6); border-right: 1px solid var(--hairline);
  transition: background .22s ease, transform .22s ease;
  &:last-child { border-right: 0; }
  &:hover { z-index: 2; background: rgba(24, 40, 68, .72); transform: translateY(-4px); }
  .step { color: var(--text-3); font-size: 10px; }
  .card-icon { display: grid; place-items: center; width: 44px; height: 44px; margin: 30px 0 20px; border: 1px solid var(--hairline); border-radius: 13px; background: rgba(77,168,255,.07); }
  .card-icon :deep(svg) { width: 27px; fill: none; stroke: var(--blue); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
  h3 { margin-bottom: 9px; font-size: 17px; }
  p { color: var(--text-2); font-size: 12.5px; line-height: 1.75; }
  > b { position: absolute; left: 24px; bottom: 22px; color: var(--blue); font-size: 11px; font-weight: 500; }
  > b i { margin-left: 4px; font-style: normal; }
}
.evidence-boundary {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; margin-top: 18px; padding: 17px 20px;
  border: 1px solid rgba(90, 150, 220, .2); border-radius: 14px; background: rgba(13, 19, 32, .65);
  .boundary-mark { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--blue); border-radius: 50%; color: var(--blue); font: 500 13px var(--mono); }
  b { display: block; margin-bottom: 2px; font-size: 12px; }
  p { color: var(--text-2); font-size: 11.5px; }
  a { color: var(--blue); font-size: 11.5px; text-decoration: none; white-space: nowrap; }
}
@media (max-width: 1080px) {
  .hero { grid-template-columns: 1fr; padding-top: 138px; }
  .observation-stage { min-height: 430px; height: 56vh; }
  .journey-grid { grid-template-columns: repeat(2, 1fr); }
  .journey-card:nth-child(2) { border-right: 0; }
  .journey-card:nth-child(-n+2) { border-bottom: 1px solid var(--hairline); }
}
@media (max-width: 767px) {
  .hero, .journey { width: calc(100% - 36px); }
  .home-goals { width: calc(100% - 36px); margin: 22px auto 30px; }
  .hero { padding-top: 106px; gap: 38px; }
  h1 { font-size: clamp(29px, 9vw, 42px); }
  .hero-metrics { grid-template-columns: repeat(2, 1fr); }
  .observation-stage { min-height: 400px; }
  .console { width: calc(100% - 36px); }
  .section-head { display: block; > p { margin-top: 12px; } }
  .journey-grid { grid-template-columns: 1fr; }
  .journey-card { border-right: 0; border-bottom: 1px solid var(--hairline); }
  .journey-card:last-child { border-bottom: 0; }
  .evidence-boundary { grid-template-columns: auto 1fr;
    a { grid-column: 2; min-height: 44px; display: inline-flex; align-items: center; } }

  /* 手机：几处 8.5—10.5px 的读数/说明文字基本读不出来，抬到 12px */
  .hero-metrics span, .stage-head b, .scan-tag, .console dl div,
  .stage-note, .journey-card .step, .console-title i { font-size: 12px; }
}
</style>
