<template>
  <div class="page-full types">
    <header class="head">
      <p class="chapter-eyebrow">Chapter 02 · 电芯展柜</p>
      <h2 class="chapter-title">打开电芯：形态与材料</h2>
      <p class="chapter-sub">同一套化学，可以装进完全不同的身体。旋转观察，点击发光标记认识部件。</p>
      <span class="corner badge-line"><DataBadge type="concept" />结构模型为示意，非工程图纸</span>
    </header>

    <!-- 数字展柜 -->
    <div class="showcase">
      <div class="stage panel" ref="stageBox">
        <div ref="threeBox" class="three-box"></div>
        <svg class="guide-svg" ref="guideSvg">
          <line class="guide-line" :style="{ opacity: selected ? 0.8 : 0 }" x1="0" y1="0" x2="0" y2="0" />
          <circle class="guide-dot" :style="{ opacity: selected ? 0.9 : 0 }" cx="0" cy="0" r="4" />
        </svg>

        <!-- 外形切换 -->
        <div class="shape-row">
          <button v-for="s in batteryShapes" :key="s.key" class="btn-ghost" :class="{ active: shape === s.key }" @click="switchShape(s.key)">
            {{ s.key === 'prism' ? '方形' : s.key === 'pouch' ? '软包' : s.key }}
          </button>
        </div>
        <!-- 参照尺寸 -->
        <div class="size-tag num">{{ curShape.size }}</div>

        <!-- 拆解控制 -->
        <div class="teardown panel-glass">
          <button class="btn-ghost icon" :aria-label="tdPlaying ? '暂停拆解' : '播放拆解'" @click="tdPlaying = !tdPlaying"><IconGlyph :name="tdPlaying ? 'pause' : 'play'" /></button>
          <button class="btn-ghost icon" aria-label="复位拆解" @click="resetTeardown"><IconGlyph name="reset" /></button>
          <input type="range" min="0" max="100" step="0.5" v-model.number="tdPercent" @input="tdPlaying = false" />
          <span class="td-step num">{{ tdPhase.label }}</span>
        </div>
        <div class="td-caption" v-if="tdPhase.caption">{{ tdPhase.caption }}</div>

        <!-- 返回整体 -->
        <button v-if="selected" class="btn-ghost back-btn" @click="deselect">⟵ 返回整体</button>
      </div>

      <!-- 部件详情抽屉 -->
      <aside class="drawer panel">
        <transition name="fade-slide" mode="out-in">
          <div v-if="!selected" key="idle" class="drawer-idle">
            <p class="idle-title">数字展柜</p>
            <p class="idle-line">旋转观察，点击发光标记认识部件。</p>
            <ul class="idle-parts">
              <li v-for="h in curHotspots" :key="h.partId">
                <span class="hdot" :style="{ background: curShape.color }"></span>{{ h.label }}
              </li>
            </ul>
          </div>
          <div v-else :key="selected" class="part-card">
            <h4>{{ curPart.label }}</h4>
            <dl>
              <dt>它是什么</dt><dd>{{ curPart.what }}</dd>
              <dt>它在哪里</dt><dd>{{ curPart.where }}</dd>
              <dt>它做什么</dt><dd>{{ curPart.func }}</dd>
              <dt>失效会怎样</dt><dd>{{ curPart.fail }}</dd>
            </dl>
            <p class="oneline">记住：{{ curPart.oneline }}</p>
          </div>
        </transition>
      </aside>
    </div>

    <!-- 化学体系对比 -->
    <div class="chem panel">
      <div class="chem-head">
        <h3>化学体系：身体里的灵魂</h3>
        <button v-if="chemCompare" class="btn-ghost" @click="chemCompare = null"><IconGlyph name="reset" />取消对比</button>
        <span v-else class="hint">点击"加入对比"叠加第二条多边形</span>
      </div>
      <div class="chem-body">
        <div class="chem-info">
          <div class="chem-tabs">
            <button v-for="c in chemistries" :key="c.key" class="btn-ghost" :class="{ active: chem === c.key }" @click="chem = c.key">{{ c.key }}</button>
          </div>
          <h4>{{ curChem.full }}</h4>
          <p class="make">{{ curChem.make }}</p>
          <p class="metaphor">{{ curChem.metaphor }}</p>
          <p class="why">{{ curChem.why }}</p>
          <p class="apps"><b>常见于：</b>{{ curChem.apps }}</p>
          <div class="compare-row">
            <span>加入对比：</span>
            <button v-for="c in chemistries.filter(x => x.key !== chem)" :key="c.key" class="btn-ghost sm" :class="{ active: chemCompare === c.key }" @click="chemCompare = chemCompare === c.key ? null : c.key">{{ c.key }}</button>
          </div>
        </div>
        <div class="radar-box">
          <div ref="radarBox" class="radar"></div>
          <p class="caliber">定性科普比较，1—5 档；实际性能受配方、设计和工况影响，不构成测量值。</p>
        </div>
      </div>
    </div>

    <ChapterFooter conclusion="外形决定怎么装，化学决定怎么活——两者共同定义一块电池的命运。" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import { initChart } from '../services/charts.js'
import { createLabScene } from '../three/labScene.js'
import { buildCylindricalCell, buildTightJellyRoll, buildPrismaticCell, buildPouchCell } from '../three/batteryModel.js'
import { batteryShapes, chemistries } from '../data/index.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import DataBadge from '../components/DataBadge.vue'
import IconGlyph from '../components/IconGlyph.vue'

/* ── 基础状态 ── */
const shape = ref('21700')
const curShape = computed(() => batteryShapes.find((s) => s.key === shape.value))
const selected = ref(null)          // 选中部件 partId
const chem = ref('LFP')
const chemCompare = ref(null)
const curChem = computed(() => chemistries.find((c) => c.key === chem.value))

const stageBox = ref(null), threeBox = ref(null), guideSvg = ref(null), radarBox = ref(null)
let scene = null, raf = 0, modelGroup = null, radar = null
const clock = new THREE.Clock()

/* ── 部件词条（固定五项结构） ── */
const PART_INFO = {
  shell: { label: '钢壳 / 铝壳', what: '钢或铝合金外壳，把内部所有材料密封保护起来。', where: '电芯最外层，你看到的第一眼就是它。', func: '承压、密封、导热，并作为机械骨架。', fail: '外壳锈蚀或变形可能漏液；外短路时它也是散热路径。', oneline: '它是电池的铠甲兼密封舱。' },
  wrap: { label: '热缩膜标签', what: '包覆在圆柱钢壳外的聚合物绝缘与标识层。', where: '钢壳最外侧，通常印有型号和安全信息。', func: '提供外部绝缘、识别与轻度防护。', fail: '破损后可能暴露带电壳体，增加外短路风险。', oneline: '它是电芯的绝缘外衣与身份标签。' },
  terminal: { label: '正极端子', what: '顶部的正极引出端，内接铝极耳。', where: '电芯顶面中央凸起处。', func: '把内部电流引出到外部电路。', fail: '接触不良会发热打火，内阻升高。', oneline: '它是电池对外的正极窗口。' },
  vent: { label: '安全阀 / 排气结构', what: '带刻痕的泄压片，压力过高时按设计开启泄气。', where: '顶盖中央或极柱之间。', func: '内压异常时定向泄压，避免外壳爆裂。', fail: '被堵住或失效时，热失控风险显著上升。', oneline: '它是电池的"安全气门"。' },
  negativeCap: { label: '负极底盖', what: '底面平盖，内接负极极耳，通常与壳体等电位。', where: '电芯底部平面。', func: '负极电流引出端。', fail: '底面磕碰变形可能伤及卷芯。', oneline: '低调但同样承担大电流。' },
  roll: { label: '卷芯', what: '正极片—隔膜—负极片紧密卷绕成的螺旋芯。', where: '电芯内部核心，占体积约 80%。', func: '锂离子在这里嵌入/脱出，是能量储存的发生地。', fail: '卷芯变形或断裂直接导致容量损失。', oneline: '它是电池的心脏。' },
  tabs: { label: '正负极极耳', what: '从极片引出的金属薄条，一铝一铜。', where: '卷芯顶部，连接端子与极片。', func: '汇集电流并引出到端子。', fail: '极耳虚焊或断裂 = 电芯直接失效。', oneline: '它是心脏连向世界的血管。' },
  posTerminal: { label: '正极极柱', what: '方形电芯的铝质正极引出柱。', where: '顶盖左侧。', func: '正极大电流引出。', fail: '松动发热是大电流接插件的常见隐患。', oneline: '方形电芯的"正极插头座"。' },
  negTerminal: { label: '负极极柱', what: '铜排引出的负极柱。', where: '顶盖右侧。', func: '负极电流引出。', fail: '氧化使接触电阻增大，输出功率下降。', oneline: '与正极柱配对构成回路。' },
  topCap: { label: '顶盖组件', what: '集成极柱、安全阀与防爆结构的铝顶盖。', where: '方形电芯顶部。', func: '密封 + 安全防护 + 电气引出的集成平台。', fail: '顶盖焊封失效会导致漏液与进气。', oneline: '方芯的安全机关都在这里。' },
  insulator: { label: '绝缘件', what: '塑料/陶瓷绝缘框与垫圈。', where: '顶盖下方与极柱周围。', func: '防止极柱与铝壳短路。', fail: '绝缘破损 → 壳体带电，严重时外短路。', oneline: '默默无闻的安全卫士。' },
  stack: { label: '叠片组', what: '正极片—隔膜—负极片逐层堆叠的核心。', where: '方壳/铝塑膜内部。', func: '与卷芯同职：能量储存的反应床。', fail: '隔膜破损即内短路，叠片错位会析锂。', oneline: '一片一片叠出来的能量。' },
  busbar: { label: '极耳汇流排', what: '把多片极耳汇接到极柱的铝/铜排。', where: '叠片顶部与极柱之间。', func: '降低汇流电阻，均衡各层电流。', fail: '汇流焊接不良 → 局部过热。', oneline: '把千百片极耳拧成一股绳。' },
  pouchFilm: { label: '铝塑复合膜', what: '尼龙/铝箔/聚丙烯三层复合的软包装材料。', where: '软包电芯的最外层袋体。', func: '轻量密封外壳，可做异形设计。', fail: '刺穿或折裂即漏液，软包最怕机械损伤。', oneline: '它是软包的"皮肤"。' },
  seal: { label: '热封边', what: '两层铝塑膜受热压合的封口区。', where: '袋体四周，宽度清晰可见。', func: '水汽与电解液的双重屏障。', fail: '封边不良是软包胀气漏液的头号原因。', oneline: '封边质量决定软包寿命。' },
  tabPos: { label: '正极极耳（铝）', what: '从叠片正极引出的铝质扁平耳。', where: '软包顶部两片突耳之一。', func: '正极电流引出。', fail: '极耳区应力集中易撕裂封边。', oneline: '软包唯一的对外通道之一。' },
  tabNeg: { label: '负极极耳（铜）', what: '铜质负极引出耳（表面镀镍防氧化）。', where: '顶部另一侧突耳。', func: '负极电流引出。', fail: '铜暴露在电解液中会溶解迁移。', oneline: '与铝耳一正一负配对。' },
  tabSeal: { label: '极耳封釉', what: '极耳穿出处的树脂密封胶块。', where: '极耳与膜的交界处。', func: '金属与塑膜之间的密封桥梁。', fail: '封釉老化 = 慢漏气起点。', oneline: '最不起眼却最关键的密封点。' }
}

/* ── 每个外形的热点（锚点为模型局部坐标） ── */
const HOTSPOTS = {
  '18650': [
    { partId: 'terminal', label: '正极端子', anchor: [0, 1.85, 0] },
    { partId: 'vent', label: '安全阀', anchor: [0, 1.76, 0.5] },
    { partId: 'shell', label: '钢壳', anchor: [0.9, 0.4, 0.4] },
    { partId: 'wrap', label: '热缩膜标签', anchor: [-0.6, -0.6, 0.85] },
    { partId: 'negativeCap', label: '负极底盖', anchor: [0, -1.85, 0] },
    { partId: 'roll', label: '卷芯（剖视）', anchor: [0, 0, 0] },
    { partId: 'tabs', label: '极耳', anchor: [0.3, 1.2, 0.2] }
  ],
  '21700': [
    { partId: 'terminal', label: '正极端子', anchor: [0, 1.98, 0] },
    { partId: 'vent', label: '安全阀', anchor: [0, 1.9, 0.55] },
    { partId: 'shell', label: '钢壳', anchor: [1.0, 0.5, 0.4] },
    { partId: 'wrap', label: '热缩膜标签', anchor: [-0.7, -0.5, 0.95] },
    { partId: 'negativeCap', label: '负极底盖', anchor: [0, -1.98, 0] },
    { partId: 'roll', label: '卷芯（剖视）', anchor: [0, 0, 0] },
    { partId: 'tabs', label: '极耳', anchor: [0.3, 1.3, 0.2] }
  ],
  prism: [
    { partId: 'posTerminal', label: '正极极柱', anchor: [-0.6, 2.0, 0] },
    { partId: 'negTerminal', label: '负极极柱', anchor: [0.6, 2.0, 0] },
    { partId: 'vent', label: '安全阀', anchor: [0, 1.92, 0] },
    { partId: 'shell', label: '铝壳', anchor: [1.15, 0, 0.6] },
    { partId: 'stack', label: '叠片组（剖视）', anchor: [0, 0, 0.3] },
    { partId: 'busbar', label: '极耳汇流排', anchor: [-0.5, 0.8, 0.2] },
    { partId: 'insulator', label: '绝缘件', anchor: [0, 1.72, 0.5] }
  ],
  pouch: [
    { partId: 'tabPos', label: '正极极耳（铝）', anchor: [-0.6, 2.0, 0] },
    { partId: 'tabNeg', label: '负极极耳（铜）', anchor: [0.6, 2.0, 0] },
    { partId: 'tabSeal', label: '极耳封釉', anchor: [-0.6, 1.76, 0] },
    { partId: 'seal', label: '热封边', anchor: [1.3, -0.4, 0.2] },
    { partId: 'pouchFilm', label: '铝塑复合膜', anchor: [-0.5, -0.3, 0.4] },
    { partId: 'stack', label: '叠片（剖视）', anchor: [0, 0, 0] }
  ]
}
const curHotspots = computed(() => HOTSPOTS[shape.value] || [])
const curPart = computed(() => ({ ...(PART_INFO[selected.value] || {}), label: PART_INFO[selected.value]?.label || '' }))

/* ── 模型构建（每外形独立建模） ── */
let hotspotSprites = []
let dimmables = []       // { mesh, mat }
let teardownParts = []   // { obj, basePos, off, fadeTo, phase, ... }
let rollMesh = null, capGroupRef = null, stackRef = null

function disposeModel() {
  if (!modelGroup) return
  modelGroup.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose(); m.dispose() }) }
  })
  scene.scene.remove(modelGroup)
  modelGroup = null
  hotspotSprites = []
  dimmables = []
  teardownParts = []
  rollMesh = null; capGroupRef = null; stackRef = null
}

function collectDimmables(root) {
  root.traverse((o) => {
    if (o.isMesh && o.material && o.userData.partId) {
      const m = o.material
      if (m.__baseOpacity == null) m.__baseOpacity = m.opacity ?? 1
      if (m.__baseEmissive == null) { m.__baseEmissive = m.emissive?.clone() || null; m.__baseEmissiveI = m.emissiveIntensity ?? 1 }
      dimmables.push({ mesh: o, mat: m })
    }
  })
}

function makeHotspotSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
  grad.addColorStop(0, 'rgba(190,235,255,1)')
  grad.addColorStop(0.35, 'rgba(77,168,255,0.85)')
  grad.addColorStop(1, 'rgba(77,168,255,0)')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  spr.scale.setScalar(0.34)
  return spr
}

function buildModel() {
  disposeModel()
  modelGroup = new THREE.Group()
  modelGroup.scale.setScalar(0.88) // 基准缩放：缩小初始观感

  if (shape.value === '18650' || shape.value === '21700') {
    const is21 = shape.value === '21700'
    const r = is21 ? 1.07 : 0.92, h = is21 ? 3.6 : 3.3
    const cell = buildCylindricalCell({ r, h, label: shape.value })
    modelGroup.add(cell)
    const wrap = cell.getObjectByName('wrap')
    const roll = buildTightJellyRoll({ r: r * 0.9, h: h * 0.88 })
    roll.position.y = -0.05
    rollMesh = roll
    modelGroup.add(roll)
    capGroupRef = new THREE.Group()
    for (const nm of ['positiveCap', 'terminal', 'negativeCap']) {
      const o = cell.getObjectByName(nm)
      if (o) { cell.remove(o); capGroupRef.add(o) }
    }
    const vent = new THREE.Mesh(new THREE.TorusGeometry(r * 0.55, 0.014, 8, 40), new THREE.MeshStandardMaterial({ color: 0x9aa5b8, roughness: 0.45, metalness: 0.85 }))
    vent.rotation.x = Math.PI / 2
    vent.position.y = h / 2 + 0.1
    vent.userData.partId = 'vent'; vent.userData.partLabel = '安全阀'
    capGroupRef.add(vent)
    modelGroup.add(capGroupRef)
    teardownParts = [
      { obj: wrap, base: wrap.position.clone(), off: new THREE.Vector3(0, 1.4, 0), fadeTo: 0.08, phase: 0 },
      { obj: capGroupRef, base: capGroupRef.position.clone(), off: new THREE.Vector3(0, 1.7, 0), fadeTo: 1, phase: 1 },
      { obj: roll, base: roll.position.clone(), off: new THREE.Vector3(0, 0.5, 2.4), fadeTo: 1, phase: 2, fan: true }
    ]
  } else if (shape.value === 'prism') {
    const cell = buildPrismaticCell()
    modelGroup.add(cell)
    capGroupRef = cell.userData.capGroup
    stackRef = cell.userData.stack
    const bus = cell.userData.bus
    teardownParts = [
      { obj: capGroupRef, base: capGroupRef.position.clone(), off: new THREE.Vector3(0, 1.5, 0), fadeTo: 1, phase: 1 },
      { obj: stackRef, base: stackRef.position.clone(), off: new THREE.Vector3(0, 0.2, 1.8), fadeTo: 1, phase: 2 },
      { obj: bus, base: bus.position.clone(), off: new THREE.Vector3(0, 0.9, 1.2), fadeTo: 1, phase: 2 }
    ]
    const shellMesh = cell.getObjectByName('shell')
    teardownParts.push({ obj: shellMesh, base: null, off: null, fadeTo: 0.14, phase: 1, opacityOnly: true })
  } else {
    const cell = buildPouchCell()
    modelGroup.add(cell)
    const body = cell.userData.bodyGroup
    stackRef = cell.userData.stack
    stackRef.visible = false
    teardownParts = [
      { obj: body, base: body.position.clone(), off: new THREE.Vector3(0, 0.5, 0), fadeTo: 0.08, phase: 0 },
      { obj: stackRef, base: stackRef.position.clone(), off: new THREE.Vector3(0, 0, 1.4), fadeTo: 1, phase: 2, showObj: true }
    ]
  }

  collectDimmables(modelGroup)
  applyTeardown(tdPercent.value / 100)

  const sprs = []
  for (const hs of curHotspots.value) {
    const spr = makeHotspotSprite()
    spr.position.set(...hs.anchor)
    spr.userData.hs = hs
    sprs.push(spr)
    modelGroup.add(spr)
  }
  hotspotSprites = sprs
  scene.scene.add(modelGroup)
}

/* ── 拆解（四步：去膜 → 抬盖 → 拉芯 → 展层） ── */
const tdPercent = ref(0)
const tdPlaying = ref(false)
const TD_STEPS = [
  { at: 0, label: '整体', caption: '' },
  { at: 25, label: '① 移除标签/外膜', caption: '先脱掉最外层的包装与热缩膜。' },
  { at: 50, label: '② 抬起顶盖与安全结构', caption: '顶盖集成着极柱、安全阀与绝缘件。' },
  { at: 75, label: '③ 拉出卷芯/叠片', caption: '取出真正的能量核心。' },
  { at: 100, label: '④ 展开电极层', caption: '正极—隔膜—负极，逐层展开。' }
]
const tdPhase = computed(() => [...TD_STEPS].reverse().find((s) => tdPercent.value >= s.at) || TD_STEPS[0])

function applyTeardown(p) {
  for (const tp of teardownParts) {
    const local = Math.max(0, Math.min(1, (p * 100 - tp.phase * 25) / 25))
    if (tp.opacityOnly && tp.obj) {
      const m = tp.obj.material
      m.transparent = true
      m.opacity = (m.__baseOpacity ?? 1) + (tp.fadeTo - (m.__baseOpacity ?? 1)) * local
      continue
    }
    if (tp.showObj && local > 0.05) tp.obj.visible = true
    if (tp.base && tp.off) tp.obj.position.copy(tp.base).addScaledVector(tp.off, local)
    if (tp.fadeTo !== undefined && tp.obj.material) {
      tp.obj.material.transparent = true
      const base = tp.obj.material.__baseOpacity ?? 1
      tp.obj.material.opacity = base + (tp.fadeTo - base) * local
    }
  }
  // 第 4 步：卷芯微展开，暗示层状结构
  if (rollMesh && shape.value !== 'pouch' && shape.value !== 'prism') {
    const local4 = Math.max(0, Math.min(1, (p * 100 - 75) / 25))
    rollMesh.scale.set(1 + local4 * 0.14, 1 + local4 * 0.05, 1 + local4 * 0.14)
    rollMesh.rotation.y = local4 * 0.6
  }
}
function resetTeardown() { tdPercent.value = 0; tdPlaying.value = false }
watch(tdPercent, (v) => applyTeardown(v / 100))
function switchShape(k) { if (k !== shape.value) shape.value = k }
// 形态切换 → 重建 3D 模型（重建后入场缩放动画 + 复位拆解进度）
watch(shape, () => {
  resetTeardown()
  buildModel()
  if (modelGroup) {
    modelGroup.scale.setScalar(0.72)
    gsap.to(modelGroup.scale, { x: 0.88, y: 0.88, z: 0.88, duration: 0.7, ease: 'power2.out' })
  }
})

/* ── 热点拾取 / 聚焦 / 高亮 ── */
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let hovered = null

function pickAt(e) {
  if (!scene || !modelGroup) return null
  const rect = threeBox.value.getBoundingClientRect()
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, scene.camera)
  const sprHits = raycaster.intersectObjects(hotspotSprites, false)
  if (sprHits.length) return { partId: sprHits[0].object.userData.hs.partId }
  const meshes = []
  modelGroup.traverse((o) => { if (o.isMesh && o.userData.partId) meshes.push(o) })
  const hits = raycaster.intersectObjects(meshes, false)
  if (hits.length) return { partId: hits[0].object.userData.partId }
  return null
}

function onPointerMove(e) {
  if (!scene) return
  const hit = pickAt(e)
  hovered = hit ? hit.partId : null
  threeBox.value.style.cursor = hovered ? 'pointer' : 'grab'
  hotspotSprites.forEach((s) => {
    const on = hovered && s.userData.hs.partId === hovered
    gsap.to(s.scale, { x: on ? 0.5 : 0.34, y: on ? 0.5 : 0.34, duration: 0.25 })
  })
}

function onSelect(id) {
  selected.value = id
  const hs = curHotspots.value.find((h) => h.partId === id)
  const anchor = hs ? new THREE.Vector3(...hs.anchor) : new THREE.Vector3()
  const dir = scene.camera.position.clone().sub(scene.controls.target).normalize()
  const targetPos = anchor.clone().addScaledVector(dir, 4.4)
  gsap.to(scene.camera.position, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 0.7, ease: 'power2.inOut' })
  gsap.to(scene.controls.target, { x: anchor.x * 0.6, y: anchor.y * 0.6, z: anchor.z * 0.6, duration: 0.7, ease: 'power2.inOut', onUpdate: () => scene.controls.update() })
  for (const d of dimmables) {
    const isSel = d.mesh.userData.partId === id
    d.mat.transparent = true
    if (isSel) {
      d.mat.opacity = Math.max(d.mat.__baseOpacity, 0.95)
      if (d.mat.emissive) { d.mat.emissive.set(0x1d5c9e); d.mat.emissiveIntensity = 0.5 }
    } else {
      d.mat.opacity = d.mat.__baseOpacity * 0.18
    }
  }
  hotspotSprites.forEach((s) => { s.material.opacity = s.userData.hs.partId === id ? 1 : 0.15 })
}

function deselect() {
  selected.value = null
  for (const d of dimmables) {
    d.mat.opacity = d.mat.__baseOpacity
    if (d.mat.emissive && d.mat.__baseEmissive) { d.mat.emissive.copy(d.mat.__baseEmissive); d.mat.emissiveIntensity = d.mat.__baseEmissiveI }
  }
  hotspotSprites.forEach((s) => { s.material.opacity = 1 })
  gsap.to(scene.camera.position, { x: 0, y: 1.6, z: 8.6, duration: 0.7, ease: 'power2.inOut' })
  gsap.to(scene.controls.target, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'power2.inOut', onUpdate: () => scene.controls.update() })
}

function onClick(e) {
  const hit = pickAt(e)
  if (!hit) { if (selected.value) deselect(); return }
  if (hit.partId) onSelect(hit.partId)
}

/* 引导线：部件 → 右侧抽屉 */
const guideV = new THREE.Vector3()
function updateGuide() {
  if (!selected.value || !scene || !guideSvg.value) return
  const hs = curHotspots.value.find((h) => h.partId === selected.value)
  if (!hs) return
  guideV.set(...hs.anchor)
  if (modelGroup) modelGroup.localToWorld(guideV)
  guideV.project(scene.camera)
  const rect = threeBox.value.getBoundingClientRect()
  const x = (guideV.x * 0.5 + 0.5) * rect.width
  const y = (-guideV.y * 0.5 + 0.5) * rect.height
  const line = guideSvg.value.querySelector('.guide-line')
  const dot = guideSvg.value.querySelector('.guide-dot')
  line.setAttribute('x1', x); line.setAttribute('y1', y)
  line.setAttribute('x2', rect.width - 6); line.setAttribute('y2', rect.height * 0.4)
  dot.setAttribute('cx', x); dot.setAttribute('cy', y)
}

/* ── 雷达图（正五边形 · 1-5 档 · 可叠加对比） ── */
const RADAR_DIMS = ['能量密度', '安全与热稳定', '循环寿命', '成本与资源', '低温与倍率']
const RADAR_SCORES = {
  LFP: [2.2, 5, 5, 4.5, 3],
  NMC: [4.5, 3, 3.5, 3, 3.5],
  NCA: [5, 2.5, 3, 2.5, 2.5],
  LCO: [4, 2.5, 2, 1.5, 3]
}
function radarOption() {
  const series = [{ value: RADAR_SCORES[chem.value], name: chem.value, areaStyle: { color: 'rgba(77,168,255,0.25)' }, lineStyle: { color: '#4da8ff', width: 2 }, itemStyle: { color: '#4da8ff' } }]
  if (chemCompare.value) {
    series.push({ value: RADAR_SCORES[chemCompare.value], name: chemCompare.value, areaStyle: { color: 'rgba(245,158,11,0.18)' }, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } })
  }
  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(13,18,32,0.95)', borderColor: 'rgba(77,168,255,0.3)', textStyle: { color: '#e6edf7', fontSize: 12 },
      formatter: (ps) => {
        const c = chemistries.find((x) => x.key === ps.name)
        return `<b>${ps.name}</b><br/>${ps.marker}${RADAR_DIMS[ps.dimensionIndex]}：<b>${ps.value}</b> / 5 档<br/><span style="opacity:.8">${c ? c.why : ''}</span>`
      }
    },
    legend: { show: series.length > 1, bottom: 0, textStyle: { color: '#8b98b0' }, itemWidth: 14 },
    radar: {
      indicator: RADAR_DIMS.map((n) => ({ name: n, max: 5 })),
      radius: '62%', center: ['50%', '48%'],
      axisName: { color: '#bfe3ff', fontSize: 12 },
      splitArea: { areaStyle: { color: ['rgba(77,168,255,0.03)', 'rgba(77,168,255,0.06)'] } },
      splitLine: { lineStyle: { color: 'rgba(77,168,255,0.18)' } },
      axisLine: { lineStyle: { color: 'rgba(77,168,255,0.25)' } }
    },
    series: [{ type: 'radar', data: series, symbolSize: 5, animationDuration: 600 }]
  }
}
watch([chem, chemCompare], () => { radar?.setOption(radarOption()) })

/* ── 生命周期 ── */
let onResize = () => {}
onMounted(async () => {
  await nextTick()
  scene = createLabScene(threeBox.value, { cameraPos: [0, 1.6, 8.6], fov: 40 })
  buildModel()
  threeBox.value.addEventListener('pointermove', onPointerMove)
  threeBox.value.addEventListener('click', onClick)
  radar = initChart(radarBox.value)
  radar.setOption(radarOption())
  onResize = () => { radar?.resize() }
  window.addEventListener('resize', onResize)

  const loop = () => {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 0.05)
    if (tdPlaying.value) {
      let v = tdPercent.value + dt * 14 // deltaTime 驱动：约 7 秒走完拆解
      if (v >= 100) { v = 100; tdPlaying.value = false }
      tdPercent.value = v
    }
    updateGuide()
    scene.render()
  }
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  threeBox.value?.removeEventListener('pointermove', onPointerMove)
  threeBox.value?.removeEventListener('click', onClick)
  window.removeEventListener('resize', onResize)
  radar?.dispose()
  disposeModel()
  if (scene) scene.dispose()
})
</script>

<style scoped lang="scss">
.types { display: flex; flex-direction: column; gap: 20px; }
.head { position: relative;
  .badge-line { position: absolute; right: 0; top: 8px; display: inline-flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-2); }
}
.showcase { display: grid; grid-template-columns: 1.9fr 1fr; gap: 18px; }
.stage { position: relative; height: 620px; overflow: hidden; }
.three-box { position: absolute; inset: 0; cursor: grab; }
.guide-svg { position: absolute; inset: 0; pointer-events: none; z-index: 5;
  .guide-line { stroke: rgba(34, 211, 238, 0.7); stroke-width: 1.2; stroke-dasharray: 5 4; transition: opacity 0.3s; }
  .guide-dot { fill: #22d3ee; filter: drop-shadow(0 0 6px #22d3ee); transition: opacity 0.3s; }
}
.shape-row { position: absolute; left: 16px; bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; z-index: 4; }
.size-tag { position: absolute; right: 16px; top: 14px; font-size: 12px; color: var(--text-2); padding: 6px 12px; z-index: 4; }
.teardown {
  position: absolute; left: 16px; bottom: 60px; right: 16px; z-index: 4;
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  input[type=range] { flex: 1; }
  .td-step { font-size: 12px; color: var(--cyan); white-space: nowrap; }
}
.td-caption { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); font-size: 12.5px; color: var(--text-2); padding: 6px 14px; background: rgba(13,18,32,0.7); border-radius: 999px; white-space: nowrap; z-index: 4; }
.back-btn { position: absolute; right: 16px; bottom: 60px; z-index: 4; }

.drawer { padding: 20px; min-height: 620px; display: flex; flex-direction: column; }
.drawer-idle {
  .idle-title { font-size: 13px; letter-spacing: 0.2em; color: var(--blue); margin-bottom: 10px; }
  .idle-line { font-size: 15.5px; color: var(--text-1); line-height: 1.8; margin-bottom: 18px; }
  .idle-parts { display: flex; flex-direction: column; gap: 8px;
    li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-2); padding: 8px 12px; border: 1px dashed var(--hairline); border-radius: 8px;
      .hdot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 8px currentColor; } } }
}
.part-card {
  h4 { font-size: 17px; color: var(--cyan); margin-bottom: 14px; }
  dl { display: grid; grid-template-columns: 82px 1fr; gap: 12px 10px;
    dt { font-size: 12px; color: var(--blue); padding-top: 2px; }
    dd { font-size: 13.5px; color: var(--text-1); line-height: 1.75; } }
  .oneline { margin-top: 16px; padding: 10px 14px; background: rgba(34,211,238,0.07); border-left: 3px solid var(--cyan); border-radius: 6px; font-size: 13px; color: #bfe9ff; line-height: 1.7; }
}

.chem { padding: 22px; }
.chem-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
  h3 { font-size: 16px; color: var(--text-1); }
  .hint { font-size: 12px; color: var(--text-3); } }
.chem-body { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
.chem-info {
  .chem-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  h4 { font-size: 16.5px; color: var(--text-1); }
  .make { font-size: 12px; color: var(--blue); margin: 4px 0 12px; }
  .metaphor { font-size: 13.5px; color: #bfe9ff; line-height: 1.8; padding: 10px 14px; background: rgba(77,168,255,0.06); border-left: 3px solid var(--blue); border-radius: 6px; }
  .why { font-size: 13px; color: var(--text-2); line-height: 1.85; margin-top: 12px; }
  .apps { font-size: 12.5px; color: var(--text-2); margin-top: 10px; b { color: var(--text-1); } }
  .compare-row { margin-top: 16px; display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-3); flex-wrap: wrap;
    .sm { padding: 4px 12px; font-size: 12px; } }
}
.radar-box { .radar { height: 340px; }
  .caliber { margin-top: 8px; font-size: 11.5px; color: var(--text-3); text-align: center; } }

@media (max-width: 960px) {
  .showcase, .chem-body { grid-template-columns: 1fr; }
  .drawer { min-height: 0; }
}
</style>
