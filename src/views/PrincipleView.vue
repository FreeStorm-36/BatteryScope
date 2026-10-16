<template>
  <div class="page-full principle">
    <header class="head">
      <p class="chapter-eyebrow">Chapter 03 · 充放电实验台</p>
      <h2 class="chapter-title">亲手完成一次充放电</h2>
      <p class="chapter-sub">锂离子走内部，电子走外部；两条不同的路，共同完成能量交换。</p>
      <span class="corner badge-line"><DataBadge type="concept" />原理示意 · 简化通用电芯</span>
    </header>

    <div class="bench">
      <div class="stage panel" ref="stageBox">
        <div ref="threeBox" class="three-box"></div>

        <!-- 常驻图例 -->
        <div class="legend">
          <span class="lg"><i class="dot li"></i>Li⁺ 锂离子（内部）</span>
          <span class="lg"><i class="dot el"></i>e⁻ 电子（外部）</span>
        </div>
        <!-- 右上：状态角标 + 视角工具（纵向排，避免和角标重叠） -->
        <div class="stage-right">
          <div class="state-tag panel-glass" :class="mode">
            <b>{{ modeName }}</b>
            <i>{{ stateHint }}</i>
          </div>
          <div class="view-tools">
            <button class="btn-ghost view-reset" title="恢复到初始角度与距离" @click="resetView">
              <IconGlyph name="reset" /> 重置视角
            </button>
            <p class="view-hint">
              <span class="vh-mouse">拖拽旋转 · 滚轮缩放 · 右键平移</span>
              <span class="vh-touch">单指旋转 · 双指缩放与平移</span>
            </p>
          </div>
        </div>

        <!-- 结构标签（高级显示） -->
        <template v-if="showLabels">
          <span v-for="l in labelScreens" :key="l.name" class="label-tag panel-glass" :style="{ left: l.x + 'px', top: l.y + 'px' }">{{ l.name }}</span>
        </template>

        <!-- 底部：0-100% 实验进度轴 -->
        <div class="timeline panel-glass">
          <input type="range" min="0" max="1" step="0.001" v-model.number="progress" @input="playing = false" />
          <div class="kp-row">
            <button v-for="kp in KEYPOINTS" :key="kp.p" class="kp" :class="{ on: progress >= kp.p }" :style="{ left: kp.p * 100 + '%' }" @click="jumpTo(kp)" :title="kp.name">
              <span class="kp-dot"></span><span class="kp-name">{{ kp.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <aside class="controls">
        <!-- 两个主任务 -->
        <div class="task-row">
          <button class="btn-primary task-btn" :class="{ live: mode === 'charge' }" @click="startTask('charge')">观看充电</button>
          <button class="btn-primary task-btn alt" :class="{ live: mode === 'discharge' }" @click="startTask('discharge')">观看放电</button>
        </div>
        <div class="sub-row">
          <button class="btn-ghost" :class="{ active: mode === 'idle' }" @click="setIdle">静置观察</button>
          <button class="btn-ghost icon" :aria-label="playing ? '暂停' : '播放'" @click="playing = !playing"><IconGlyph :name="playing ? 'pause' : 'play'" /></button>
          <button class="btn-ghost icon" @click="step(-0.04)">←</button>
          <button class="btn-ghost icon" @click="step(0.04)">→</button>
          <div class="speed">
            <button v-for="s in [0.5, 1, 1.5]" :key="s" class="btn-ghost num" :class="{ active: speed === s }" @click="speed = s">{{ s }}×</button>
          </div>
        </div>

        <!-- 三大读数 -->
        <div class="readouts">
          <div class="ro panel"><i>SOC</i><b class="num cyan">{{ (soc * 100).toFixed(0) }}%</b><u>荷电状态</u></div>
          <div class="ro panel"><i>电压</i><b class="num">{{ voltage.toFixed(2) }}</b><u>V</u></div>
          <div class="ro panel"><i>功率</i><b class="num">{{ powerW.toFixed(1) }}</b><u>W</u></div>
        </div>
        <p class="ocv-note">电压按线性化 OCV 估算（3.0 → 4.2 V）；真实开路电压曲线中段更平、两端更陡，这里是教学简化，不代表实测曲线。电流按倍率取 1C 的整数倍（BS-01 为 26650 / 5 Ah，1C = 5.0 A）。</p>

        <!-- 阶段解释卡（三层固定结构） -->
        <transition name="fade-slide" mode="out-in">
          <div class="explain panel" :key="explain.k">
            <b>{{ explain.title }}</b>
            <dl>
              <dt>发生了什么</dt><dd>{{ explain.what }}</dd>
              <dt>为什么</dt><dd>{{ explain.why }}</dd>
              <dt>能量去了哪里</dt><dd>{{ explain.energy }}</dd>
            </dl>
            <button v-if="explain.deep" class="btn-ghost deep-btn" @click="deepOpen = !deepOpen">{{ deepOpen ? '收起深入理解' : '深入理解' }}</button>
            <transition name="fade-slide">
              <div v-if="deepOpen && explain.deep" class="deep">
                <p v-for="(d, i) in explain.deep" :key="i">· {{ d }}</p>
              </div>
            </transition>
          </div>
        </transition>

        <!-- 高级显示 -->
        <details class="advanced">
          <summary>深入观察 / 高级显示</summary>
          <div class="adv-body">
            <div class="rate-row">
              <span>充电倍率</span>
              <button v-for="r in [0.5, 1, 2]" :key="r" class="btn-ghost num" :class="{ active: rate === r }" @click="rate = r">{{ r }}C</button>
              <i class="rate-note">倍率改变电流与极化，播放速度只改变动画快慢</i>
            </div>
            <label class="switch"><input type="checkbox" v-model="showLiPath" /><span>显示 Li⁺ 内部路径</span></label>
            <label class="switch"><input type="checkbox" v-model="showEPath" /><span>显示电子外部路径</span></label>
            <label class="switch"><input type="checkbox" v-model="showLabels" /><span>结构标签</span></label>
          </div>
        </details>
      </aside>
    </div>

    <!-- 能量去向 -->
    <div class="energy panel">
      <div class="e-row" v-for="e in energyBars" :key="e.name">
        <span>{{ e.name }}</span>
        <div class="e-track"><div class="e-fill" :class="e.cls" :style="{ width: e.v + '%' }"></div></div>
        <b class="num">{{ e.v.toFixed(0) }}%</b>
      </div>
      <p class="e-caliber">能量占比为定性示意，用于建立"能量去了哪里"的直觉。</p>
    </div>

    <!-- 与第 4 页的桥接 -->
    <transition name="fade-slide">
      <div v-if="bridgeReady" class="bridge panel-glass">
        <p>一次往返几乎看不出变化；当它重复数百次，微小副反应会留下痕迹。</p>
        <router-link to="/aging" class="btn-primary">观察时间留下的痕迹 →</router-link>
      </div>
    </transition>

    <VideoSlot id="ch03-ion-path" />
    <VideoSlot id="ch03-cccv" />
    <ChapterGoals :chapter="3" />

    <ChapterFooter conclusion="锂离子走内部，电子走外部；两条不同的路，共同完成能量交换。" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as THREE from 'three'
import { createLabScene, PALETTE, pool } from '../three/labScene.js'
import { createCameraFly } from '../three/cameraFly.js'
import { buildParticleFlow } from '../three/batteryModel.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import ChapterGoals from '../components/ChapterGoals.vue'
import VideoSlot from '../components/VideoSlot.vue'
import DataBadge from '../components/DataBadge.vue'
import IconGlyph from '../components/IconGlyph.vue'

const KEYPOINTS = [
  { p: 0.02, name: '接通' },
  { p: 0.35, name: '迁移' },
  { p: 0.66, name: '储能 / 做功' },
  { p: 0.95, name: '接近结束' }
]

const mode = ref('idle')            // idle | charge | full | discharge
const playing = ref(false)
const speed = ref(1)                // 动画速度：只改变时间快慢
const rate = ref(1)                 // 充电倍率 C：改变电流/通量/极化
const progress = ref(0.5)           // 实验进度 0-1（进度≠SOC刻度，SOC 由电化学关系导出）
const showLiPath = ref(true)
const showEPath = ref(true)
const showLabels = ref(false)       // 高级显示，默认关
const deepOpen = ref(false)
const bridgeReady = ref(false)      // 完整跑过一次充电+放电后出现
const didCharge = ref(false), didDischarge = ref(false)
const threeBox = ref(null)
const stageBox = ref(null)
const labelScreens = ref([])

const modeName = computed(() => ({ idle: '静置', charge: '充电中', full: '已充满', discharge: '放电中' }[mode.value]))
const stateHint = computed(() => ({ idle: '电路断开 · 热运动', charge: '外电源供能', full: '能量已储存', discharge: '负载做功' }[mode.value]))

// SOC 与实验进度用固定演示关系（BS-01：26650 / 5000 mAh 概念电芯，OCV 3.0-4.2V）
const soc = computed(() => progress.value)
// 1C 的定义就是"1 小时充满/放完额定容量所需电流"。BS-01 是第一页那枚 26650 概念电芯，
// 额定容量 5000 mAh（见 HomeView 的 buildCylindricalCell({ capacity: 5000 })），
// 所以 1C = 5.0 A。旧值 2.2 A 是早期 2.2 Ah 设定的残留，与页面上标注的"1C"矛盾（已订正）。
// 注：由 21700 改为 26650 只动外形尺寸，标称容量仍是 5000 mAh，所以 1C 不变。
const I1C = 5.0
const cccv = computed(() => {
  // 充电末段电流衰减（CC-CV 概念）
  const p = progress.value
  return p > 0.85 ? Math.max(0.15, 1 - (p - 0.85) / 0.15 * 0.85) : 1
})
const currentA = computed(() => {
  // 充放电都按所选倍率取 1C 的整数倍，不再另乘一个凭空的系数——
  // 页面上按钮写的是 0.5C / 1C / 2C，读数就应该是 2.5 / 5.0 / 10.0 A。
  if (mode.value === 'charge') return +(I1C * rate.value * cccv.value).toFixed(2)
  if (mode.value === 'discharge') return +(I1C * rate.value).toFixed(2)
  return 0
})
const voltage = computed(() => {
  let ocv = 3.0 + 1.2 * progress.value
  const p = progress.value
  if (mode.value === 'charge' && playing.value) ocv += 0.06 + 0.05 * rate.value      // 极化抬升
  if (mode.value === 'discharge' && playing.value) ocv -= 0.05 + 0.04 * rate.value   // 极化跌落
  if (mode.value === 'discharge' && p < 0.1) ocv -= (0.1 - p) * 3.2                  // 末端电压跌落
  return Math.max(2.5, ocv)
})
const powerW = computed(() => +(voltage.value * currentA.value).toFixed(1))

const explain = computed(() => {
  const p = progress.value
  if (mode.value === 'charge') {
    if (p > 0.92) return {
      k: 'c-full', deep: ['CC—CV：恒流充到上限电压后转恒压，电流自动下降。', '此时继续大电流充电，负极表面可能析出金属锂。'],
      title: '接近充满 · 自动减速',
      what: '电流读数正在下降，Li⁺ 进入负极的速度变慢。',
      why: '负极嵌锂接近上限，"座位"快满了，反应阻力变大。',
      energy: '电能仍在输入，但更多转化为极化发热，化学能增速放缓。'
    }
    return {
      k: 'c', deep: ['集流体：正极用铝、负极用铜，负责把电流汇集引出。', '嵌入（intercalation）：Li⁺ 进入石墨层间，而不是附着在表面。'],
      title: '充电 · 能量存入',
      what: `电子被电源推向负极（${currentA.value.toFixed(1)} A）；Li⁺ 从正极脱出，穿过隔膜进入负极。`,
      why: '外电源把电子"泵"到负极，正极失去锂而带正电，Li⁺ 被静电引力牵引过去。',
      energy: '电能 → 化学能（储存在负极的锂中）+ 少量热（极化）。'
    }
  }
  if (mode.value === 'discharge') {
    if (p < 0.08) return {
      k: 'd-empty', deep: ['过放会让铜集流体溶解， reinstating 后形成短路隐患。'],
      title: '电量耗尽 · 停止放电',
      what: '电压快速下跌，演示在低压处自动停止。',
      why: '负极可脱出的锂几乎用尽，电压撑不住了。',
      energy: '继续放电不会"榨出"能量，只会损伤电池。'
    }
    return {
      k: 'd', deep: ['灯泡亮度 ∨ 功率 = 电压 × 电流，肉眼读功率。'],
      title: '放电 · 能量释放',
      what: `电子经负载从负极回到正极（${currentA.value.toFixed(1)} A），灯泡被点亮；Li⁺ 穿过隔膜回到正极。`,
      why: '负极富锂与正极缺锂之间存在化学势差，驱动电子做定向移动。',
      energy: '化学能 → 电能（负载做功）+ 少量热。'
    }
  }
  if (mode.value === 'full') return {
    k: 'full', deep: ['满电不等于所有锂都移到同一侧——大部分进入负极，仍有少量留在正极与电解液中。'],
    title: '已充满 · 能量储存',
    what: '大部分 Li⁺ 位于负极石墨层间，电路断开，粒子只剩轻微热运动。',
    why: '充电把锂"搬运"到了负极，此刻没有回路，搬运停止。',
    energy: '能量以化学能形式储存在电极材料中。'
  }
  return {
    k: 'idle', deep: ['有电压不代表正在有电流——还需要一条导通的回路。'],
    title: '静置 · 蓄势',
    what: '内部 Li⁺ 只做微小的热运动；外部电路断开，电子不流动。',
    why: '没有闭合回路，即使有电压也无法形成电流。',
    energy: '能量安静地以化学能形式待在电池里。'
  }
})

const energyBars = computed(() => {
  const p = progress.value
  if (mode.value === 'charge') {
    const eff = cccv.value
    return [
      { name: '化学能（储存）', v: p * 92, cls: 'chem' },
      { name: '电能（输入中）', v: playing.value ? 88 * eff : 0, cls: 'elec' },
      { name: '热（极化损耗）', v: playing.value ? 6 + 8 * (1 - eff) : 2, cls: 'loss' }
    ]
  }
  if (mode.value === 'discharge') {
    return [
      { name: '化学能（剩余）', v: p * 92, cls: 'chem' },
      { name: '电能（输出中）', v: playing.value ? 80 : (p > 0.02 ? 40 : 0), cls: 'elec' },
      { name: '热（内阻损耗）', v: playing.value ? 7 : 2, cls: 'loss' }
    ]
  }
  return [
    { name: '化学能（储存）', v: p * 92, cls: 'chem' },
    { name: '电能', v: 0, cls: 'elec' },
    { name: '热', v: 0, cls: 'loss' }
  ]
})

function startTask(k) {
  mode.value = k
  deepOpen.value = false
  if (k === 'charge' && progress.value >= 0.995) progress.value = 0.03
  if (k === 'discharge' && progress.value <= 0.005) progress.value = 0.97
  playing.value = true
}
function setIdle() { mode.value = 'idle'; playing.value = false }
function jumpTo(kp) {
  playing.value = false
  progress.value = kp.p
  if (kp.p < 0.05) progress.value = mode.value === 'discharge' ? 0.97 : 0.03
}
function step(d) {
  playing.value = false
  progress.value = Math.min(1, Math.max(0, progress.value + d))
}

// ── 3D ──
let scene = null, raf = 0
const fly = createCameraFly(() => scene)
/* 取景基准：电芯本体高 3.4、半径 2.2，外接电源/灯泡挂在 y≈3.0、x≈±1.9，
   加上两侧导线后整体约 6.6 宽 × 4.7 高（建模时已整体缩放 0.9）。
   相机距目标 9.4、fov 40 → 目标平面可视高度 2×9.4×tan20° ≈ 6.8，模型占画幅约七成，
   留出的余量刚好让左下/右下的控件不压到模型。 */
const HOME_POS = [0, 1.35, 9.4]
const HOME_TARGET = [0, 0.74, 0]
let liFlow, eFlow, liPathLine, ePathL, ePathR, bulbMat, bulbGlow, chargerMat, arrowsL = [], arrowsR = []
let labelAnchors = [], builtCurves = null
const clock = new THREE.Clock()

function buildCutaway() {
  const g = new THREE.Group()
  const H = 3.4, D = 1.7, R = 2.2

  const shellMat = new THREE.MeshStandardMaterial({ color: PALETTE.shell, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide, transparent: true, opacity: 0.96 })
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true, Math.PI, Math.PI), shellMat)
  g.add(shell)
  const capGeo = new THREE.CircleGeometry(R, 48, Math.PI, Math.PI)
  for (const y of [H / 2, -H / 2]) {
    const cap = new THREE.Mesh(capGeo, shellMat)
    cap.rotation.x = y > 0 ? -Math.PI / 2 : Math.PI / 2
    cap.position.y = y
    g.add(cap)
  }

  const layer = (w, color, x, opts = {}) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, H * 0.86, D * 0.86),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2, transparent: !!opts.trans, opacity: opts.trans ?? 1, emissive: opts.em ?? 0x000000, emissiveIntensity: 0.4 })
    )
    m.position.x = x
    m.name = opts.name || 'layer'
    g.add(m)
    return m
  }
  layer(0.1, PALETTE.aluminium, -R + 0.5, { name: '正极集流体（铝）' })
  layer(0.72, PALETTE.cathode, -R + 0.95, { name: '正极材料' })
  layer(0.26, PALETTE.separator, 0, { name: '隔膜', trans: true, opacity: 0.55 })
  layer(0.72, PALETTE.anode, R - 0.95, { name: '负极材料' })
  layer(0.1, PALETTE.copper, R - 0.5, { name: '负极集流体（铜）' })

  const electrolyte = new THREE.Mesh(
    new THREE.BoxGeometry(R * 1.75, H * 0.9, D * 0.95),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, transparent: true, opacity: 0.13, roughness: 0.2 })
  )
  electrolyte.name = '电解液'
  g.add(electrolyte)

  // 外部电路：左=充电电源支路，右=负载支路
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x9db4d8, roughness: 0.4, metalness: 0.7 })
  const mkBranch = (dirX) => {
    const pts = [
      new THREE.Vector3(dirX * (R - 0.5), H * 0.43, 0),
      new THREE.Vector3(dirX * (R + 0.3), H * 0.64, 0),
      new THREE.Vector3(dirX * (R + 0.3), H * 0.88, 0),
      new THREE.Vector3(dirX * 0.62, H * 0.88, 0)
    ]
    const curve = new THREE.CatmullRomCurve3(pts)
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.035, 8), wireMat)
    g.add(tube)
    return curve
  }
  const leftCurve = mkBranch(-1)
  const rightCurve = mkBranch(1)
  builtCurves = { left: leftCurve, right: rightCurve }

  // 方向箭头（稀疏、随分支显示）
  const mkArrows = (curve, count) => {
    const arr = []
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.electron, transparent: true, opacity: 0.9 })
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const pos = curve.getPointAt(t)
      const tan = curve.getTangentAt(t)
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 10), mat.clone())
      cone.position.copy(pos)
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan)
      arr.push(cone)
      g.add(cone)
    }
    return arr
  }
  arrowsL = mkArrows(leftCurve, 4)
  arrowsR = mkArrows(rightCurve, 4)

  // 电源与灯泡
  chargerMat = new THREE.MeshStandardMaterial({ color: 0x1f2b47, roughness: 0.5, metalness: 0.4, emissive: 0x1d4ed8, emissiveIntensity: 0.12 })
  const charger = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.62, 0.5), chargerMat)
  charger.position.set(-1.55, H * 0.88, 0)
  charger.name = '外部电源'
  g.add(charger)
  bulbMat = new THREE.MeshBasicMaterial({ color: 0x333f55 })
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 20), bulbMat)
  bulb.position.set(1.55, H * 0.88, 0)
  bulb.name = '负载（灯泡）'
  g.add(bulb)
  bulbGlow = new THREE.PointLight(0xffd166, 0, 9)
  bulbGlow.position.copy(bulb.position)
  g.add(bulbGlow)
  const bulbBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 12), wireMat)
  bulbBase.position.set(1.55, H * 0.88 - 0.36, 0)
  g.add(bulbBase)

  const mkDashed = (curve, color) => {
    const pts = curve.getPoints(60)
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 0.16, gapSize: 0.1, transparent: true, opacity: 0.7 }))
    line.computeLineDistances()
    return line
  }
  const liPathPts = [new THREE.Vector3(-1.35, 0, D * 0.5 + 0.02), new THREE.Vector3(1.35, 0, D * 0.5 + 0.02)]
  const liPathGeo = new THREE.BufferGeometry().setFromPoints(liPathPts)
  liPathLine = new THREE.Line(liPathGeo, new THREE.LineDashedMaterial({ color: PALETTE.li, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.75 }))
  liPathLine.computeLineDistances()
  g.add(liPathLine)
  ePathL = mkDashed(leftCurve, PALETTE.electron)
  ePathR = mkDashed(rightCurve, PALETTE.electron)
  g.add(ePathL, ePathR)

  labelAnchors = [
    { name: '正极材料', v: new THREE.Vector3(-R + 0.95, H * 0.3, 0) },
    { name: '隔膜', v: new THREE.Vector3(0, H * 0.3, 0) },
    { name: '负极材料', v: new THREE.Vector3(R - 0.95, H * 0.3, 0) },
    { name: '电解液', v: new THREE.Vector3(-R * 0.55, -H * 0.33, 0) },
    { name: '外部电源', v: charger.position },
    { name: '负载（灯泡）', v: bulb.position }
  ]
  return g
}

/* 重置视角：放开缩放/平移后，用户很容易把自己"转丢"（模型贴到脸上或推出画面），
   必须留一个一键回正的退路。 */
function resetView() {
  if (!scene) return
  fly.flyTo(HOME_POS, HOME_TARGET, 0.6)
}

onMounted(async () => {
  await nextTick()
  // 允许旋转 + 缩放 + 平移（细看口径）：默认取景不变，但用户可以自己凑近看内部结构。
  // 「一格贴脸」的根因不是"开了缩放"，而是 minDistance 太小 + zoomSpeed 太大，所以
  // minDistance 取 4.6（模型高 3.06，再近就会穿进壳里），zoomSpeed 压到 0.42。
  scene = createLabScene(threeBox.value, {
    cameraPos: HOME_POS,
    fov: 40,
    controls: {
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
      zoomSpeed: 0.42,
      rotateSpeed: 0.55,
      panSpeed: 0.72,
      screenSpacePanning: true,
      dampingFactor: 0.055,
      minDistance: 4.6,
      maxDistance: 16,
      minPolarAngle: Math.PI * 0.18,
      maxPolarAngle: Math.PI * 0.82,
      target: HOME_TARGET
    }
  })
  scene.controls.target.set(...HOME_TARGET)
  scene.controls.update()
  const cutaway = buildCutaway()
  cutaway.scale.setScalar(0.9) // 缩小初始观感，避免播放/拖动时模型过大
  scene.scene.add(cutaway)

  // Li⁺：内部 x 轴向（数量减 40%，轨迹整齐成行）
  liFlow = buildParticleFlow({
    count: 28, color: PALETTE.li, size: 0.09, speed: 0.2,
    pathFn: (t, v, i) => {
      const row = i % 7, col = Math.floor(i / 7) % 4
      if (flowState === 'run') {
        const x = -1.35 + ((t + i * 0.061) % 1) * 2.7
        v.set(x, (row - 3) * 0.36, (col - 1.5) * 0.34)
      } else {
        // 停驻：按分布状态聚在某一侧 + 热运动抖动
        const center = flowState === 'anode' ? 1.05 : (flowState === 'cathode' ? -1.05 : ((i % 2 ? 0.75 : -0.75)))
        const time = clock.elapsedTime
        v.set(
          center + (t - 0.5) * 0.5 + Math.sin(time * 1.4 + i * 2.1) * 0.035,
          (row - 3) * 0.36 + Math.sin(time * 1.1 + i) * 0.03,
          (col - 1.5) * 0.34
        )
      }
    }
  })
  scene.scene.add(liFlow.mesh)

  // e⁻：外部电路
  eFlow = buildParticleFlow({
    count: 22, color: PALETTE.electron, size: 0.07, speed: 0.22,
    pathFn: (t, v) => {
      const curve = eBranch === 'left' ? builtCurves.left : builtCurves.right
      curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1), v)
    }
  })
  scene.scene.add(eFlow.mesh)

  const loop = () => {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 0.05)
    const time = clock.elapsedTime

    // progress 唯一状态源（deltaTime；充电末段 CC-CV 减速）
    if (playing.value && (mode.value === 'charge' || mode.value === 'discharge')) {
      let ratePerSec = (mode.value === 'charge' ? 1 / 12 : 1 / 10) * speed.value
      if (mode.value === 'charge' && progress.value > 0.85) ratePerSec *= 0.35 + 0.65 * cccv.value
      progress.value = Math.min(1, Math.max(0, progress.value + ratePerSec * dt))
      if (progress.value >= 1 && mode.value === 'charge') { playing.value = false; mode.value = 'full'; didCharge.value = true }
      if (progress.value <= 0 && mode.value === 'discharge') { playing.value = false; didDischarge.value = true }
    }
    if (didCharge.value && didDischarge.value) bridgeReady.value = true

    const flowing = (mode.value === 'charge' || mode.value === 'discharge') && playing.value
    const charging = mode.value === 'charge'

    // Li⁺ 分布状态机
    if (mode.value === 'full') flowState = 'anode'
    else if (mode.value === 'idle') flowState = 'idle'
    else if (mode.value === 'charge' && !playing.value && progress.value > 0.9) flowState = 'anode'
    else flowState = flowing ? 'run' : 'idle'

    liFlow.update(dt, flowing ? (charging ? 1 : -1) : 0, showLiPath.value)
    eBranch = charging ? 'left' : 'right'
    eFlow.update(dt, flowing ? (charging ? 1 : -1) : 0, showEPath.value && flowing)

    // 路径与箭头
    liPathLine.visible = showLiPath.value
    ePathL.visible = showEPath.value && (charging ? flowing || mode.value === 'charge' : false)
    ePathR.visible = showEPath.value && (!charging && mode.value === 'discharge')
    arrowsL.forEach((a) => { a.visible = charging && showEPath.value && (flowing || mode.value === 'charge') })
    arrowsR.forEach((a) => { a.visible = !charging && showEPath.value && mode.value === 'discharge' })

    // 灯泡亮度 ∝ 功率；充电器指示
    const on = mode.value === 'discharge'
    // 灯泡亮度 ∝ 放电功率。归一化基准取 2C 放电的典型功率
    // （2C = 10 A，端电压约 3.5 V → ≈ 35 W），0.5C / 1C / 2C 三档亮度才拉得开。
    // 若沿用旧的 14 W 基准，1C 以上一律顶到满亮度，倍率就看不出来了。
    const P_REF = 35
    const powerNorm = Math.min(1, powerW.value / P_REF)
    bulbMat.color.set(on ? new THREE.Color(0x333f55).lerp(new THREE.Color(0xffd166), 0.3 + powerNorm * 0.7) : 0x333f55)
    bulbGlow.intensity = on ? 7 * powerNorm : 0
    chargerMat.emissiveIntensity = charging && flowing ? 0.55 + 0.25 * rate.value : 0.12

    // 结构标签投影
    if (showLabels.value) {
      const rect = threeBox.value.getBoundingClientRect()
      labelScreens.value = labelAnchors.map((a) => {
        pool.v3.copy(a.v).project(scene.camera)
        return { name: a.name, x: (pool.v3.x * 0.5 + 0.5) * rect.width - 30, y: (-pool.v3.y * 0.5 + 0.5) * rect.height - 10 }
      })
    }

    // 相机飞行（重置视角）与渲染同源推进
    fly.step(dt)

    scene.render()
  }
  loop()
})

let flowState = 'idle'
let eBranch = 'left'

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  fly.cancel()
  if (scene) scene.dispose()
})
</script>

<style scoped lang="scss">
.principle { display: flex; flex-direction: column; gap: 20px;
  // 首屏高度预算：舞台随视口高度自适应，矮屏自动压扁，
  // 保证「章节标题 + 3D 舞台 + 右侧控制卡」在一屏内完整可见。
  --stage-h: clamp(400px, calc(100vh - 250px), 540px);
}
.head { position: relative;
  .badge-line { position: absolute; right: 0; top: 8px; display: inline-flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-2); }
}
.bench { display: grid; grid-template-columns: 1.9fr 1fr; gap: 18px; }
.stage { position: relative; height: var(--stage-h); overflow: hidden; min-width: 0; }
.three-box { position: absolute; inset: 0; cursor: grab; }

.legend { position: absolute; left: 16px; top: 14px; display: flex; flex-direction: column; gap: 7px; z-index: 4;
  .lg { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-1); padding: 5px 12px; background: rgba(13,18,32,0.65); border-radius: 999px; width: fit-content;
    .dot { width: 11px; height: 11px; border-radius: 50%;
      &.li { background: #35e0c8; box-shadow: 0 0 8px #35e0c8; }
      &.el { background: #cfe4ff; box-shadow: 0 0 8px #cfe4ff; } } }
}
.stage-right { position: absolute; right: 16px; top: 14px; z-index: 4;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.state-tag { padding: 9px 16px; text-align: right;
  b { display: block; font-size: 16px; color: var(--cyan); }
  i { font-style: normal; font-size: 11.5px; color: var(--text-2); }
  &.charge b { color: #7df3ff; }
  &.discharge b { color: #ffd166; }
}
.view-tools { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.view-reset { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 12px; }
.view-hint { font-size: 11px; color: var(--text-3); letter-spacing: 0.02em;
  .vh-touch { display: none; } }
.label-tag {
  position: absolute; padding: 2px 10px; font-size: 11.5px; color: var(--cyan); z-index: 3;
  border-color: rgba(34,211,238,0.3); white-space: nowrap; pointer-events: none;
  transform: translate(-50%, -140%);
  &::after { content: ''; position: absolute; left: 50%; bottom: -7px; width: 1px; height: 7px; background: rgba(34,211,238,0.5); transform: translateX(-50%); }
}
.timeline {
  position: absolute; left: 16px; right: 16px; bottom: 16px; padding: 16px 18px 26px; z-index: 4;
  input[type=range] { width: 100%; }
  .kp-row { position: relative; height: 16px; margin-top: 2px;
    .kp { position: absolute; transform: translateX(-50%); background: none; border: none; cursor: pointer; padding: 0 4px;
      .kp-dot { display: block; width: 9px; height: 9px; border-radius: 50%; background: #22355c; border: 1.5px solid rgba(77,168,255,0.55); margin: 0 auto; transition: all 0.3s; }
      .kp-name { font-size: 11px; color: var(--text-3); white-space: nowrap; }
      &.on .kp-dot { background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
      &.on .kp-name { color: var(--cyan); }
      &:hover .kp-name { color: var(--text-1); } }
  }
}

.controls { display: flex; flex-direction: column; gap: 12px; max-height: var(--stage-h); overflow-y: auto; padding-right: 2px; }
.task-row { display: flex; gap: 10px;
  .task-btn { flex: 1; justify-content: center; padding: 13px 8px; font-size: 15px;
    &.alt { background: linear-gradient(135deg, #b45309, #d97706); }
    &.live { box-shadow: 0 0 18px rgba(34,211,238,0.45); } } }
.sub-row { display: flex; align-items: center; gap: 8px;
  .icon { width: 38px; height: 38px; justify-content: center; }
  .speed { margin-left: auto; display: flex; gap: 6px; } }
.readouts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  .ro { padding: 11px 8px; text-align: center;
    i { display: block; font-style: normal; font-size: 11.5px; color: var(--text-2); margin-bottom: 4px; }
    b { font-size: 23px; color: var(--text-1); }
    .cyan { color: var(--cyan); }
    u { text-decoration: none; display: block; font-size: 10.5px; color: var(--text-3); margin-top: 2px; } } }
// 电压读数的常驻口径：这里是线性化 OCV，不是实测开路电压曲线，必须写清楚
.ocv-note { font-size: 11px; color: var(--text-3); line-height: 1.6; }
.explain { padding: 14px 16px;
  b { color: var(--blue); font-size: 14.5px; display: block; margin-bottom: 9px; }
  dl { display: grid; grid-template-columns: 86px 1fr; gap: 8px 10px;
    dt { font-size: 12px; color: var(--cyan); padding-top: 1px; }
    dd { font-size: 13px; color: var(--text-1); line-height: 1.68; } }
  .deep-btn { margin-top: 12px; padding: 5px 14px; font-size: 12px; }
  .deep { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--hairline);
    p { font-size: 12px; color: var(--text-2); line-height: 1.8; } } }
.advanced { border: 1px solid var(--hairline); border-radius: 12px; padding: 12px 16px;
  summary { cursor: pointer; font-size: 13px; color: var(--text-2); }
  .adv-body { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
  .rate-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-2);
    .rate-note { font-style: normal; width: 100%; font-size: 11px; color: var(--text-3); } } }
.switch { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--text-2); cursor: pointer;
  input { accent-color: var(--blue); width: 15px; height: 15px; } }
.energy { padding: 16px 22px; display: flex; flex-direction: column; gap: 10px;
  .e-row { display: grid; grid-template-columns: 120px 1fr 52px; align-items: center; gap: 12px;
    span { font-size: 13px; color: var(--text-2); }
    b { text-align: right; font-size: 12.5px; color: var(--text-2); } }
  .e-track { height: 9px; border-radius: 5px; background: rgba(77,168,255,0.1); overflow: hidden; }
  .e-fill { height: 100%; border-radius: 5px; transition: width 0.2s linear;
    &.chem { background: linear-gradient(90deg, #22d3ee, #0ea5e9); }
    &.elec { background: linear-gradient(90deg, #4da8ff, #818cf8); }
    &.loss { background: linear-gradient(90deg, #f59e0b, #ef4444); } }
  .e-caliber { font-size: 11px; color: var(--text-3); } }
.bridge {
  display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px 26px;
  p { font-size: 15px; color: var(--text-1); } }
/* 平板 / 窄笔记本：双栏塌成单栏。舞台仍是"画布铺满 + 浮层绝对定位"的桌面思路 */
@media (max-width: 1080px) {
  /* minmax(0, 1fr) 而不是 1fr：`1fr` 的最小值是 auto（min-content），
     舞台里的画布/滑杆一旦有固有宽度就把整列撑破 —— 实测手机上 .stage 宽 393px
     而可用只有 353px，整页被顶出横向溢出。 */
  .bench { grid-template-columns: minmax(0, 1fr); }
  .stage { height: clamp(340px, 56vh, 440px); }
  .controls { max-height: none; overflow: visible; padding-right: 0; }
  .view-hint { display: none; }
}

/* 手机：画布独占舞台、零遮挡；状态 / 视角工具 / 进度轴 / 图例依次排到画布下方。
   桌面那套浮层在 353px 宽的舞台里会互相压叠并把回路模型挤到中间一小块。 */
@media (max-width: 767px) {
  .principle { --stage-h: clamp(280px, 42vh, 380px); }

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
  .state-tag { padding: 8px 14px; text-align: left;
    b { font-size: 17px; }
    i { font-size: 12px; } }
  .view-tools { flex-direction: row; align-items: center; justify-content: space-between; gap: 10px; }
  .view-reset { min-height: 44px; padding: 8px 14px; font-size: 12.5px; }
  .view-hint { display: block; font-size: 12px;
    .vh-mouse { display: none; }
    .vh-touch { display: inline; } }
  .timeline {
    position: static; order: 3; width: 100%;
    padding: 12px 14px 20px;
  }
  .legend {
    position: static; order: 4;
    flex-direction: row; flex-wrap: wrap; gap: 8px;
    .lg { font-size: 12.5px; padding: 6px 13px; }
  }
  .label-tag { font-size: 12px; }
  .kp-row { height: 46px;
    .kp { min-height: 44px; min-width: 44px; }
    .kp-name { font-size: 12px; } }

  /* 触摸目标与可读性：手机上按钮偏小极易点错，统一撑到 44px；
     10.5—11.5px 的次要文字提到 12px。 */
  .sub-row { flex-wrap: wrap;
    .btn-ghost { min-height: 44px; }
    .icon { width: 44px; height: 44px; } }
  .speed .btn-ghost { min-height: 44px; min-width: 46px; }
  .deep-btn { min-height: 44px; padding: 8px 16px; font-size: 13px; }
  .rate-row .btn-ghost { min-height: 44px; min-width: 50px; }
  .rate-note { font-size: 12px; }
  .ocv-note { font-size: 12px; }
  .advanced summary { min-height: 44px; display: flex; align-items: center; }
  .advanced .switch { min-height: 44px; align-items: center; }
  .advanced input[type='checkbox'] { width: 20px; height: 20px; }
  .readouts .ro {
    i { font-size: 12px; }
    u { font-size: 12px; } }
}
</style>
