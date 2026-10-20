<template>
  <div class="page-full aging">
    <header class="head">
      <p class="chapter-eyebrow">Chapter 04 · 老化观测舱</p>
      <h2 class="chapter-title">电池并不是在某一天突然坏掉的</h2>
      <p class="chapter-sub">选择尺度与机制，拖动概念进程，看见损伤出现和长大。点选单一机制时，镜头会带到最能看清它的位置，其余机制自动淡出。</p>
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

        <!-- 机制筛选：再点一次已选中的机制 = 回到六机制同台 -->
        <div class="mech-row">
          <button class="btn-ghost" :class="{ active: filter === 'all' }" @click="filter = 'all'">损伤指纹</button>
          <button
            v-for="m in mechanisms"
            :key="m.key"
            class="btn-ghost mech-btn"
            :class="{ active: filter === m.key }"
            :aria-pressed="filter === m.key"
            @click="filter = (filter === m.key ? 'all' : m.key)"
          >
            <span class="m-dot" :style="{ background: m.color }"></span>{{ m.short }}
          </button>
        </div>

        <!-- 聚焦提示：告诉观众"现在为什么只剩一种现象" -->
        <p v-if="filter !== 'all'" class="focus-note">正在单独演示「{{ curMech.short }}」，其余机制已淡出；再次点击该机制或点"损伤指纹"可恢复同台对比。</p>

        <!-- 右上：读数 + 视角工具（纵向排，避开左上尺度切换与底部机制筛选） -->
        <div class="stage-right">
          <div class="cycle-read panel-glass num">
            <i>概念进程</i><b>{{ cycleToProgress(cycle) }}%</b><i>SOH</i><b class="soh">{{ (st.soh * 100).toFixed(1) }}%</b>
          </div>
          <div class="view-tools">
            <button class="btn-ghost view-reset" title="回到当前尺度的初始机位" @click="resetView">
              <IconGlyph name="reset" /> 重置视角
            </button>
            <p class="view-hint">
              <span class="vh-mouse">拖拽旋转 · 滚轮缩放 · 右键平移</span>
              <span class="vh-touch">单指旋转 · 双指缩放与平移</span>
            </p>
          </div>
        </div>

        <p class="geom-note">剖切示意：正极 / 隔膜 / 负极按层展开，便于观察机制，不按具体型号比例</p>
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
            <button class="btn-primary play-main" :aria-label="playing ? '暂停' : '播放'" @click="playing = !playing"><IconGlyph :name="playing ? 'pause' : 'play'" :size="18" /><span>{{ playing ? '暂停' : '播放' }}</span></button>
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
            <!-- 机制特征签名：六个机制原先都是一模一样的五段文字，读完分不出谁是谁。
                 这里把真正区分它们的三条轴直接摆出来 —— 主要打容量 / 内阻 / 安全，
                 外加"节奏"（缓慢自限 vs 事件型突发）与可逆性。对比才是让特点显形的办法。 -->
            <div class="m-sig">
              <div v-for="(lab, i) in ['容量', '内阻', '安全']" :key="lab" class="sig-item">
                <span class="sig-lab">{{ lab }}</span>
                <span class="sig-dots">
                  <i v-for="n in 3" :key="n" :class="{ on: n <= curMech.profile[i] }"
                     :style="{ background: n <= curMech.profile[i] ? curMech.color : 'transparent' }"></i>
                </span>
              </div>
              <div class="sig-item wide"><span class="sig-lab">节奏</span><b>{{ curMech.pace }}</b></div>
              <div class="sig-item wide"><span class="sig-lab">可逆性</span><b>{{ curMech.rev }}</b></div>
            </div>
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

    <!-- 动画下方：全机制同台时看损伤指纹，单机制聚焦时看该机制专属读数 -->
    <div class="info-row" :class="{ solo: filter !== 'all' }">
      <div class="finger panel" v-show="filter === 'all'">
        <h5>损伤指纹 <i>六种机制的相对严重度</i></h5>
        <FingerprintChart :items="mechanisms" :values="fpValues" @select="filter = $event" />
        <p class="finger-hint">{{ fpHint }}</p>
      </div>

      <div class="inv panel" v-if="filter === 'all'">
        <div class="inv-head"><span>可循环锂库存</span><b class="num">{{ ((1 - st.seiSeverity * 0.22) * 100).toFixed(1) }}%</b></div>
        <div class="inv-track"><div class="inv-fill" :style="{ width: (1 - st.seiSeverity * 0.22) * 100 + '%' }"></div></div>
        <p class="inv-note">SEI 每长厚一点，就永久"锁住"一点锂 —— 库存不可逆下降。</p>
      </div>

      <div class="inv panel" v-else-if="readout">
        <div class="inv-head"><span>{{ readout.title }}</span><b class="num" :style="{ color: curMech.color }">{{ readout.value.toFixed(0) }}%</b></div>
        <div class="inv-track"><div class="inv-fill" :style="{ width: Math.max(2, readout.value) + '%', background: curMech.color }"></div></div>
        <p class="inv-note">{{ readout.note }}</p>
      </div>
    </div>

    <!-- 六机制对照矩阵：一次看到"谁主要打容量、谁主要打内阻、谁主要打安全"。
         单看一个机制永远分不出特点，横向摆在一起才看得出来 —— 这是本页最缺的一件事。 -->
    <div class="mech-matrix panel" v-if="filter === 'all'">
      <div class="mm-head">
        <h5>六种机制对照 <i>同一张表看清各自的"主战场"</i></h5>
        <span class="mm-hint">点任意一行 → 进入该机制专属视图</span>
      </div>
      <div class="mm-grid">
        <div class="mm-row mm-title" aria-hidden="true">
          <span>机制</span><span>容量 ↓</span><span>内阻 ↑</span><span>安全 ⚠</span><span>节奏</span>
        </div>
        <button v-for="m in mechanisms" :key="m.key" type="button" class="mm-row mm-item" @click="filter = m.key">
          <span class="mm-name"><i class="m-dot" :style="{ background: m.color }"></i>{{ m.short }}</span>
          <span v-for="(lv, ci) in m.profile" :key="ci" class="mm-cells">
            <i v-for="n in 3" :key="n" :class="{ on: n <= lv }"
               :style="{ background: n <= lv ? m.color : 'transparent' }"></i>
          </span>
          <span class="mm-pace">{{ m.pace }}</span>
        </button>
      </div>
      <p class="mm-note">强度为<strong>定性三档对照</strong>，用于区分"主要影响什么"，不是量化评分，也不代表实测值。</p>
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

    <VideoSlot id="ch04-sei" />
    <VideoSlot id="ch04-plating" />
    <ChapterGoals :chapter="4" />

    <ChapterFooter conclusion="电池不是在某一天突然坏掉，而是多种微小损伤在一次次循环中共同累积。" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as THREE from 'three'
import { initChart } from '../services/charts.js'
import { createLabScene, PALETTE } from '../three/labScene.js'
import { createCameraFly } from '../three/cameraFly.js'
import { buildAnodeParticles } from '../three/batteryModel.js'
import { mechanisms, AGING_MILESTONES, agingStateAt, PROGRESS_SPAN, cycleToProgress, progressToCycle } from '../data/index.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import ChapterGoals from '../components/ChapterGoals.vue'
import VideoSlot from '../components/VideoSlot.vue'
import DataBadge from '../components/DataBadge.vue'
import IconGlyph from '../components/IconGlyph.vue'
import FingerprintChart from '../components/FingerprintChart.vue'

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
const route = useRoute()

const st = reactive(agingStateAt(0))
const curMech = computed(() => (filter.value === 'all' ? mechanisms[0] : mechanisms.find((m) => m.key === filter.value)))

// 损伤指纹（SVG 自绘）：10 fps 节流更新即可，60 fps 重绘纯属浪费
const fpValues = ref([])
const fpHint = ref('点击任意一瓣，进入该机制专属视图。')

// 单机制聚焦时的专属读数（概念进程对应的相对量，非测量值）
const readout = computed(() => {
  const s = st
  const map = {
    sei: { title: '可循环锂库存', value: (1 - s.seiSeverity * 0.22) * 100, note: 'SEI 每长厚一点，就永久"锁住"一点锂 —— 库存不可逆下降。' },
    plating: { title: '内短路隐患指数', value: s.platingSeverity * 100, note: '枝晶刺穿隔膜即构成内短路；析出的锂失去活性，容量直接损失。' },
    crack: { title: '裂纹扩展程度', value: s.crackSeverity * 100, note: '裂纹暴露新表面、生成更多 SEI，严重时颗粒碎裂并失去电接触。' },
    lam: { title: '失活颗粒比例', value: s.lamSeverity * 100, note: '掉队的颗粒不再参与充放电，容量台阶式下降且不可逆。' },
    electrolyte: { title: '离子传输阻力（相对）', value: Math.min(100, (s.resistance - 1) / 1.4 * 100), note: '电解液被副反应持续消耗，锂离子的"水路"变窄，内阻上升、倍率性能下降。' },
    gas: { title: '鼓胀程度（相对）', value: s.gasSeverity * 100, note: '气体在电芯内积聚，外壳鼓起、界面接触变差，是热失控的前兆信号之一。' }
  }
  return filter.value === 'all' ? null : map[filter.value]
})

watch(progressInput, (p) => { cycle.value = progressToCycle(p) })
watch(cycle, (c) => { progressInput.value = cycleToProgress(c) })
function jump(c) { cycle.value = c; playing.value = false; nodeFlash.value = ''; showSummary.value = false }
function nudge(d) { cycle.value = Math.min(PROGRESS_SPAN, Math.max(0, cycle.value + d)) }
function pausePlay() { playing.value = false; nodeFlash.value = ''; showSummary.value = false }

/* 损伤指纹悬停/聚焦：读出该机制当前严重度（与 3D 同一状态源，数字不会对不上） */
function onFpHover(i) {
  fpHint.value = i == null
    ? '点击任意一瓣，进入该机制专属视图。'
    : `${mechanisms[i].short}：当前相对严重度 ${(fpValues.value[i] * 100).toFixed(0)}% · 点击进入专属视图`
}

/* ══ 3D：三个独立尺度场景（状态同步） ══ */
let scene = null, raf = 0, chart = null
let dendMat = null, heroDendMat = null
const fly = createCameraFly(() => scene)
let outsideGroup, sectionGroup, microGroup
let seiMesh, dendriteGroup, crackLines, particles, electrolyteMesh, elecGhost, bubbles, heatLight, hotZone
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
    b.userData.base = b.position.clone()
    b.userData.phase = i * 0.7
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

  // 电解液"初始体积"参考框：聚焦「电解液减少」时常驻显示，
  // 液体收缩时有个对照，才知道少掉的是哪一块
  elecGhost = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(R * 1.72, H * 0.88, D * 0.95)),
    new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0 })
  )
  g.add(elecGhost)

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
  dendMat = new THREE.MeshStandardMaterial({ color: PALETTE.dendrite, roughness: 0.5, metalness: 0.35, emissive: 0x000000, emissiveIntensity: 0 })
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
  heroDendMat = new THREE.MeshStandardMaterial({ color: 0xdde6f2, roughness: 0.5, metalness: 0.35, emissive: 0x000000, emissiveIntensity: 0 })
  for (let i = 0; i < 14; i++) {
    const needle = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.3 + Math.random() * 0.35, 6), heroDendMat)
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
  // 裂纹用细管而不是 Line：WebGL 的 linewidth 恒为 1px，在颗粒表面细得看不见；
  // 管子有真实粗细、能吃光照，深色裂口才读得出来。半径取 0.02 骑在颗粒表面（半径 0.9）上，
  // 一半陷进颗粒、一半露在外面，看起来就是"长在颗粒上的裂纹"。
  const crackMat = new THREE.MeshStandardMaterial({ color: 0x140b03, roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0 })
  for (let i = 0; i < 6; i++) {
    const pts = []
    // 起点偏向 +z 半球：微观尺度默认机位在 +x +z 一侧，裂纹长在正面才看得见
    let a = 0.25 + Math.random() * 0.85
    for (let s = 0; s < 5; s++) {
      const rr = 0.93 + Math.sin(s) * 0.01
      a += 0.3 + Math.random() * 0.2
      pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a * 1.3) * rr * 0.7, Math.sin(a) * rr * 0.8))
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.02, 6, false), crackMat.clone())
    tube.userData.thresh = (i + 1) / 6
    heroCracks.push(tube)
    g.add(tube)
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

/* 机制聚焦取景：每种机制的"事发地"不同，镜头必须跟着换 ——
   SEI / 析锂长在负极表面（剖面尺度贴近阳极），开裂 / 失活发生在颗粒上（微观尺度），
   电解液减少看整个剖面，产气鼓胀只能在外观尺度看到。
   不换机位的话，六种机制挤在同一取景里，观感上就只剩"都多了一层橙色"。 */
const MECH_FOCUS = {
  sei:         { scale: 'section', pos: [3.8, 1.15, 3.5], tgt: [1.25, 0, 0.1] },
  plating:     { scale: 'section', pos: [4.3, -0.5, 2.3], tgt: [1.3, -0.1, 0.0] },
  crack:       { scale: 'micro',   pos: [2.1, 0.7, 4.4], tgt: [0, -0.1, 0] },
  lam:         { scale: 'micro',   pos: [2.1, 0.7, 4.4], tgt: [0, -0.1, 0] },
  electrolyte: { scale: 'section', pos: [0.3, 1.5, 8.6], tgt: [0, -0.3, 0] },
  gas:         { scale: 'outside', pos: [0, 1.0, 8.4], tgt: [0, -0.1, 0] }
}

/* 选中单一机制 → 切到它的主场尺度并飞行；回到"损伤指纹" → 飞回当前尺度常规机位 */
watch(filter, (f) => {
  if (!scene) return
  const p = f === 'all' ? SCALE_PRESETS[scale.value] : MECH_FOCUS[f]
  if (!p) return
  if (f !== 'all') scale.value = p.scale
  fly.flyTo(p.pos, p.tgt, 1.0)
  const mid = setTimeout(() => {
    outsideGroup.visible = p.scale === 'outside'
    sectionGroup.visible = p.scale === 'section'
    microGroup.visible = p.scale === 'micro'
  }, 450)
  scaleTimers.push(mid)
})

/* 唯一状态源 st → 三个尺度。
   聚焦规则：f = 'all' 时六机制同台；f = 某机制时，只有该机制保持全强度，
   其余淡出到 10%（不是完全隐藏——留一点痕迹才能表达"它们也在，只是不是主角"）。 */
const FOCUS_DIM = 0.1
function applyAging(s) {
  if (!scene) return
  const f = filter.value
  const on = (k) => f === 'all' || f === k
  const dim = (k) => (on(k) ? 1 : FOCUS_DIM)
  const breathe = 1 + 0.015 * Math.sin(clock.elapsedTime * 1.4)

  // ── 剖面尺度：SEI 膜（黄褐薄膜）/ 析锂（银白枝晶）/ 开裂（深色裂纹）/ 电解液（蓝色液体） ──
  seiMesh.scale.x = (0.07 + s.seiSeverity * 0.5) / 0.07
  seiMesh.material.opacity = (0.2 + s.seiSeverity * 0.42) * dim('sei')
  seiMesh.material.emissiveIntensity = on('sei') ? 0.5 : 0.1
  // 析锂聚焦时枝晶放大并微微辉光：针状形貌要能被一眼看见，而不是躲在电极旁边
  dendriteGroup.visible = on('plating') && s.platingSeverity > 0.06
  dendriteGroup.scale.setScalar(on('plating') ? 1.9 : 1)
  dendMat.emissive.setHex(on('plating') ? 0x1e293b : 0x000000)
  dendMat.emissiveIntensity = on('plating') ? 0.85 : 0
  dendriteGroup.children.forEach((c, i) => { c.visible = i / 22 < s.platingSeverity * 1.5 })
  crackLines.forEach((l) => { l.material.opacity = (s.crackSeverity > l.userData.thresh ? 0.62 : 0) * dim('crack') })
  // 聚焦电解液减少时：液体本身提亮一档，并显示初始体积参考框，"变小"才读得出来
  const elecBase = f === 'electrolyte' ? 0.3 : 0.18
  electrolyteMesh.material.opacity = Math.max(0.05, elecBase - s.electrolyteSeverity * 0.13) * dim('electrolyte')
  electrolyteMesh.scale.x = 1 - s.electrolyteSeverity * 0.25
  elecGhost.material.opacity = f === 'electrolyte' ? 0.22 : 0
  // 损伤热区：只在聚焦界面类机制（SEI / 析锂）时亮起，标出"反应发生在哪"
  hotZone.material.opacity = f === 'sei' || f === 'plating'
    ? 0.08 + Math.max(s.seiSeverity, s.crackSeverity, s.platingSeverity) * 0.18
    : 0
  // 颗粒床：失活（变灰）只在材料失活聚焦时发生，应力偏色（开裂前兆）只在开裂聚焦时发生；
  // 聚焦界面类机制（SEI / 析锂）时颗粒床淡出，让膜与枝晶成为画面主角
  particles.mesh.material.transparent = true
  particles.mesh.material.opacity = f === 'sei' || f === 'plating' || f === 'electrolyte' || f === 'gas' ? 0.28 : 1
  particles.update(clock.elapsedTime, {
    lamSeverity: on('lam') ? s.lamSeverity : 0,
    crackSeverity: on('crack') ? s.crackSeverity : 0
  })

  // ── 外观尺度：产气鼓胀（外壳变胖 + 气泡）与温升热线 ──
  const body = outsideGroup.getObjectByName('outsideBody')
  const heatRing = outsideGroup.getObjectByName('heatRing')
  // 产气聚焦：钢壳半透明化，内部气泡才看得见；鼓胀幅度同时放大三倍
  const gasFocus = f === 'gas'
  body.material.transparent = gasFocus
  body.material.opacity = gasFocus ? 0.26 : 1
  body.material.depthWrite = !gasFocus
  const swell = 1 + s.gasSeverity * (gasFocus ? 0.12 : 0.04) * (on('gas') ? 1 : FOCUS_DIM)
  body.scale.set(swell, 1, swell)
  heatRing.material.opacity = Math.min(0.45, (s.temperatureRise - 1) * 0.32) * dim('gas')
  heatLight.intensity = (s.temperatureRise - 1) * 5 * dim('gas')
  bubbles.forEach((b) => {
    b.visible = on('gas') && s.gasSeverity > b.userData.thresh * 0.7
    if (b.visible) b.position.y = b.userData.base.y + Math.sin(clock.elapsedTime * 0.8 + b.userData.phase) * 0.14
  })

  // ── 微观尺度：英雄颗粒的 SEI 壳 / 枝晶 / 裂纹 / 邻居失活 ──
  // 开裂聚焦时颗粒"呼吸"幅度加大：应力累积导致的体积变化被夸张，才看得出它在受罪
  const crackPulse = on('crack') ? 1 + s.crackSeverity * 0.09 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2)) : 1
  heroP.scale.setScalar(breathe * crackPulse)
  heroSei.scale.setScalar(1 + s.seiSeverity * 0.28)
  heroSei.material.opacity = (0.1 + s.seiSeverity * 0.34) * dim('sei')
  heroSei.material.emissiveIntensity = on('sei') ? 0.45 : 0.1
  heroStress.material.opacity = on('crack') && s.crackSeverity > 0.04 && s.crackSeverity < 0.95 ? Math.max(0, (0.62 - Math.abs(s.crackSeverity - 0.42)) * 1.05) : 0
  heroDendrites.children.forEach((d) => { d.visible = on('plating') && s.platingSeverity > d.userData.thresh * 0.8 })
  heroDendrites.scale.setScalar(on('plating') ? 1.35 : 1)
  heroDendMat.emissive.setHex(on('plating') ? 0x1e293b : 0x000000)
  heroDendMat.emissiveIntensity = on('plating') ? 0.7 : 0
  heroCracks.forEach((l) => { l.material.opacity = (s.crackSeverity > l.userData.thresh ? 0.92 : 0) * dim('crack') })
  heroNeighbors.forEach((n) => {
    const dead = n.userData.idx / 7 < (on('lam') ? s.lamSeverity : 0)
    n.material.color.set(dead ? PALETTE.dead : PALETTE.anode)
    // 失活颗粒同时"褪色 + 缩小 + 脱连接"，三个信号叠起来才看得出"掉队"
    n.scale.setScalar(dead ? 0.8 : 1)
    const detach = dead ? 0.5 + (n.userData.idx % 3) * 0.15 : 0
    n.position.copy(n.userData.base).multiplyScalar(1 + detach * 0.42)
    n.position.y += detach * 0.5
    n.userData.link.material.opacity = dead ? 0.05 : 0.35
    n.userData.link.geometry.setFromPoints([n.position.clone(), new THREE.Vector3(0, 0, 0)])
  })
}

/* 尺度切换：真实的不同场景 + 连续镜头推进（约 1 秒）。
   镜头推进交给 cameraFly（手写 rAF 插值）—— 原先是 gsap.to(camera.position)，
   会被 OrbitControls 每帧 update() 用球坐标 + 未消化的阻尼残留推回去，
   表现为"点了尺度但镜头停在中途"，与结构页当初那个 bug 同源。 */
const SCALE_PRESETS = {
  outside: { pos: [0, 1.0, 8.4], tgt: [0, -0.1, 0] },
  section: { pos: [0.3, 1.5, 8.6], tgt: [0, -0.3, 0] },
  micro: { pos: [2.1, 0.7, 4.4], tgt: [0, -0.1, 0] }
}

function setScale(k) {
  scale.value = k
  if (!scene) return
  const p = SCALE_PRESETS[k]
  fly.flyTo(p.pos, p.tgt, 1.0)
  const mid = setTimeout(() => {
    outsideGroup.visible = k === 'outside'
    sectionGroup.visible = k === 'section'
    microGroup.visible = k === 'micro'
  }, 450)
  scaleTimers.push(mid)
}

/* 重置视角：回到当前尺度自己的取景（每个尺度的正确站位不同），而不是笼统回原点。 */
function resetView() {
  if (!scene) return
  const p = SCALE_PRESETS[scale.value] || SCALE_PRESETS.section
  fly.flyTo(p.pos, p.tgt, 0.6)
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

onMounted(async () => {
  await nextTick()
  // 三个尺度的取景各不相同（微观测度的机位最近，只有约 4.9），
  // 所以 minDistance 必须低于最紧的那一档，否则 OrbitControls 每帧都会把
  // 刚飞到的机位往外推，镜头永远停不到预设位置。
  scene = createLabScene(threeBox.value, {
    cameraPos: SCALE_PRESETS.section.pos,
    fov: 42,
    controls: {
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
      zoomSpeed: 0.42,
      rotateSpeed: 0.55,
      panSpeed: 0.72,
      screenSpacePanning: true,
      dampingFactor: 0.055,
      minDistance: 3.8,
      maxDistance: 16,
      minPolarAngle: Math.PI * 0.12,
      maxPolarAngle: Math.PI * 0.88,
      target: SCALE_PRESETS.section.tgt
    }
  })
  scene.controls.target.set(...SCALE_PRESETS.section.tgt)
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

  // 链接直达某一机制的专属视图（演示与自查都能用）：
  // #/aging?mech=plating&cycle=320 —— mech 取机制 key，cycle 取概念进程 0—100
  const q = route.query
  if (q.scale && SCALE_PRESETS[q.scale]) scale.value = q.scale
  if (q.mech && mechanisms.some((m) => m.key === q.mech)) filter.value = q.mech
  if (q.cycle != null && !Number.isNaN(+q.cycle)) cycle.value = progressToCycle(+q.cycle)

  chart = initChart(chartBox.value)
  chart.setOption(chartOption(view.value, st))
  chart.on('click', (p) => { if (p.name != null) jump(progressToCycle(+p.name)) })

  fpValues.value = fingerValue(st)

  window.addEventListener('resize', onChartResize)

  let nodeHold = 0
  let lastNodeIdx = -1
  let lastFpAt = 0
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
    fly.step(dt)
    // 损伤指纹按 10 fps 节流刷新（数值来自同一状态源，不会与动画脱节）
    if (filter.value === 'all' && clock.elapsedTime - lastFpAt > 0.1) {
      lastFpAt = clock.elapsedTime
      fpValues.value = fingerValue(st)
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
  fly.cancel()
  clearTimeout(summaryTimer)
  scaleTimers.forEach(clearTimeout)
  window.removeEventListener('resize', onChartResize)
  chart?.dispose()
  if (scene) scene.dispose()
})
</script>

<style scoped lang="scss">
.aging { display: flex; flex-direction: column; gap: 20px;
  // 首屏高度预算：舞台与控制塔同高，均随视口高度自适应，
  // 矮屏自动压扁，保证「章节标题 + 3D 舞台 + 右侧控制卡」在一屏内完整可见。
  --stage-h: clamp(400px, calc(100vh - 250px), 560px);
}
.head { position: relative;
  .badge-line { position: absolute; right: 0; top: 8px; display: inline-flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-2); }
}
.obs { display: grid; grid-template-columns: 1.9fr 1fr; gap: 18px; align-items: start; }
.stage { position: relative; height: var(--stage-h); overflow: hidden; min-width: 0; }
.three-box { position: absolute; inset: 0; cursor: grab; }
.scale-row { position: absolute; left: 14px; top: 14px; display: flex; gap: 8px; z-index: 4;
  .btn-ghost { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 8px 14px;
    b { font-size: 14.5px; }
    i { font-style: normal; font-size: 14px; color: var(--text-3); } } }
.mech-row { position: absolute; left: 14px; bottom: 14px; display: flex; gap: 7px; flex-wrap: wrap; z-index: 4; max-width: 72%;
  .mech-btn { padding: 6px 12px; font-size: 14px; } }
.m-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: 1px;
  &.big { width: 12px; height: 12px; margin-right: 9px; box-shadow: 0 0 5px currentColor; } }
.geom-note { position: absolute; right: 14px; bottom: 12px; z-index: 4; max-width: 46%;
  font-size: 14px; line-height: 1.55; text-align: right; color: var(--text-3); opacity: 0.86; pointer-events: none; }
/* 聚焦提示：桌面浮在舞台顶部中央（左右两侧分别是尺度切换与读数，不冲突） */
.focus-note { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); z-index: 4; max-width: 52%;
  padding: 6px 14px; border: 1px solid var(--hairline); border-radius: 999px;
  background: rgba(13, 18, 32, 0.78); backdrop-filter: blur(6px);
  font-size: 14px; line-height: 1.5; text-align: center; color: var(--text-2); pointer-events: none; }
.stage-right { position: absolute; right: 14px; top: 14px; z-index: 4;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.cycle-read { padding: 9px 16px; display: flex; gap: 10px; align-items: center;
  i { font-style: normal; font-size: 14px; color: var(--text-2); }
  b { font-size: 19px; color: var(--cyan); }
  .soh { color: var(--green); } }
.view-tools { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.view-reset { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; padding: 6px 12px; }
.view-hint { font-size: 14px; color: var(--text-3); letter-spacing: 0.02em;
  .vh-touch { display: none; } }

.side { display: flex; flex-direction: column; gap: 12px; }
.ctrl-tower { display: flex; flex-direction: column; gap: 12px; max-height: var(--stage-h); overflow-y: auto; padding-right: 2px; }
.pm-row { display: flex; gap: 8px;
  .btn-ghost { padding: 5px 12px; font-size: 14px; } }
.mech-card { padding: 15px 16px;
  .mech-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h4 { font-size: 17.5px; color: var(--text-1); display: flex; align-items: center; }
  .term { display: block; font-style: normal; font-size: 14px; color: var(--text-2); margin-top: 3px; }
  /* 机制特征签名：三条区分轴 + 节奏 + 可逆性，一眼看出这个机制"打哪儿" */
  .m-sig {
    display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center;
    margin-top: 10px; padding: 8px 10px;
    border: 1px solid var(--hairline); border-radius: 9px;
    background: rgba(77, 168, 255, 0.05);
  }
  .sig-item { display: inline-flex; align-items: center; gap: 6px;
    .sig-lab { font-size: 14px; color: var(--blue); }
    &.wide { flex-basis: 100%; b { font-size: 14px; font-weight: 500; color: var(--text-2); } } }
  .sig-dots { display: inline-flex; gap: 3px;
    i { width: 7px; height: 7px; border-radius: 50%; border: 1px solid var(--hairline-strong); } }
  dl { margin-top: 10px; display: grid; grid-template-columns: 84px 1fr; gap: 7px 10px;
    dt { font-size: 14px; color: var(--blue); }
    dd { font-size: 14.5px; color: var(--text-2); line-height: 1.62; } }
  .pro { margin-top: 14px; border-top: 1px solid var(--hairline); padding-top: 12px;
    .eq { font-size: 17px; color: var(--cyan); background: rgba(34,211,238,0.07); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; }
    p { font-size: 14.5px; color: var(--text-2); line-height: 1.8; margin-bottom: 6px; b { color: var(--text-1); } }
    .disclaim { font-size: 14px; color: var(--text-3); } } }

.info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
  /* 单机制聚焦：读数面板独占一行，不留半幅空白 */
  &.solo { grid-template-columns: minmax(0, 1fr); } }

/* ── 六机制对照矩阵 ── */
.mech-matrix { padding: 14px 16px; margin-top: 18px;
  .mm-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;
    h5 { font-size: 15px; color: var(--text-1); i { font-style: normal; font-size: 14px; color: var(--text-3); margin-left: 8px; } }
    .mm-hint { font-size: 14px; color: var(--text-3); } }
  .mm-grid { display: flex; flex-direction: column; gap: 2px; }
  .mm-row { display: grid; grid-template-columns: minmax(96px, 1.1fr) 64px 64px 64px minmax(0, 2.4fr);
    align-items: center; gap: 6px; padding: 6px 8px; border-radius: 7px; }
  .mm-title { font-size: 14px; letter-spacing: 0.06em; color: var(--text-3); padding-bottom: 2px;
    span:not(:first-child) { text-align: center; } }
  .mm-item { border: 0; background: transparent; color: var(--text-2); font: inherit; text-align: left; cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease;
    &:hover { background: rgba(77, 168, 255, 0.1); color: var(--text-1); } }
  .mm-name { display: inline-flex; align-items: center; font-size: 14.5px; white-space: nowrap; }
  .mm-cells { display: inline-flex; gap: 3px; justify-content: center;
    i { width: 8px; height: 8px; border-radius: 50%; border: 1px solid var(--hairline-strong); } }
  .mm-pace { font-size: 14px; color: var(--text-2); }
  .mm-note { margin-top: 10px; font-size: 14px; color: var(--text-3); line-height: 1.65;
    strong { color: var(--text-2); font-weight: 600; } }
}
@media (max-width: 767px) {
  /* 窄屏：矩阵改两行式（机制名 + 三个强度），节奏文字换行掉到下面 */
  .mech-matrix {
    .mm-row { grid-template-columns: minmax(84px, 1fr) 46px 46px 46px; }
    .mm-pace { display: none; }
    .mm-title span:last-child { display: none; }
  }
}

.finger { padding: 14px 16px;
  h5 { font-size: 15px; color: var(--text-1); i { font-style: normal; font-size: 14px; color: var(--text-3); margin-left: 8px; } }
  .finger-hint { font-size: 14px; color: var(--text-3); text-align: center; } }
.inv { padding: 14px 16px;
  .inv-head { display: flex; justify-content: space-between; font-size: 14.5px; color: var(--text-2); b { color: var(--cyan); } }
  .inv-track { height: 8px; border-radius: 4px; background: rgba(77,168,255,0.1); margin-top: 8px; overflow: hidden; }
  .inv-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--blue)); border-radius: 4px; transition: width 0.3s; }
  .inv-note { font-size: 14px; color: var(--text-3); margin-top: 7px; line-height: 1.6; } }

.ctrl { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
  // "循环播放"这个 checkbox 原先没有任何样式：`.switch` 只在 DataLabView / PrincipleView
  // 的 scoped 块里定义过，跨组件不生效，于是它渲染成系统原生复选框，和全站控件不是一套皮。
  .switch { display: flex; align-items: center; gap: 8px; font-size: 14.5px; color: var(--text-2); cursor: pointer;
    input { accent-color: var(--blue); width: 15px; height: 15px; } }
  .slider-row { display: flex; align-items: center; gap: 12px;
    input { flex: 1; }
    .pct { color: var(--cyan); min-width: 46px; text-align: right; font-size: 17px; } }
  .caliber { font-size: 14px; color: var(--text-3); line-height: 1.52; }
  .milestones { display: flex; gap: 6px; flex-wrap: wrap;
    .sm { padding: 4px 10px; font-size: 14px; } }
  .play-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    .play-main { padding: 9px 22px; font-size: 17px; }
    .step-group { display: flex; gap: 6px; }
    .icon { width: 36px; height: 36px; justify-content: center; font-size: 14px; }
    .loop { margin-left: auto; font-size: 14.5px; } }
  .speeds { display: flex; align-items: center; gap: 6px; padding-top: 8px; border-top: 1px solid var(--hairline);
    .speeds-label { font-size: 14px; color: var(--text-3); margin-right: 2px; }
    .btn-ghost { padding: 5px 12px; font-size: 14px; } }
  .summary { font-size: 14px; color: var(--cyan); background: rgba(34,211,238,0.08); padding: 8px 12px; border-radius: 8px;
    &.node-flash { color: var(--amber); background: rgba(245,158,11,0.08); } } }

.charts { padding: 18px; }
.chart-tabs { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; flex-wrap: wrap;
  .hint { font-size: 14px; color: var(--text-3); margin-left: auto; } }
.chart-box { height: 300px; }
.chart-caliber { margin-top: 8px; font-size: 14px; color: var(--text-3); }
/* 平板 / 窄笔记本：双栏塌成单栏。舞台仍是"画布铺满 + 浮层绝对定位"的桌面思路 —— 这个宽度还放得下 */
@media (max-width: 1080px) {
  .obs { grid-template-columns: minmax(0, 1fr); }
  .stage { height: clamp(340px, 56vh, 470px); }
  .ctrl-tower { max-height: none; overflow: visible; padding-right: 0; }
  .info-row { grid-template-columns: 1fr; }
  .view-hint { display: none; }
}

/* 手机：画布独占舞台、零遮挡；读数 / 尺度 / 机制 / 说明按层级排到画布下方。
   桌面那套浮层在 353px 宽的舞台里会互相压叠并把模型挤没（实测"0%"与"粒"直接叠字），
   所以这里把定位全部取消，改用 flex + order 重排，DOM 顺序不动。
   桌面（≥768px）与平板观感完全不受影响。 */
@media (max-width: 767px) {
  .aging { --stage-h: clamp(280px, 42vh, 380px); }

  .stage {
    display: flex; flex-direction: column; gap: 10px;
    height: auto; padding: 12px;
  }
  .three-box {
    position: static; order: 1;
    height: var(--stage-h);
    border-radius: 12px; overflow: hidden;
  }
  .stage-right {
    position: static; order: 2; width: 100%;
    flex-direction: column; align-items: stretch; gap: 8px;
  }
  .cycle-read { justify-content: flex-start; padding: 8px 14px; gap: 9px;
    i { font-size: 14px; }
    b { font-size: 17px; } }
  .view-tools { flex-direction: row; align-items: center; justify-content: space-between; gap: 10px; }
  .view-reset { min-height: 44px; padding: 8px 14px; font-size: 14.5px; }
  .view-hint { display: block; font-size: 14px;
    .vh-mouse { display: none; }
    .vh-touch { display: inline; } }
  .scale-row {
    position: static; order: 3; width: 100%;
    .btn-ghost { flex: 1; min-height: 48px; padding: 8px 10px;
      b { font-size: 15px; }
      i { font-size: 14px; } } }
  .mech-row {
    position: static; order: 4; width: 100%; max-width: none;
    .btn-ghost { min-height: 44px; padding: 8px 13px; font-size: 14.5px; } }
  .geom-note {
    position: static; order: 6; max-width: none;
    font-size: 14px; text-align: left;
  }
  .focus-note {
    position: static; order: 5; max-width: none; transform: none;
    font-size: 14px; text-align: left; border-radius: var(--radius-sm);
  }

  /* 控制塔里的触摸目标统一撑到 44px —— 手机上按钮偏小极易点错 */
  .ctrl {
    .milestones .btn-ghost { min-height: 44px; padding: 8px 14px; font-size: 14.5px; }
    .play-main { min-height: 48px; }
    .step-group .btn-ghost { min-width: 48px; min-height: 48px; font-size: 14.5px; }
    .speeds .btn-ghost { min-height: 44px; min-width: 52px; }
    .switch { min-height: 44px; align-items: center; }
    .switch input[type='checkbox'] { width: 20px; height: 20px; }
    .caliber { font-size: 14px; }
  }
  .pm-row .btn-ghost { min-height: 44px; padding: 8px 16px; font-size: 15px; }
  .mech-card .term { font-size: 14px; }
  .chart-tabs .btn-ghost { min-height: 44px; padding: 8px 16px; font-size: 14.5px; }
  .chart-tabs .hint, .chart-caliber { font-size: 14px; }
  .finger-hint, .inv-note { font-size: 14px; }
}
</style>
