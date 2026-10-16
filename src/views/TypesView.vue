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
      <div class="stage-col">
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

          <!-- 参照尺寸 + 视角操作 -->
          <div class="stage-tools">
            <div class="size-tag num">{{ curShape.size }}</div>
            <button class="btn-ghost view-reset" title="恢复到初始角度与距离" @click="resetView">
              <IconGlyph name="reset" /> 重置视角
            </button>
            <p class="view-hint">
              <span class="vh-mouse">拖拽旋转 · 滚轮缩放 · 右键平移</span>
              <span class="vh-touch">单指旋转 · 双指缩放与平移</span>
            </p>
          </div>

          <!-- 返回整体 -->
          <button v-if="selected" class="btn-ghost back-btn" @click="deselect">⟵ 返回整体</button>
        </div>

        <!-- 拆解控制：放在舞台下方，不再叠在画面上。
             原先它横跨舞台底部约 1/4，把电芯下半截压住，导致模型最多只能做到画幅六成
             才不撞上它。移出来后，细长的圆柱居中、左右两侧全是留白，
             模型可以放心放大到画幅八成以上，四角的控件也不会碰到它。 -->
        <div class="teardown panel-glass">
          <button class="btn-ghost icon" :aria-label="tdPlaying ? '暂停拆解' : '播放拆解'" @click="tdPlaying = !tdPlaying"><IconGlyph :name="tdPlaying ? 'pause' : 'play'" /></button>
          <button class="btn-ghost icon" aria-label="复位拆解" @click="resetTeardown"><IconGlyph name="reset" /></button>
          <input type="range" min="0" max="100" step="0.5" v-model.number="tdPercent" @input="tdPlaying = false" />
          <span class="td-step num">{{ tdPhase.label }}</span>
          <span class="td-caption" v-if="tdPhase.caption">{{ tdPhase.caption }}</span>
        </div>
      </div>

      <!-- 部件详情抽屉。手机上选中部件时整个变成底部上滑面板（.is-sheet），
           因为窄屏里右侧根本没有"旁边"这块地方给抽屉，放文档流下方又得滚动才看得见。 -->
      <aside class="drawer panel" :class="{ 'is-sheet': !!selected }">
        <button v-if="selected" class="sheet-close" aria-label="收起详情，返回整体视角" @click="deselect">
          <IconGlyph name="down" :size="16" /> 收起详情
        </button>
        <div class="drawer-head">
          <p class="idle-title">数字展柜</p>
          <p class="idle-line">点电芯上的发光标记，或点下面的条目。</p>
        </div>

        <transition name="fade-slide" mode="out-in">
          <div v-if="selected" :key="selected" class="part-card">
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

        <!-- 热点清单：每一项都是真按钮，与电芯上的发光标记共用同一个 onSelect，
             两个入口完全等价。此前这里只是没有 @click 的 <li> 文字标签，
             而电芯上的标记又只能靠射线打精灵方片 —— 结果两边都点不动。 -->
        <ul class="idle-parts">
          <li v-for="h in curHotspots" :key="h.partId">
            <button
              type="button"
              class="hp-btn"
              :class="{ on: selected === h.partId }"
              :aria-pressed="selected === h.partId"
              @click="onSelect(h.partId)"
            >
              <span class="hdot" :style="{ background: curShape.color }" aria-hidden="true"></span>
              {{ h.label }}
            </button>
          </li>
        </ul>
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

    <VideoSlot id="ch02-teardown" />
    <ChapterGoals :chapter="2" />

    <ChapterFooter conclusion="外形决定怎么装，化学决定怎么活——两者共同定义一块电池的命运。" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import { initChart } from '../services/charts.js'
import { createLabScene } from '../three/labScene.js'
import { createCameraFly } from '../three/cameraFly.js'
import { buildCylindricalCell, buildTightJellyRoll, buildPrismaticCell, buildPouchCell, CELL_SPECS } from '../three/batteryModel.js'
import { batteryShapes, chemistries } from '../data/index.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import ChapterGoals from '../components/ChapterGoals.vue'
import VideoSlot from '../components/VideoSlot.vue'
import DataBadge from '../components/DataBadge.vue'
import IconGlyph from '../components/IconGlyph.vue'

/* ── 基础状态 ── */
const shape = ref('26650')
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
  // 锚点按真实尺寸模型（1 unit = 10 mm）标定：
  // 18650 = Φ18×65 → r 0.90 / h 6.50；21700 = Φ21×70 → r 1.05 / h 7.00；
  // 26650 = Φ26×65 → r 1.30 / h 6.50（BS-01 当前采用）
  // 径向锚点按 ~0.40r / ~0.95r / ~0.74r / ~0.31r 的比例随 r 缩放，与另两种型号保持一致。
  '18650': [
    { partId: 'terminal', label: '正极凸台', anchor: [0, 3.19, 0] },
    { partId: 'vent', label: '安全阀刻痕', anchor: [0.36, 3.08, 0.36] },
    { partId: 'shell', label: '镀镍钢壳', anchor: [0.86, 0.55, 0.3] },
    { partId: 'wrap', label: '热缩膜标签', anchor: [-0.67, -1.6, 0.62] },
    { partId: 'negativeCap', label: '负极端面', anchor: [0, -3.17, 0] },
    { partId: 'roll', label: '卷芯（剖视）', anchor: [0, 0, 0] },
    { partId: 'tabs', label: '极耳', anchor: [0.28, 2.5, 0.19] }
  ],
  '21700': [
    { partId: 'terminal', label: '正极凸台', anchor: [0, 3.44, 0] },
    { partId: 'vent', label: '安全阀刻痕', anchor: [0.42, 3.31, 0.42] },
    { partId: 'shell', label: '镀镍钢壳', anchor: [1.0, 0.6, 0.35] },
    { partId: 'wrap', label: '热缩膜标签', anchor: [-0.78, -1.7, 0.72] },
    { partId: 'negativeCap', label: '负极端面', anchor: [0, -3.42, 0] },
    { partId: 'roll', label: '卷芯（剖视）', anchor: [0, 0, 0] },
    { partId: 'tabs', label: '极耳', anchor: [0.32, 2.7, 0.22] }
  ],
  '26650': [
    { partId: 'terminal', label: '正极凸台', anchor: [0, 3.19, 0] },
    { partId: 'vent', label: '安全阀刻痕', anchor: [0.52, 3.08, 0.52] },
    { partId: 'shell', label: '镀镍钢壳', anchor: [1.24, 0.55, 0.43] },
    { partId: 'wrap', label: '热缩膜标签', anchor: [-0.97, -1.6, 0.89] },
    { partId: 'negativeCap', label: '负极端面', anchor: [0, -3.17, 0] },
    { partId: 'roll', label: '卷芯（剖视）', anchor: [0, 0, 0] },
    { partId: 'tabs', label: '极耳', anchor: [0.40, 2.5, 0.27] }
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
  // 精灵挂在 modelGroup 内，会跟着基准缩放一起缩小；
  // 基准从 0.88 降到 0.6 后，这里按比例放大回原视觉尺寸（0.34 × 0.88 ≈ 0.5 × 0.6）。
  spr.scale.setScalar(0.5)
  return spr
}

function buildModel() {
  disposeModel()
  modelGroup = new THREE.Group()
  // 基准缩放：模型本身已是真实尺寸（26650 高 6.5 unit），这里只把整体观感缩到画框内
  modelGroup.scale.setScalar(0.6)

  if (['18650', '21700', '26650'].includes(shape.value)) {
    // 真实外形尺寸（1 unit = 10 mm），不再手写一套缩小版的假尺寸
    const { r, h } = CELL_SPECS[shape.value]
    const cell = buildCylindricalCell({
      format: shape.value,
      brand: shape.value,
      voltage: 3.6,
      // 18650 常见 3500 mAh；21700 与 26650 都取 5000 mAh 量级，
      // 这样与 BS-01 的"1C = 5.0 A"口径一致，不会出现同一页两套容量前提。
      capacity: shape.value === '18650' ? 3500 : 5000
    })
    modelGroup.add(cell)

    const wrap = cell.getObjectByName('wrap')
    const roll = buildTightJellyRoll({ r: r * 0.88, h: h * 0.85 })
    roll.position.y = -0.05
    rollMesh = roll
    modelGroup.add(roll)

    // 顶盖总成：顶盖盘、正极凸台、泄压阀刻痕、密封圈、安全阀片、PTC 片。
    // 它们先统一挂进一个组便于整体清理，但拆解时**逐件**给位移 —— 见下面的 CAP_STACK。
    capGroupRef = new THREE.Group()
    for (const nm of ['positiveCap', 'terminal', 'ventMarks', 'gasket', 'ventDisc', 'ptcDisc']) {
      const o = cell.getObjectByName(nm)
      if (o) { cell.remove(o); capGroupRef.add(o) }
    }
    modelGroup.add(capGroupRef)

    // 壳体组（管身+肩部）与底盖组（端面+环槽）各自成组，才能整层剥离。
    // 子对象原本挂在 cell 下、而 cell 正处于原点，改挂到同为原点的组里不会改变世界坐标。
    const regroup = (names) => {
      const g = new THREE.Group()
      for (const nm of names) {
        const o = cell.getObjectByName(nm)
        if (o) { cell.remove(o); g.add(o) }
      }
      modelGroup.add(g)
      return g
    }
    const shellGroup = regroup(['shellBody', 'shoulder'])
    const negCapGroup = regroup(['negativeCap', 'bottomGroove'])

    /* 剥离层序：由外到内。点击某个部件时，从最外层一路剥到它所在的那一层 ——
       这就是"剥洋葱"的读法：点钢壳会先脱掉标签、再让开钢壳本身。
       位移一律走"往侧面让开"，而不是上下抬：模型基准缩放 0.6、相机距离 7.2 / fov 40 下，
       画框垂直只容得下约 5.24 世界单位，而模型自身就高 3.9 —— 上下几乎没有余量，
       早期版本把标签往上抬 2.4 单位（= 1.44 世界单位）其实已经出画了。
       横向余量宽得多，所以外层往左让、端盖往右让，互不遮挡。 */
    const layer = (obj, off, from, to) => ({
      obj, off: new THREE.Vector3(...off), base: obj.position.clone(), from, to
    })
    /* 顶盖总成拆成一叠（对照典型结构图右侧那列编号件）。
       竖向余量是算过的、不是估的：画框半高 2.62 world ÷ 基准缩放 0.6 = 4.37 local，
       顶盖最高处约 3.25 local，所以最多只能再抬 1.1 local。
       但纯竖向拉开不够看 —— 每片只能分到 0.22 local ≈ 8 px，肉眼几乎分不出层次。
       横向余量是竖向的约 5 倍，所以改成"斜着一路让开"：每片抬高 0.22、同时右移 0.6，
       相邻两片在屏幕上分开约 23 px，层次才真正看得出来。 */
    const capLift = (name, step) => {
      const o = capGroupRef.getObjectByName(name)
      return o ? layer(o, [step * 0.6, step * 0.22, 0], 58, 88) : null
    }
    teardownParts = [
      layer(wrap, [-5.4, 0.4, 0], 0, 22),
      layer(shellGroup, [-3.0, 0, 0], 22, 42),
      layer(negCapGroup, [4.6, 0, 0], 42, 58),
      // step 越大越靠外：PTC 片最靠内、原地不动，正极凸台让得最远
      capLift('ptcDisc', 0),
      capLift('ventDisc', 1),
      capLift('ventMarks', 1),
      capLift('gasket', 2),
      capLift('positiveCap', 3),
      capLift('terminal', 4)
    ].filter(Boolean)
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
  { at: 22, label: '① 剥掉热缩膜', caption: '最外层是绝缘与标识用的热缩膜，脱掉它才看得见钢壳。' },
  { at: 42, label: '② 剥开镀镍钢壳', caption: '钢壳同时是承压件、密封件，也是电流回路的一部分。' },
  { at: 58, label: '③ 取下负极端面', caption: '底盖内接负极极耳，与钢壳等电位。' },
  { at: 72, label: '④ 抬起顶盖总成', caption: '顶盖不是一块铁片：密封圈、安全阀片、PTC 片与顶盖盘压成一叠。' },
  { at: 88, label: '⑤ 顶盖摊成一叠', caption: '越靠外抬得越多：顶盖盘与正极凸台在上，往下依次是密封圈、安全阀片、PTC 片。' },
  { at: 100, label: '⑥ 散开卷芯夹层', caption: '正极—隔膜—负极—隔膜，一层层摊开成夹层。' }
]
const tdPhase = computed(() => [...TD_STEPS].reverse().find((s) => tdPercent.value >= s.at) || TD_STEPS[0])

/* 点击部件 → 自动走到它所在的档位：
   外部件（膜 / 壳 / 底盖）是"剥离"，它和它外面的层一起让开；
   顶盖类走到 88，让那一叠薄片摊开但不把卷芯也拆了；
   内部件（卷芯 / 极耳）走到底，整卷散开成夹层。 */
const PEEL_AT = { wrap: 22, shell: 42, negativeCap: 58, terminal: 88, vent: 88, roll: 100, tabs: 100 }

function peelTo(id) {
  const target = PEEL_AT[id]
  if (target == null) return
  // 手动播放会自己在渲染循环里推进 tdPercent，不先停掉就是两条时间线互相抢
  tdPlaying.value = false
  gsap.to(tdPercent, { value: target, duration: 1.15, ease: 'power2.inOut', overwrite: true })
}

function applyTeardown(p) {
  const pc = p * 100
  for (const tp of teardownParts) {
    if (!tp.obj) continue
    // 圆柱用显式区间（from/to），方形与软包仍沿用四等分的 phase —— 两者语义等价，兼容并存
    const from = tp.from != null ? tp.from : tp.phase * 25
    const to = tp.from != null ? tp.to : tp.phase * 25 + 25
    const local = Math.max(0, Math.min(1, (pc - from) / Math.max(1e-6, to - from)))
    if (tp.opacityOnly && tp.obj.material) {
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

  /* 最后一档：把卷芯摊开成"三明治"。
     卷芯那 24 片是"正极—隔膜—负极—隔膜"循环密绕出来的，每片都有 layerIndex。
     沿同一个方向逐片平移（步长 0.15 unit，24 片共拉开约 3.4 unit），
     螺旋就被"抽直"成一串依次错开的带状层 —— 从侧面看正是
     紫（正极）—浅灰（隔膜）—蓝灰（负极）—浅灰（隔膜）这样一段段重复的夹层。
     ⚠️ 这里刻意不做"各层朝自己角向散开"的放射式展开：那会散成一朵花，
     每层的层序关系反而看不出来，讲不了"叠层顺序"这件事。
     方形与软包没有这套元数据，循环自然跳过。 */
  if (rollMesh) {
    const e = Math.max(0, Math.min(1, (pc - 88) / 12))
    const k = e * e * (3 - 2 * e) // smoothstep：起步与收尾都慢，中段快
    for (const o of rollMesh.children) {
      const idx = o.userData.layerIndex
      if (idx == null) continue
      o.position.set(k * idx * 0.15, 0, 0)
    }
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
    modelGroup.scale.setScalar(0.5)
    gsap.to(modelGroup.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 0.7, ease: 'power2.out' })
  }
})

/* ── 热点拾取 / 聚焦 / 高亮 ── */
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let hovered = null

/* 发光标记的命中半径（CSS 像素）。
   原来这里是用 raycast 打精灵方片（hotspotSprites）：精灵处在 modelGroup 的 0.6 缩放里，
   只有 0.5 × 0.6 = 0.3 世界单位（屏幕上约 20px），必须精准落进方片才算命中。
   "看得见一个光点却点不中"是最劝退的交互，实测反馈也正是"点电池上的光点没有用"。
   改成屏幕空间就近判定：把锚点按 updateGuide 同一套投影算成像素坐标，取半径内最近的热点。
   所见即所点，且不再依赖精灵自身的拾取实现。 */
const HOTSPOT_HIT_R = 24

const pickV = new THREE.Vector3()
function nearestHotspot(px, py, rect) {
  let best = null
  let bestD = HOTSPOT_HIT_R * HOTSPOT_HIT_R
  for (const hs of curHotspots.value) {
    pickV.set(...hs.anchor)
    modelGroup.localToWorld(pickV)
    pickV.project(scene.camera)
    if (pickV.z > 1) continue // 在远平面之外（模型始终在镜头前，这里只是兜底）
    const sx = (pickV.x * 0.5 + 0.5) * rect.width
    const sy = (-pickV.y * 0.5 + 0.5) * rect.height
    const d = (sx - px) * (sx - px) + (sy - py) * (sy - py)
    if (d < bestD) { bestD = d; best = hs }
  }
  return best
}

function pickAt(e) {
  if (!scene || !modelGroup) return null
  const rect = threeBox.value.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  // ① 先判发光标记：离哪个近就算哪个
  const hs = nearestHotspot(px, py, rect)
  if (hs) return { partId: hs.partId }

  // ② 再判模型本体：直接点壳身 / 端盖也能认识这个部件
  pointer.x = (px / rect.width) * 2 - 1
  pointer.y = -(py / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, scene.camera)
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
    // 基准是 0.5（见 makeHotspotSprite）。这里原先还写着基准缩放 0.88 时代的 0.34，
    // 结果是"一碰鼠标所有光点先缩小一圈"，hover 反而比静止还小。
    gsap.to(s.scale, { x: on ? 0.68 : 0.5, y: on ? 0.68 : 0.5, duration: 0.25 })
  })
}

function onSelect(id) {
  selected.value = id
  peelTo(id) // 外部件剥离、内部件散开（见 PEEL_AT / applyTeardown）
  const hs = curHotspots.value.find((h) => h.partId === id)
  const anchor = hs ? new THREE.Vector3(...hs.anchor) : new THREE.Vector3()
  const dir = scene.camera.position.clone().sub(scene.controls.target).normalize()
  const targetPos = anchor.clone().addScaledVector(dir, 4.4)
  fly.flyTo([targetPos.x, targetPos.y, targetPos.z], [anchor.x * 0.6, anchor.y * 0.6, anchor.z * 0.6], 0.7)
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

/* 相机飞行统一走 src/three/cameraFly.js（实现与坑位说明都在那边）。 */
const fly = createCameraFly(() => scene)

const HOME_POS = [0, 0.9, 7.2]
const HOME_TARGET = [0, 0, 0]

function deselect() {
  selected.value = null
  // "返回整体"＝把拆解也收回去，否则模型停在被剥开的状态、和"整体"这个词矛盾
  gsap.killTweensOf(tdPercent)
  resetTeardown()
  for (const d of dimmables) {
    d.mat.opacity = d.mat.__baseOpacity
    if (d.mat.emissive && d.mat.__baseEmissive) { d.mat.emissive.copy(d.mat.__baseEmissive); d.mat.emissiveIntensity = d.mat.__baseEmissiveI }
  }
  hotspotSprites.forEach((s) => { s.material.opacity = 1 })
  fly.flyTo(HOME_POS, HOME_TARGET, 0.7)
}

/* 拖拽与点选必须分开：开了旋转/平移后，拖完松手浏览器照样补一个 click。
   按位移判据过滤 —— 超过 6px 视为"在转视角"，不当作点选部件，否则转一下就误选。 */
let downXY = null
function onPointerDown(e) { downXY = [e.clientX, e.clientY] }

function onClick(e) {
  if (downXY) {
    const dx = e.clientX - downXY[0]
    const dy = e.clientY - downXY[1]
    downXY = null
    if (dx * dx + dy * dy > 36) return
  }
  const hit = pickAt(e)
  if (!hit) { if (selected.value) deselect(); return }
  if (hit.partId) onSelect(hit.partId)
}

/* 重置视角：放开缩放/平移后，用户很容易把自己"转丢"（模型跑出画面或贴到脸上），
   必须留一个一键回正的退路。 */
function resetView() {
  if (!scene) return
  if (selected.value) { deselect(); return }  // deselect 里已含回正
  fly.flyTo(HOME_POS, HOME_TARGET, 0.6)
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
  // 取景：拆解条移到舞台外后，画面底部不再被遮，模型可以吃满画幅。
  // 26650 高 6.5 unit × 基准缩放 0.6 = 3.9 unit；7.2 距离 / fov 40 下约占画幅高度的 7 成半。
  // 圆柱左右两侧天然留白，所以四角的控件（外形切换、尺寸、重置）都不会压到模型。
  // （由 21700 改为 26650 后模型矮了 0.3 unit、粗了 0.5 unit，画幅占比略降但横向更饱满，
  //   取景参数保持不变即可。）
  //
  // 本页是"细看"场景，缩放与平移都打开 —— 与首页展台恰好相反。
  // 手感靠参数兜底，而不是靠关掉功能：
  //   zoomSpeed 0.42 → 滚轮一格约 4% 视距，不会一滚到底
  //   minDistance 3.6 → 能贴近看刻痕/极耳，又不至于穿模（壳体半径仅 0.63）
  //   rotateSpeed 0.55 / panSpeed 0.72 → 放慢，便于对准细节
  scene = createLabScene(threeBox.value, {
    cameraPos: [0, 0.9, 7.2],
    fov: 40,
    controls: {
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
      zoomSpeed: 0.42,
      rotateSpeed: 0.55,
      panSpeed: 0.72,
      screenSpacePanning: true,
      minDistance: 3.6,
      maxDistance: 15,
      minPolarAngle: Math.PI * 0.12,
      maxPolarAngle: Math.PI * 0.88,
      target: [0, 0, 0]
    }
  })
  buildModel()
  threeBox.value.addEventListener('pointerdown', onPointerDown)
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
    fly.step(dt)
    updateGuide()
    scene.render()
  }
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  fly.cancel()
  threeBox.value?.removeEventListener('pointerdown', onPointerDown)
  threeBox.value?.removeEventListener('pointermove', onPointerMove)
  threeBox.value?.removeEventListener('click', onClick)
  window.removeEventListener('resize', onResize)
  radar?.dispose()
  disposeModel()
  if (scene) scene.dispose()
})
</script>

<style scoped lang="scss">
.types { display: flex; flex-direction: column; gap: 20px;
  // 首屏高度预算：舞台 + 其下方的拆解控制条（12 gap + 约 38 高）再与右侧展柜对齐，
  // 矮屏自动压扁，保证「章节标题 + 3D 舞台 + 拆解条 + 右侧展柜」在一屏内完整可见。
  --stage-h: clamp(360px, calc(100vh - 300px), 530px);
}
.head { position: relative;
  .badge-line { position: absolute; right: 0; top: 8px; display: inline-flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-2); }
}
.showcase { display: grid; grid-template-columns: 1.9fr 1fr; gap: 18px; align-items: start; }
.stage-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.stage { position: relative; height: var(--stage-h); overflow: hidden; min-width: 0; }
.three-box { position: absolute; inset: 0; cursor: grab; }
.guide-svg { position: absolute; inset: 0; pointer-events: none; z-index: 5;
  // ⚠️ width/height 必须有。<svg> 是替换元素，给 position:absolute + inset:0 并不会
  // 把它撑开 —— 它会退回默认的 300×150 固有尺寸（右/下被"过约束"而忽略）。
  // 而 updateGuide() 写入的坐标是按舞台实际像素空间算的（x2 能到 780+），
  // 于是整条"部件 → 抽屉"引导线落在 300×150 视口之外，被 svg 默认的 overflow:hidden 裁掉，
  // 表现为"选中部件后看不到引导线"。
  width: 100%; height: 100%;
  .guide-line { stroke: rgba(34, 211, 238, 0.7); stroke-width: 1.2; stroke-dasharray: 5 4; transition: opacity 0.3s; }
  .guide-dot { fill: #22d3ee; filter: drop-shadow(0 0 6px #22d3ee); transition: opacity 0.3s; }
}
.shape-row { position: absolute; left: 16px; bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; z-index: 4; }
.stage-tools { position: absolute; right: 16px; top: 14px; z-index: 4;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.size-tag { font-size: 12px; color: var(--text-2); padding: 6px 12px; }
.view-reset { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 12px; }
.view-hint { font-size: 11.5px; color: var(--text-3); letter-spacing: 0.02em;
  .vh-touch { display: none; } }
// 拆解控制条：位于舞台下方，是常规文档流的一行，不再遮挡 3D 画面
.teardown {
  display: flex; align-items: center; gap: 10px; padding: 9px 14px;
  input[type=range] { flex: 1; min-width: 90px; }
  // 图标按钮收成方钮。`.icon` 原先只在别的页面定义过 —— scoped 样式跨组件不生效，
  // 这两个按钮实际吃到的是 .btn-ghost 的通用内边距（8px 18px），
  // 图标两侧一大圈留白，和紧挨着的滑杆不成一体。
  .icon { width: 32px; height: 32px; flex: none; justify-content: center; padding: 0; }
  .td-step { font-size: 12px; color: var(--cyan); white-space: nowrap; }
  .td-caption { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}
.back-btn { position: absolute; right: 16px; bottom: 16px; z-index: 4; }
// 只在手机上出现的"收起详情"按钮（配合底部上滑面板），桌面隐藏
.sheet-close { display: none; }

.drawer { padding: 18px 20px; height: var(--stage-h); display: flex; flex-direction: column; overflow-y: auto; }
.drawer-head {
  .idle-title { font-size: 13px; letter-spacing: 0.2em; color: var(--blue); margin-bottom: 8px; }
  .idle-line { font-size: 13.5px; color: var(--text-2); line-height: 1.7; }
}
.idle-parts {
  display: flex; flex-direction: column; gap: 7px; margin-top: 16px;
  li { display: flex; }
  .hp-btn {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 8px 12px; border: 1px dashed var(--hairline); border-radius: 8px;
    background: transparent; color: var(--text-2); font: inherit; font-size: 13px;
    text-align: left; cursor: pointer; transition: all 0.2s ease;
    &:hover { color: var(--text-1); border-color: var(--hairline-strong); background: rgba(77, 168, 255, 0.08); }
    &.on { color: #eaf6ff; border-style: solid; border-color: rgba(77, 168, 255, 0.6); background: rgba(77, 168, 255, 0.14); }
    .hdot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
  }
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
.radar-box { .radar { height: 300px; }
  .caliber { margin-top: 8px; font-size: 11.5px; color: var(--text-3); text-align: center; } }

/* 平板 / 窄笔记本：双栏塌成单栏。舞台仍是"画布铺满 + 浮层绝对定位"的桌面思路 */
@media (max-width: 1080px) {
  .showcase, .chem-body { grid-template-columns: minmax(0, 1fr); }
  .stage { height: clamp(340px, 56vh, 440px); }
  .drawer { height: auto; min-height: 0; overflow: visible; }
  .view-hint { display: none; }
}

/* 手机：画布独占舞台；尺寸读数 / 视角工具 / 形态切换排到画布下方；
   选中部件时抽屉变成底部上滑面板。 */
@media (max-width: 767px) {
  .types { --stage-h: clamp(280px, 42vh, 380px); }

  .stage {
    display: flex; flex-direction: column; gap: 10px;
    height: auto; padding: 12px;
  }
  .three-box {
    position: static; order: 1;
    height: var(--stage-h);
    border-radius: 12px; overflow: hidden;
  }
  /* 引导线是"部件 → 右侧抽屉"的连接线。手机上抽屉已挪到底部上滑面板，
     连接目标不存在了，留着只会横穿画面。而且它的坐标按舞台像素算，
     舞台改成 flex 后也不再对得上。 */
  .guide-svg { display: none; }

  .stage-tools {
    position: static; order: 2; width: 100%;
    flex-direction: row; flex-wrap: wrap; align-items: center;
    justify-content: space-between; gap: 8px;
  }
  .size-tag { font-size: 12.5px; padding: 8px 13px; }
  .view-reset { min-height: 44px; padding: 8px 14px; font-size: 12.5px; }
  .view-hint { display: block; flex-basis: 100%; font-size: 12px;
    .vh-mouse { display: none; }
    .vh-touch { display: inline; } }

  .shape-row {
    position: static; order: 3; width: 100%;
    .btn-ghost { flex: 1; min-height: 46px; font-size: 13px; }
  }
  /* 桌面那个角落里的"返回整体"由面板自带的"收起详情"取代 */
  .back-btn { display: none; }

  /* 抽屉 → 底部上滑面板（仅选中部件时） */
  .drawer { padding: 16px 16px calc(16px + env(safe-area-inset-bottom)); }
  .drawer.is-sheet {
    position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 160;
    max-height: 58vh; overflow-y: auto;
    border-radius: 18px;
    box-shadow: 0 -12px 44px rgba(0, 0, 0, 0.6);
    animation: types-sheet-up 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  .sheet-close {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; min-height: 44px; margin-bottom: 12px;
    border: 1px solid var(--hairline); border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-2); font: inherit; font-size: 13px; cursor: pointer;
  }

  /* 热点条目在手机上也要撑到 44px 触摸目标 */
  .idle-parts .hp-btn { min-height: 44px; }

  .teardown {
    .icon { width: 44px; height: 44px; }
    .td-step { font-size: 12.5px; }
    .td-caption { font-size: 12.5px; }
  }

  /* 化学体系对比区：tab 与"加入对比"按钮原来只有 30—39px 高 */
  .chem { padding: 18px 16px; }
  .chem-tabs .btn-ghost { min-height: 44px; padding: 8px 18px; font-size: 13px; }
  .compare-row { flex-wrap: wrap;
    .btn-ghost { min-height: 44px; padding: 8px 16px; } }
  .chem-info .caliber, .chem-head .hint { font-size: 12px; }
  .badge-line { font-size: 12px; }
}

@keyframes types-sheet-up {
  from { transform: translateY(115%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
