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
          <span>概念标本</span>
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
          <b class="num">LIVE / CONCEPT</b>
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
            <div><dt>外形</dt><dd>圆柱电芯</dd></div>
            <div><dt>化学体系</dt><dd>NMC · 概念设定</dd></div>
            <div><dt>状态</dt><dd class="healthy">健康观测</dd></div>
            <div><dt>边界</dt><dd>非 NASA B0005 实体</dd></div>
          </dl>
        </aside>
        <p class="stage-note">拖动视线观察三维标本 · 扫描标签用于教学演示</p>
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

    <ChapterFooter conclusion="同一观察对象将贯穿结构、工作、老化、真实数据与预测方法，避免把概念演示误认为实验结果。" />
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import * as THREE from 'three'
import ChapterFooter from '../components/ChapterFooter.vue'
import { createLabScene, PALETTE } from '../three/labScene.js'
import { buildCylindricalCell, buildJellyRoll, buildParticleFlow } from '../three/batteryModel.js'

const bgCanvas = ref(null)
const threeBox = ref(null)
const stage = ref(null)
const soc = ref(78.4)
const temp = ref(24.6)
const visibleTags = ref([])
const parallaxStyle = ref({})

const metrics = [
  { value: '07', label: '连续章节' },
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
const dots = []
const mouse = { x: 0, y: 0 }

const fit = () => {
  const c = bgCanvas.value
  if (!c) return
  c.width = innerWidth
  c.height = innerHeight
}

onMounted(() => {
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

  if (threeBox.value) {
    scene = createLabScene(threeBox.value, { cameraPos: [0, 0.4, 8.4], fov: 37 })
    const specimen = new THREE.Group()
    scene.scene.add(specimen)

    const cell = buildCylindricalCell({ r: 1.08, h: 3.65, label: 'BS-01' })
    cell.position.x = -0.55
    cell.rotation.z = 0.08
    specimen.add(cell)

    const roll = buildJellyRoll({ r: 0.9, h: 3.15 })
    roll.scale.setScalar(0.67)
    roll.position.set(1.1, -0.15, 0.15)
    roll.rotation.z = 0.08
    specimen.add(roll)

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.35 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.012, 8, 96), ringMat)
    ring.rotation.x = Math.PI / 2
    ring.scale.z = 0.7
    ring.position.y = -1.55
    specimen.add(ring)
    gsap.to(ringMat, { opacity: 0.1, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    const liFlow = buildParticleFlow({
      count: 34, color: PALETTE.li, size: 0.065, speed: 0.18,
      pathFn: (t, v, i) => {
        const a = i * 2.399 + t * 4.2
        v.set(Math.cos(a) * 2.2, (t - 0.5) * 3.2, Math.sin(a) * 1.25)
      }
    })
    specimen.add(liFlow.mesh)

    const clock = new THREE.Clock()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(clock.getDelta(), 0.05)
      specimen.rotation.y += dt * 0.18
      cell.rotation.y += dt * 0.22
      roll.rotation.y -= dt * 0.16
      liFlow.update(dt, 1, true)
      scene.camera.position.x += (mouse.x * 0.48 - scene.camera.position.x) * 0.035
      scene.camera.position.y += (0.4 + mouse.y * 0.32 - scene.camera.position.y) * 0.035
      scene.render()
    }
    loop()
  }

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
      ctx.fillStyle = `rgba(52,211,153,${d.o})`
      ctx.fill()
    }
  }
  bgLoop()
})

function onParallax(e) {
  const r = stage.value.getBoundingClientRect()
  mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2
  mouse.y = -((e.clientY - r.top) / r.height - 0.5) * 2
  parallaxStyle.value = { transform: `translate(${mouse.x * 4}px, ${mouse.y * 3}px)` }
}

onBeforeUnmount(() => {
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
.bg-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.vignette {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(ellipse 70% 58% at 72% 28%, rgba(31, 151, 111, 0.09), transparent 62%);
}
.hero {
  position: relative; z-index: 2; width: min(1320px, calc(100% - 80px)); min-height: 100vh; margin: 0 auto;
  padding: 128px 0 60px; display: grid; grid-template-columns: minmax(0, .92fr) minmax(520px, 1.08fr);
  gap: clamp(34px, 5vw, 82px); align-items: center;
}
.hero-copy { padding-top: 20px; }
.eyebrow { color: var(--green); font-size: 11px; font-weight: 600; letter-spacing: .27em; }
h1 {
  margin-top: 18px; color: var(--text-1); font-size: clamp(44px, 5.2vw, 76px); line-height: 1.08;
  letter-spacing: -.045em; font-weight: 760;
  span { display: inline-block; color: #9ab6ac; font-weight: 540; }
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
  b { color: var(--green); }
  span:not(.live-dot) { padding-left: 13px; border-left: 1px solid var(--hairline); }
}
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); animation: blink 2s infinite; }
@keyframes blink { 50% { opacity: .35; } }
.hero-metrics {
  display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 38px; border-top: 1px solid var(--hairline);
  > div { padding: 18px 12px 0 0; }
  strong { display: block; color: var(--text-1); font-size: 23px; font-weight: 520; }
  span { color: var(--text-3); font-size: 10.5px; letter-spacing: .04em; }
}
.observation-stage {
  position: relative; height: min(690px, 73vh); min-height: 560px; overflow: hidden;
  border: 1px solid rgba(94, 184, 159, .22); border-radius: 26px;
  background:
    linear-gradient(rgba(73, 155, 130, .045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(73, 155, 130, .045) 1px, transparent 1px),
    radial-gradient(circle at 50% 43%, rgba(39, 148, 113, .15), transparent 42%),
    rgba(7, 18, 16, .76);
  background-size: 34px 34px, 34px 34px, auto, auto;
  box-shadow: 0 34px 80px rgba(0, 7, 6, .42);
}
.stage-head {
  position: absolute; z-index: 5; inset: 0 0 auto; height: 54px; padding: 0 20px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--hairline); background: rgba(8, 19, 17, .72);
  span { display: inline-flex; align-items: center; gap: 9px; color: var(--text-2); font-size: 12px; }
  span i { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
  b { color: var(--text-3); font-size: 9.5px; font-weight: 500; letter-spacing: .1em; }
}
.stage-inner { position: absolute; inset: 54px 0 0; transition: transform .22s ease-out; }
.three-box { position: absolute; inset: 0; }
.scanline {
  position: absolute; left: 8%; right: 8%; top: 8%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(52,211,153,.72), transparent);
  animation: scan 5.4s ease-in-out infinite; pointer-events: none;
}
@keyframes scan { 0%, 100% { top: 9%; opacity: 0; } 12%, 88% { opacity: 1; } 50% { top: 79%; } }
.scan-tags { position: absolute; inset: 0; pointer-events: none; }
.scan-tag {
  position: absolute; padding: 4px 9px; border-left: 1px solid var(--green);
  background: rgba(5, 17, 14, .58); color: #79e3bc; font-size: 10px; letter-spacing: .04em;
}
.scan-enter-active, .scan-leave-active { transition: all .4s ease; }
.scan-enter-from, .scan-leave-to { opacity: 0; transform: translateY(6px); }
.console {
  position: absolute; z-index: 6; right: 18px; bottom: 42px; width: 230px; padding: 15px 16px;
  border: 1px solid rgba(107, 190, 164, .22); border-radius: 14px;
  background: rgba(6, 16, 14, .82); backdrop-filter: blur(12px);
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
  background: rgba(10, 24, 21, .58); border-right: 1px solid var(--hairline);
  transition: background .22s ease, transform .22s ease;
  &:last-child { border-right: 0; }
  &:hover { z-index: 2; background: rgba(20, 52, 43, .7); transform: translateY(-4px); }
  .step { color: var(--text-3); font-size: 10px; }
  .card-icon { display: grid; place-items: center; width: 44px; height: 44px; margin: 30px 0 20px; border: 1px solid var(--hairline); border-radius: 13px; background: rgba(52,211,153,.06); }
  .card-icon :deep(svg) { width: 27px; fill: none; stroke: var(--green); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
  h3 { margin-bottom: 9px; font-size: 17px; }
  p { color: var(--text-2); font-size: 12.5px; line-height: 1.75; }
  > b { position: absolute; left: 24px; bottom: 22px; color: var(--green); font-size: 11px; font-weight: 500; }
  > b i { margin-left: 4px; font-style: normal; }
}
.evidence-boundary {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; margin-top: 18px; padding: 17px 20px;
  border: 1px solid rgba(94, 184, 159, .18); border-radius: 14px; background: rgba(9, 22, 19, .62);
  .boundary-mark { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--green); border-radius: 50%; color: var(--green); font: 500 13px var(--mono); }
  b { display: block; margin-bottom: 2px; font-size: 12px; }
  p { color: var(--text-2); font-size: 11.5px; }
  a { color: var(--green); font-size: 11.5px; text-decoration: none; white-space: nowrap; }
}
@media (max-width: 1040px) {
  .hero { grid-template-columns: 1fr; padding-top: 138px; }
  .observation-stage { min-height: 510px; height: 60vh; }
  .journey-grid { grid-template-columns: repeat(2, 1fr); }
  .journey-card:nth-child(2) { border-right: 0; }
  .journey-card:nth-child(-n+2) { border-bottom: 1px solid var(--hairline); }
}
@media (max-width: 720px) {
  .hero, .journey { width: calc(100% - 36px); }
  .hero { padding-top: 106px; gap: 38px; }
  h1 { font-size: clamp(39px, 12vw, 56px); }
  .hero-metrics { grid-template-columns: repeat(2, 1fr); }
  .observation-stage { min-height: 480px; }
  .console { width: calc(100% - 36px); }
  .section-head { display: block; > p { margin-top: 12px; } }
  .journey-grid { grid-template-columns: 1fr; }
  .journey-card { border-right: 0; border-bottom: 1px solid var(--hairline); }
  .journey-card:last-child { border-bottom: 0; }
  .evidence-boundary { grid-template-columns: auto 1fr; a { grid-column: 2; } }
}
</style>
