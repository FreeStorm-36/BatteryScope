<template>
  <div class="page-full aging">
    <header class="head">
      <p class="chapter-eyebrow">Chapter 04 · 老化观测舱</p>
      <h2 class="chapter-title">电池并不是在某一天突然坏掉的</h2>
      <p class="chapter-sub">多种微小损伤，在一次次循环中共同累积。选择尺度与机制，拖动概念进程，看见损伤出现和长大。</p>
      <span class="corner badge-line"><DataBadge type="concept" />机制演化示意 · 概念状态，非真实电化学求解</span>
    </header>

    <div class="obs">
      <div class="stage panel" ref="stageBox">
        <div ref="threeBox" class="three-box"></div>

        <!-- 三尺度切换 -->
        <div class="scale-row">
          <button v-for="c in scales" :key="c.key" class="btn-ghost" :class="{ active: scale === c.key }" @click="setScale(c.key)">
            <b>{{ c.label }}</b><i>{{ c.hint }}</i>
          </button>
        </div>

        <!-- 机制筛选 -->
        <div class="mech-row">
          <button class="btn-ghost" :class="{ active: filter === 'all' }" @click="filter = 'all'">损伤指纹</button>
          <button v-for="m in mechanisms" :key="m.key" class="btn-ghost mech-btn" :class="{ active: filter === m.key }" @click="filter = m.key">
            <span class="m-dot" :style="{ background: m.color }"></span>{{ m.short }}
          </button>
        </div>

        <!-- 概念进程读数 -->
        <div class="cycle-read panel-glass num">
          <i>概念进程</i><b>{{ cycleToProgress(cycle) }}%</b><i>SOH</i><b class="soh">{{ (st.soh * 100).toFixed(1) }}%</b>
        </div>
      </div>

      <!-- 控制塔：紧贴 3D 动画右侧，播放控制置顶方便点击 -->
      <aside class="ctrl-tower">
        <div class="ctrl panel">
          <div class="slider-row">
            <input type="range" min="0" max="100" step="0.5" v-model.number="progressInput" @input="pausePlay" />
            <span class="pct num">{{ progressInput.toFixed(0) }}%</span>
          </div>
          <p class="caliber">概念老化进程 0—100%：用于连接机制动画，不对应固定循环次数，也不代表某型号电池必然达到相同状态。</p>
          <div class="milestones">
            <button v-for="m in AGING_MILESTONES" :key="m.cycle" class="btn-ghost num sm" :class="{ active: Math.abs(cycle - m.cycle) < 8 }" @click="jump(m.cycle)">{{ m.label }}</button>
          </div>
          <div class="play-row">
            <button class="btn-primary play-main" :aria-label="playing ? '暂停' : '播放'" @click="playing = !playing"><IconGlyph :name="playing ? 'pause' : 'play'" size="18" /><span>{{ playing ? '暂停' : '播放' }}</span></button>
            <div class="step-group">
              <button class="btn-ghost icon" @click="nudge(-30)" aria-label="后退 5%">−5%</button>
              <button class="btn-ghost icon" @click="nudge(30)" aria-label="前进 5%">+5%</button>
              <button class="btn-ghost icon" aria-label="复位" @click="jump(0)"><IconGlyph name="reset" /></button>
            </div>
            <label class="switch loop"><input type="checkbox" v-model="looping" />循环播放</label>
          </div>
          <div class="speeds">
            <span class="speeds-label">演示速度</span>
            <button v-for="s in speeds" :key="s.k" class="btn-ghost num" :class="{ active: speedKey === s.k }" @click="speedKey = s.k">{{ s.label }}</button>
          </div>
          <div class="summary" v-if="showSummary">已到 100%：SEI × {{ st.seiSeverity.toFixed(2) }} · 开裂 × {{ st.crackSeverity.toFixed(2) }} · LAM × {{ st.lamSeverity.toFixed(2) }} —— 2 秒后复位</div>
          <div class="summary node-flash" v-if="nodeFlash">{{ nodeFlash }}</div>
        </div>

        <!-- 当前机制卡（跟随控制塔，离动画更近） -->
        <transition name="fade-slide" mode="out-in">
          <div class="mech-card panel" :key="curMech.key + proMode">
            <div class="mech-head">
              <h4><span class="m-dot big" :style="{ background: curMech.color }"></span>{{ curMech.short }}</h4>
              <div class="pm-row">
                <button class="btn-ghost" :class="{ active: proMode === 'pop' }" @click="proMode = 'pop'">科普</button>
                <button class="btn-ghost" :class="{ active: proMode === 'pro' }" @click="proMode = 'pro'">专业</button>
              </div>
            </div>
            <i class="term">{{ curMech.term }}</i>
            <dl class="pop">
              <dt>它是什么</dt><dd>{{ curMech.what }}</dd>
              <dt>为什么出现</dt><dd>{{ curMech.why }}</dd>
              <dt>你正在看到</dt><dd>{{ curMech.see }}</dd>
              <dt>影响</dt><dd>{{ curMech.impact }}</dd>
              <dt>加速行为</dt><dd>{{ curMech.factors }}</dd>
            </dl>
            <div v-if="proMode === 'pro'" class="pro">
              <div class="eq num">{{ curMech.equation }}</div>
              <p class="sym">{{ curMech.symbols }}</p>
              <p><b>与观测量的可能联系：</b>{{ curMech.link }}</p>
              <p class="disclaim">公式描述趋势示意，不代表当前页面正在进行真实电化学求解。</p>
            </div>
          </div>
        </transition>
      </aside>
    </div>

    <!-- 动画下方：损伤指纹 + 锂库存并排 -->
    <div class="info-row">
      <div class="finger panel" v-show="filter === 'all'">
        <h5>损伤指纹 <i>六种机制的相对严重度</i></h5>
        <div ref="fingerBox" class="finger-chart"></div>
        <p class="finger-hint">点击任意一瓣，进入该机制专属视图。</p>
      </div>

      <div class="inv panel" v-if="filter === 'sei' || filter === 'all'">
        <div class="inv-head"><span>可循环锂库存</span><b class="num">{{ ((1 - st.seiSeverity * 0.22) * 100).toFixed(1) }}%</b></div>
        <div class="inv-track"><div class="inv-fill" :style="{ width: (1 - st.seiSeverity * 0.22) * 100 + '%' }"></div></div>
        <p class="inv-note">SEI 每长厚一点，就永久"锁住"一点锂 —— 库存不可逆下降。</p>
      </div>
    </div>

    <!-- 动态图表 -->
    <div class="charts panel">
      <div class="chart-tabs">
        <button v-for="v in chartViews" :key="v.key" class="btn-ghost" :class="{ active: view === v.key }" @click="view = v.key">{{ v.label }}</button>
        <span class="hint">点击曲线任意位置，3D 模型立即回到对应概念进程</span>
      </div>
      <div ref="chartBox" class="chart-box"></div>
      <p class="chart-caliber">纵轴为归一化相对量（%），呈现趋势关系，非绝对测量值。</p>
    </div>

    <ChapterFooter conclusion="电池不是在某一天突然坏掉，而是多种微小损伤在一次次循环中共同累积。" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import { initChart } from '../services/charts.js'
import { createLabScene, PALETTE } from '../three/labScene.js'
import { buildAnodeParticles } from '../three/batteryModel.js'
import { mechanisms, AGING_MILESTONES, agingStateAt, PROGRESS_SPAN, cycleToProgress, progressToCycle } from '../data/index.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import DataBadge from '../components/DataBadge.vue'
import IconGlyph from '../components/IconGlyph.vue'

const scales = [
  { key: 'outside', label: '外观诊断', hint: '整芯 · 温度与形变' },
  { key: 'section', label: '剖面定位', hint: '层结构 · 损伤热区' },
  { key: 'micro', label: '微观机制', hint: '颗粒表面 · 英雄颗粒' }
]
const speeds = [{ k: 'slow', label: '慢速讲解', v: 0.5 }, { k: 'normal', label: '正常', v: 1 }, { k: 'fast', label: '快速演示', v: 2 }]
const chartViews = [
  { key: 'health', label: '健康状态' },
  { key: 'damage', label: '内部损伤' },
  { key: 'perf', label: '性能变化' }
]

const scale = ref('section')
const filter = ref('all')
const proMode = ref('pop')
const cycle = ref(0)                  // 内部插值刻度 0-600
const progressInput = ref(0)          // 概念进程 0-100
const nodeFlash = ref('')
const playing = ref(false)
const looping = ref(true)
const speedKey = ref('normal')
const showSummary = ref(false)
const view = ref('health')
const threeBox = ref(null)
const chartBox = ref(null)
const fingerBox = ref(null)

const st = reactive(agingStateAt(0))
const curMech = computed(() => (filter.value === 'all' ? mechanisms[0] : mechanisms.find((m) => m.key === filter.value)))

watch(progressInput, (p) => { cycle.value = progressToCycle(p) })
watch(cycle, (c) => { progressInput.value = cycleToProgress(c) })
function jump(c) { cycle.value = c; playing.value = false; nodeFlash.value = ''; showSummary.value = false }
function nudge(d) { cycle.value = Math.min(PROGRESS_SPAN, Math.max(0, cycle.value + d)) }
function pausePlay() { playing.value = false; nodeFlash.value = ''; showSummary.value = false }

/* ══ 3D：三个独立尺度场景（状态同步） ══ */
let scene = null, raf = 0, chart = null, fingerChart = null
let outsideGroup, sectionGroup, microGroup
let seiMesh, dendriteGroup, crackLines, particles, electrolyteMesh, bubbles, heatLight, hotZone
let heroP, heroSei, heroDendrites, heroCracks, heroNeighbors, heroStress
const clock = new THREE.Clock()
let summaryTimer = null
let scaleTimers = []

function buildOutside() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 3.3, 48),
    new THREE.MeshStandardMaterial({ color: PALETTE.shell, roughness: 0.52, metalness: 0.62 })
  )
  body.name = 'outsideBody'
  g.add(body)
  const capMat = new THREE.MeshStandardMaterial({ color: PALETTE.capMetal, roughness: 0.48, metalness: 0.7 })
  const posCap = new THREE.Mesh(new THREE.CylinderGeometry(1.33, 1.33, 0.09, 48), capMat)
  posCap.position.y = 1.68
  const term = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 32), capMat)
  term.position.y = 1.76
  const negCap = new THREE.Mesh(new THREE.CylinderGeometry(1.33, 1.33, 0.09, 48), capMat)
  negCap.position.y = -1.68
  g.add(posCap, term, negCap)
  const heatRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.06, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 })
  )
  heatRing.rotation.x = Math.PI / 2
  heatRing.position.y = 0.9
  heatRing.name = 'heatRing'
  g.add(heatRing)
  heatLight = new THREE.PointLight(0xf59e0b, 0, 10)
  heatLight.position.set(0, 0.8, 2)
  g.add(heatLight)
  bubbles = []
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.4 })
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.06, 8, 8), bubbleMat.clone())
    b.position.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.0)
    b.userData.thresh = i / 12
    bubbles.push(b)
    g.add(b)
  }
  return g
}

function buildSection() {
  const g = new THREE.Group()
  const H = 3.2, D = 1.5, R = 1.9

  const shellGroup = new THREE.Group()
  const shellMat = new THREE.MeshStandardMaterial({ color: PALETTE.shell, roughness: 0.5, metalness: 0.6, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
  shellGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true, Math.PI, Math.PI), shellMat))
  const capGeo = new THREE.CircleGeometry(R, 48, Math.PI, Math.PI)
  for (const y of [H / 2, -H / 2]) {
    const cap = new THREE.Mesh(capGeo, shellMat)
    cap.rotation.x = y > 0 ? -Math.PI / 2 : Math.PI / 2
    cap.position.y = y
    shellGroup.add(cap)
  }
  g.add(shellGroup)

  electrolyteMesh = new THREE.Mesh(
    new THREE.BoxGeometry(R * 1.72, H * 0.88, D * 0.95),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, transparent: true, opacity: 0.15, roughness: 0.25 })
  )
  g.add(electrolyteMesh)

  const slab = (w, color, x) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, H * 0.84, D * 0.82), new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 }))
    m.position.x = x
    g.add(m)
    return m
  }
  slab(0.6, PALETTE.cathode, -R + 0.75)
  slab(0.2, PALETTE.separator, 0)
  slab(0.7, PALETTE.anode, R - 0.8)

  particles = buildAnodeParticles({ count: 90, radius: 0.95, height: 2.4 })
  particles.mesh.position.set(R - 1.05, 0, 0.55)
  g.add(particles.mesh)

  seiMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, H * 0.84, D * 0.86),
    new THREE.MeshStandardMaterial({ color: PALETTE.sei, roughness: 0.7, transparent: true, opacity: 0.7, emissive: 0x3a2506, emissiveIntensity: 0.3 })
  )
  seiMesh.position.set(R - 0.46, 0, -0.1)
  g.add(seiMesh)

  dendriteGroup = new THREE.Group()
  const dendMat = new THREE.MeshStandardMaterial({ color: PALETTE.dendrite, roughness: 0.5, metalness: 0.35 })
  for (let i = 0; i < 22; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16 + Math.random() * 0.3, 5), dendMat)
    cone.position.set(R - 0.5 + Math.random() * 0.1, (Math.random() - 0.5) * H * 0.7, -0.1 + (Math.random() - 0.5) * 0.7)
    cone.rotation.z = (Math.random() - 0.5) * 0.7
    dendriteGroup.add(cone)
  }
  g.add(dendriteGroup)

  crackLines = []
  const crackMat = new THREE.LineBasicMaterial({ color: 0x1a0f00, transparent: true, opacity: 0 })
  for (let i = 0; i < 10; i++) {
    const pts = []
    let px = R - 1.15 + Math.random() * 0.5, py = (Math.random() - 0.5) * H * 0.7, pz = D * 0.42
    pts.push(new THREE.Vector3(px, py, pz))
    for (let s = 0; s < 4; s++) {
      px += (Math.random() - 0.5) * 0.12
      py += (Math.random() - 0.5) * 0.34
      pts.push(new THREE.Vector3(px, py, pz))
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crackMat.clone())
    line.userData.thresh = i / 10
    crackLines.push(line)
    g.add(line)
  }

  hotZone = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 })
  )
  hotZone.position.set(R - 1.0, 0, 0.3)
  g.add(hotZone)
  return g
}

function buildMicro() {
  const g = new THREE.Group()
  heroP = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 2),
    new THREE.MeshStandardMaterial({ color: PALETTE.anode, roughness: 0.72, metalness: 0.12, flatShading: true })
  )
  g.add(heroP)
  heroSei = new THREE.Mesh(
    new THREE.SphereGeometry(0.97, 32, 32),
    new THREE.MeshStandardMaterial({ color: PALETTE.sei, roughness: 0.75, transparent: true, opacity: 0.12, emissive: 0x3a2506, emissiveIntensity: 0.25, depthWrite: false })
  )
  g.add(heroSei)
  heroStress = new THREE.Mesh(
    new THREE.SphereGeometry(0.905, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x8f6f4f, transparent: true, opacity: 0, roughness: 0.7, depthWrite: false })
  )
  g.add(heroStress)
  heroDendrites = new THREE.Group()
  const dendMat = new THREE.MeshStandardMaterial({ color: 0xdde6f2, roughness: 0.5, metalness: 0.35 })
  for (let i = 0; i < 14; i++) {
    const needle = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.3 + Math.random() * 0.35, 6), dendMat)
    const a = Math.random() * Math.PI * 2
    const b = Math.PI / 2 + (Math.random() - 0.5) * 0.7
    needle.position.set(Math.cos(a) * Math.sin(b) * 0.95, Math.cos(b) * 0.95 * 0.6, Math.sin(a) * Math.sin(b) * 0.95)
    needle.lookAt(0, 0, 0)
    needle.rotateX(Math.PI / 2)
    needle.visible = false
    needle.userData.thresh = i / 14
    heroDendrites.add(needle)
  }
  g.add(heroDendrites)
  heroCracks = []
  const crackMat = new THREE.LineBasicMaterial({ color: 0x120a02, transparent: true, opacity: 0 })
  for (let i = 0; i < 6; i++) {
    const pts = []
    let a = Math.random() * Math.PI * 2
    for (let s = 0; s < 5; s++) {
      const rr = 0.92 + Math.sin(s) * 0.01
      a += 0.3 + Math.random() * 0.2
      pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a * 1.3) * rr * 0.7, Math.sin(a) * rr * 0.8))
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crackMat.clone())
    line.userData.thresh = (i + 1) / 6
    heroCracks.push(line)
    g.add(line)
  }
  heroNeighbors = []
  const nGeo = new THREE.IcosahedronGeometry(0.22, 1)
  for (let i = 0; i < 7; i++) {
    const n = new THREE.Mesh(nGeo, new THREE.MeshStandardMaterial({ color: PALETTE.anode, roughness: 0.6, flatShading: true }))
    const a = (i / 7) * Math.PI * 2
    n.position.set(Math.cos(a) * 1.7, Math.sin(a * 2) * 0.9, Math.sin(a) * 1.7)
    n.userData.idx = i
    n.userData.base = n.position.clone()
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([n.position.clone(), new THREE.Vector3(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.35 }))
    n.userData.link = line
    heroNeighbors.push(n)
    g.add(n, line)
  }
  return g
}

/* 唯一状态源 st → 三个尺度 */
function applyAging(s) {
  if (!scene) return
  const breathe = 1 + 0.015 * Math.sin(clock.elapsedTime * 1.4)

  seiMesh.scale.x = (0.07 + s.seiSeverity * 0.5) / 0.07
  seiMesh.material.opacity = 0.2 + s.seiSeverity * 0.42
  dendriteGroup.visible = s.platingSeverity > 0.06
  dendriteGroup.children.forEach((c, i) => { c.visible = i / 22 < s.platingSeverity * 1.5 })
  crackLines.forEach((l) => { l.material.opacity = s.crackSeverity > l.userData.thresh ? 0.62 : 0 })
  electrolyteMesh.material.opacity = Math.max(0.05, 0.18 - s.electrolyteSeverity * 0.13)
  electrolyteMesh.scale.x = 1 - s.electrolyteSeverity * 0.25
  bubbles.forEach((b) => { b.visible = s.gasSeverity > b.userData.thresh * 0.7 })
  hotZone.material.opacity = filter.value === 'section' ? 0.08 + Math.max(s.seiSeverity, s.crackSeverity, s.platingSeverity) * 0.18 : 0
  particles.update(clock.elapsedTime, { lamSeverity: s.lamSeverity, crackSeverity: s.crackSeverity })

  const body = outsideGroup.getObjectByName('outsideBody')
  const heatRing = outsideGroup.getObjectByName('heatRing')
  const swell = 1 + s.gasSeverity * 0.04
  body.scale.set(swell, 1, swell)
  heatRing.material.opacity = Math.min(0.45, (s.temperatureRise - 1) * 0.32)
  heatLight.intensity = (s.temperatureRise - 1) * 5

  const pulse = 1 + s.crackSeverity * 0.045 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2))
  heroP.scale.setScalar(breathe * pulse)
  heroSei.scale.setScalar(1 + s.seiSeverity * 0.28)
  heroSei.material.opacity = 0.1 + s.seiSeverity * 0.34
  heroStress.material.opacity = s.crackSeverity > 0.05 && s.crackSeverity < 0.85 ? Math.max(0, (0.5 - Math.abs(s.crackSeverity - 0.45)) * 0.9) : 0
  heroDendrites.children.forEach((d) => { d.visible = s.platingSeverity > d.userData.thresh * 0.8 })
  heroCracks.forEach((l) => { l.material.opacity = s.crackSeverity > l.userData.thresh ? 0.65 : 0 })
  heroNeighbors.forEach((n) => {
    const dead = n.userData.idx / 7 < s.lamSeverity
    n.material.color.set(dead ? PALETTE.dead : PALETTE.anode)
    const detach = dead ? 0.5 + (n.userData.idx % 3) * 0.15 : 0
    n.position.copy(n.userData.base).multiplyScalar(1 + detach * 0.25)
    n.position.y += detach * 0.4
    n.userData.link.material.opacity = dead ? 0.05 : 0.35
    n.userData.link.geometry.setFromPoints([n.position.clone(), new THREE.Vector3(0, 0, 0)])
  })
}

/* 尺度切换：真实的不同场景 + 连续镜头推进（约 1 秒） */
function setScale(k) {
  scale.value = k
  if (!scene) return
  const presets = {
    outside: { pos: [0, 1.0, 8.4], tgt: [0, -0.1, 0] },
    section: { pos: [0.3, 1.5, 8.6], tgt: [0, -0.3, 0] },
    micro: { pos: [2.1, 0.7, 4.4], tgt: [0, -0.1, 0] }
  }[k]
  gsap.to(scene.camera.position, { x: presets.pos[0], y: presets.pos[1], z: presets.pos[2], duration: 1.0, ease: 'power2.inOut' })
  gsap.to(scene.controls.target, { x: presets.tgt[0], y: presets.tgt[1], z: presets.tgt[2], duration: 1.0, ease: 'power2.inOut', onUpdate: () => scene.controls.update() })
  const mid = setTimeout(() => {
    outsideGroup.visible = k === 'outside'
    sectionGroup.visible = k === 'section'
    microGroup.visible = k === 'micro'
  }, 450)
  scaleTimers.push(mid)
}

/* ECharts 三视图（横轴 = 概念进程 %） */
function chartOption(v, s) {
  const xs = []
  for (let p = 0; p <= 100; p += 2) xs.push(p)
  const at = (p) => agingStateAt(progressToCycle(p))
  const seriesDef = {
    health: [
      { name: 'SOH（相对）', data: xs.map((p) => +(at(p).soh * 100).toFixed(1)), color: '#34d399' },
      { name: '80% 教学参考线', data: xs.map(() => 80), color: '#ef4444', lineStyle: { type: 'dashed' } }
    ],
    damage: [
      { name: 'SEI 厚度（相对）', data: xs.map((p) => +(at(p).seiSeverity * 100).toFixed(1)), color: '#f59e0b' },
      { name: '析锂沉积（相对）', data: xs.map((p) => +(at(p).platingSeverity * 100).toFixed(1)), color: '#cbd5e1' },
      { name: '裂纹（相对）', data: xs.map((p) => +(at(p).crackSeverity * 100).toFixed(1)), color: '#fbbf24' }
    ],
    perf: [
      { name: '容量（相对）', data: xs.map((p) => +(at(p).soh * 100).toFixed(1)), color: '#4da8ff' },
      { name: '内阻（相对）', data: xs.map((p) => +(at(p).resistance * 50).toFixed(1)), color: '#ef4444' },
      { name: '温升（相对）', data: xs.map((p) => +(at(p).temperatureRise * 40).toFixed(1)), color: '#f59e0b' }
    ]
  }[v]

  return {
    backgroundColor: 'transparent',
    grid: { left: 52, right: 24, top: 40, bottom: 40 },
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(13,18,32,0.95)', borderColor: 'rgba(77,168,255,0.3)',
      textStyle: { color: '#e6edf7', fontSize: 12 },
      formatter: (ps) => `概念进程 <b class="num">${ps[0].axisValue}%</b><br/>` + ps.map((p) => `${p.marker}${p.seriesName}：<b class="num">${p.value}</b>`).join('<br/>')
    },
    xAxis: { type: 'category', data: xs, axisLine: { lineStyle: { color: 'rgba(77,168,255,0.3)' } }, axisLabel: { color: '#8b98b0' }, name: '概念进程 %', nameTextStyle: { color: '#8b98b0' } },
    yAxis: { type: 'value', min: 0, max: 100, splitLine: { lineStyle: { color: 'rgba(77,168,255,0.08)' } }, axisLabel: { color: '#8b98b0' } },
    series: [
      ...seriesDef.map((sd) => ({
        name: sd.name, type: 'line', data: sd.data, smooth: 0.4, symbol: 'none',
        lineStyle: { color: sd.color, width: 2, ...(sd.lineStyle || {}) },
        itemStyle: { color: sd.color },
        markLine: undefined
      })),
      {
        id: 'playhead', name: 'playhead', type: 'line', data: [], silent: true,
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#22d3ee', width: 2, type: 'solid' }, label: { show: false }, data: [{ xAxis: cycleToProgress(s.cycle).toFixed(0) }] },
        markPoint: { symbol: 'circle', symbolSize: 9, itemStyle: { color: '#22d3ee', shadowColor: '#22d3ee', shadowBlur: 10 }, label: { show: false }, data: [{ coord: [cycleToProgress(s.cycle).toFixed(0), seriesDef[0].data[Math.min(50, Math.round(cycleToProgress(s.cycle) / 2))]] }] }
      }
    ]
  }
}

function fingerValue(s) {
  return mechanisms.map((m) => +({ sei: s.seiSeverity, plating: s.platingSeverity, crack: s.crackSeverity, lam: s.lamSeverity, electrolyte: s.electrolyteSeverity, gas: s.gasSeverity }[m.key]).toFixed(2))
}
function fingerOption(s) {
  return {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: 'rgba(13,18,32,0.95)', borderColor: 'rgba(77,168,255,0.3)', textStyle: { color: '#e6edf7', fontSize: 12 } },
    radar: {
      indicator: mechanisms.map((m) => ({ name: m.short.replace(' 增厚', '').replace(' 减少', '').replace('鼓胀', '').replace('颗粒', ''), max: 1 })),
      radius: '68%', center: ['50%', '52%'],
      axisName: { color: '#8b98b0', fontSize: 10.5 },
      splitArea: { areaStyle: { color: ['rgba(77,168,255,0.03)', 'rgba(77,168,255,0.06)'] } },
      splitLine: { lineStyle: { color: 'rgba(77,168,255,0.15)' } },
      axisLine: { lineStyle: { color: 'rgba(77,168,255,0.2)' } }
    },
    series: [{
      type: 'radar', symbolSize: 4,
      data: [{ value: fingerValue(s), name: '严重度', areaStyle: { color: 'rgba(245,158,11,0.25)' }, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } }],
      animationDuration: 300
    }]
  }
}

onMounted(async () => {
  await nextTick()
  scene = createLabScene(threeBox.value, { cameraPos: [0.3, 1.5, 8.6], fov: 42 })
  scene.controls.target.set(0, -0.3, 0)
  scene.controls.update()
  outsideGroup = buildOutside()
  sectionGroup = buildSection()
  microGroup = buildMicro()
  scene.scene.add(outsideGroup, sectionGroup, microGroup)
  // 各尺度基准缩放：缩小初始观感，避免播放/拖动时模型过大
  outsideGroup.scale.setScalar(0.82)
  sectionGroup.scale.setScalar(0.88)
  microGroup.scale.setScalar(0.8)
  outsideGroup.visible = false
  microGroup.visible = false

  chart = initChart(chartBox.value)
  chart.setOption(chartOption(view.value, st))
  chart.on('click', (p) => { if (p.name != null) jump(progressToCycle(+p.name)) })

  fingerChart = initChart(fingerBox.value)
  fingerChart.setOption(fingerOption(st))
  fingerChart.on('click', (p) => {
    if (p.name) {
      const m = mechanisms.find((x) => x.short.includes(p.name))
      if (m) filter.value = m.key
    }
  })

  window.addEventListener('resize', onChartResize)

  let nodeHold = 0
  let lastNodeIdx = -1
  const loop = () => {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 0.05)
    if (nodeHold > 0) {
      nodeHold -= dt
      if (nodeHold <= 0) nodeFlash.value = ''
    } else if (playing.value) {
      const prev = cycle.value
      cycle.value = Math.min(PROGRESS_SPAN, cycle.value + dt * 36 * speeds.find((s) => s.k === speedKey.value).v)
      for (let i = 1; i < AGING_MILESTONES.length - 1; i++) {
        const mc = AGING_MILESTONES[i].cycle
        if (prev < mc && cycle.value >= mc && lastNodeIdx !== i) {
          lastNodeIdx = i
          nodeHold = 1.0
          nodeFlash.value = AGING_MILESTONES[i].label
          break
        }
      }
      if (cycle.value >= PROGRESS_SPAN) {
        playing.value = false
        showSummary.value = true
        summaryTimer = setTimeout(() => {
          showSummary.value = false
          if (looping.value) { cycle.value = 0; lastNodeIdx = -1; playing.value = true }
        }, 2000)
      }
    }
    const ns = agingStateAt(cycle.value)
    for (const k in ns) st[k] = ns[k]
    applyAging(st)
    updatePlayhead()
    if (filter.value === 'all' && fingerChart) {
      fingerChart.setOption({ series: [{ data: [{ value: fingerValue(st), name: '严重度', areaStyle: { color: 'rgba(245,158,11,0.25)' }, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } }] }] })
    }
    scene.render()
  }
  loop()
})

function onChartResize() { chart?.resize(); fingerChart?.resize() }

let lastChartCycle = -1
watch(view, () => {
  if (!chart) return
  chart.setOption(chartOption(view.value, st), { notMerge: true })
  lastChartCycle = cycle.value
})
function updatePlayhead() {
  if (!chart) return
  const pp = cycleToProgress(cycle.value)
  if (Math.abs(pp - lastChartCycle) < 2) return
  lastChartCycle = pp
  const def = chartOption(view.value, st)
  const firstY = def.series[0].data[Math.min(50, Math.round(pp / 2))]
  chart.setOption({
    series: [{
      id: 'playhead', type: 'line',
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#22d3ee', width: 2 }, label: { show: false }, data: [{ xAxis: String(pp) }] },
      markPoint: { symbol: 'circle', symbolSize: 9, itemStyle: { color: '#22d3ee', shadowColor: '#22d3ee', shadowBlur: 10 }, label: { show: false }, data: [{ coord: [String(pp), firstY] }] }
    }]
  })
}

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(summaryTimer)
  scaleTimers.forEach(clearTimeout)
  window.removeEventListener('resize', onChartResize)
  chart?.dispose()
  fingerChart?.dispose()
  if (scene) scene.dispose()
})
</script>

<style scoped lang="scss">
.aging { display: flex; flex-direction: column; gap: 20px; }
.head { position: relative;
  .badge-line { position: absolute; right: 0; top: 8px; display: inline-flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-2); }
}
.obs { display: grid; grid-template-columns: 1.9fr 1fr; gap: 18px; align-items: start; }
.stage { position: relative; height: 620px; overflow: hidden; }
.three-box { position: absolute; inset: 0; cursor: grab; }
.scale-row { position: absolute; left: 14px; top: 14px; display: flex; gap: 8px; z-index: 4;
  .btn-ghost { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 8px 14px;
    b { font-size: 12.5px; }
    i { font-style: normal; font-size: 10.5px; color: var(--text-3); } } }
.mech-row { position: absolute; left: 14px; bottom: 14px; display: flex; gap: 7px; flex-wrap: wrap; z-index: 4; max-width: 72%;
  .mech-btn { padding: 6px 12px; font-size: 12px; } }
.m-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: 1px;
  &.big { width: 12px; height: 12px; margin-right: 9px; box-shadow: 0 0 5px currentColor; } }
.cycle-read { position: absolute; right: 14px; top: 14px; padding: 9px 16px; z-index: 4; display: flex; gap: 10px; align-items: center;
  i { font-style: normal; font-size: 11px; color: var(--text-2); }
  b { font-size: 19px; color: var(--cyan); }
  .soh { color: var(--green); } }

.side { display: flex; flex-direction: column; gap: 12px; }
.ctrl-tower { display: flex; flex-direction: column; gap: 12px; }
.pm-row { display: flex; gap: 8px;
  .btn-ghost { padding: 5px 12px; font-size: 12px; } }
.mech-card { padding: 18px;
  .mech-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h4 { font-size: 15.5px; color: var(--text-1); display: flex; align-items: center; }
  .term { display: block; font-style: normal; font-size: 11.5px; color: var(--text-2); margin-top: 4px; }
  dl { margin-top: 12px; display: grid; grid-template-columns: 84px 1fr; gap: 8px 10px;
    dt { font-size: 12px; color: var(--blue); }
    dd { font-size: 12.5px; color: var(--text-2); line-height: 1.7; } }
  .pro { margin-top: 14px; border-top: 1px solid var(--hairline); padding-top: 12px;
    .eq { font-size: 15px; color: var(--cyan); background: rgba(34,211,238,0.07); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; }
    p { font-size: 12.5px; color: var(--text-2); line-height: 1.8; margin-bottom: 6px; b { color: var(--text-1); } }
    .disclaim { font-size: 11px; color: var(--text-3); } } }

.info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

.finger { padding: 14px 16px;
  h5 { font-size: 13px; color: var(--text-1); i { font-style: normal; font-size: 11px; color: var(--text-3); margin-left: 8px; } }
  .finger-chart { height: 190px; }
  .finger-hint { font-size: 11px; color: var(--text-3); text-align: center; } }
.inv { padding: 14px 16px;
  .inv-head { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-2); b { color: var(--cyan); } }
  .inv-track { height: 8px; border-radius: 4px; background: rgba(77,168,255,0.1); margin-top: 8px; overflow: hidden; }
  .inv-fill { height: 100%; background: linear-gradient(90deg, #34d399, #22d3ee); border-radius: 4px; transition: width 0.3s; }
  .inv-note { font-size: 11px; color: var(--text-3); margin-top: 7px; line-height: 1.6; } }

.ctrl { padding: 16px; display: flex; flex-direction: column; gap: 12px;
  .slider-row { display: flex; align-items: center; gap: 12px;
    input { flex: 1; }
    .pct { color: var(--cyan); min-width: 46px; text-align: right; font-size: 17px; } }
  .caliber { font-size: 11px; color: var(--text-3); line-height: 1.6; }
  .milestones { display: flex; gap: 6px; flex-wrap: wrap;
    .sm { padding: 4px 10px; font-size: 11.5px; } }
  .play-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    .play-main { padding: 9px 22px; font-size: 15px; }
    .step-group { display: flex; gap: 6px; }
    .icon { width: 36px; height: 36px; justify-content: center; font-size: 12px; }
    .loop { margin-left: auto; font-size: 12.5px; } }
  .speeds { display: flex; align-items: center; gap: 6px; padding-top: 10px; border-top: 1px solid var(--hairline);
    .speeds-label { font-size: 11.5px; color: var(--text-3); margin-right: 2px; }
    .btn-ghost { padding: 5px 12px; font-size: 12px; } }
  .summary { font-size: 12px; color: var(--green); background: rgba(52,211,153,0.08); padding: 8px 12px; border-radius: 8px;
    &.node-flash { color: var(--amber); background: rgba(245,158,11,0.08); } } }

.charts { padding: 18px; }
.chart-tabs { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; flex-wrap: wrap;
  .hint { font-size: 11.5px; color: var(--text-3); margin-left: auto; } }
.chart-box { height: 300px; }
.chart-caliber { margin-top: 8px; font-size: 11px; color: var(--text-3); }
@media (max-width: 1080px) {
  .obs { grid-template-columns: 1fr; }
  .stage { height: 480px; }
  .info-row { grid-template-columns: 1fr; }
}
</style>
