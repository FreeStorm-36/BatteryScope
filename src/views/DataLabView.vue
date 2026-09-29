<template>
  <div class="page-full datalab">
    <header class="head">
      <p class="chapter-eyebrow">Chapter 05 · 真实数据实验室</p>
      <h2 class="chapter-title">真实电池，真的会这样衰老吗？</h2>
      <p class="chapter-sub">NASA PCoE 循环实验的真实测量数据——先学会看懂曲线，再做对比与环境推演。</p>
      <div class="corner badge-line">
        <span><DataBadge type="real" />NASA 实测数据 · 仅 discharge 记录，未平滑</span>
        <button class="btn-ghost" @click="showMeta = true">数据说明</button>
      </div>
    </header>

    <transition name="fade">
      <div v-if="showMeta" class="meta-overlay" @click.self="showMeta = false">
        <aside class="meta-drawer panel" role="dialog" aria-modal="true" aria-label="数据可信度说明">
          <div class="drawer-head"><div><p class="chapter-eyebrow">DATA PROVENANCE</p><h3>数据可信度说明</h3></div><button class="btn-ghost" @click="showMeta = false">关闭</button></div>
          <dl>
            <div><dt>数据集</dt><dd>NASA PCoE Battery Dataset</dd></div>
            <div><dt>当前编号</dt><dd class="num">{{ selA }}</dd></div>
            <div><dt>已显示工况</dt><dd class="num">{{ curMetaA.temp }} ℃ · {{ curMetaA.vCutoff }} V 截止</dd></div>
            <div><dt>有效记录</dt><dd>{{ curMetaA.nCycles }} 条放电容量记录</dd></div>
            <div><dt>初始容量 qRef</dt><dd>当前提取序列首条有效放电容量，{{ curMetaA.qRef }} Ah</dd></div>
            <div><dt>SOH 口径</dt><dd class="num">SOH(n) = Q(n) / qRef</dd></div>
            <div><dt>预处理</dt><dd>仅保留 discharge 记录；保留 JSON 中的 cycle 字段；页面未做平滑</dd></div>
            <div><dt>编号边界</dt><dd>这里显示“有效放电记录”；若需对应原始全局循环，还应在提取时保留 sourceCycleIndex</dd></div>
          </dl>
          <div class="badge-guide">
            <span><DataBadge type="real" />来自当前交付中的 NASA 记录</span>
            <span><DataBadge type="concept" />规则或趋势演示，不输出精确寿命</span>
            <span><DataBadge type="model" />实际算法运行后生成的结果</span>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ═══ 板块 A · 读懂一块真实电池 ═══ -->
    <div class="section-head">
      <h3>板块 A · 读懂一块真实电池</h3>
      <p>三步引导：看懂坐标 → 走过一生 → 找到寿命边界。故事模式会在 5 个关键节点停顿讲解。</p>
    </div>

    <div class="labA">
      <div class="chart-panel panel">
        <div class="batt-row">
          <button v-for="id in NASA_IDS" :key="id" class="btn-ghost num" :class="{ active: selA === id, dim: compare && selB !== id && selA !== id }" @click="pick(id)">
            {{ id }}
          </button>
          <label class="switch compare-switch"><input type="checkbox" v-model="compare" />双电池对比</label>
          <div v-if="compare" class="vs"><b class="num a">{{ selA }}</b><i>vs</i><b class="num b">{{ selB }}</b></div>
        </div>
        <div class="mode-row">
          <button class="btn-ghost" :class="{ active: playModeA === 'story' }" @click="playModeA = 'story'">故事模式</button>
          <button class="btn-ghost" :class="{ active: playModeA === 'free' }" @click="playModeA = 'free'">连续回放</button>
          <button class="btn-ghost icon" @click="togglePlay"><IconGlyph :name="playA ? 'pause' : 'play'" />{{ playA ? '暂停' : '播放' }}</button>
          <button class="btn-ghost icon" @click="stepA(1)"><IconGlyph name="step" />单步</button>
          <button class="btn-ghost icon" aria-label="复位" @click="resetA"><IconGlyph name="reset" /></button>
          <div class="speeds">
            <button v-for="s in speeds" :key="s.k" class="btn-ghost num" :class="{ active: speedKey === s.k }" @click="speedKey = s.k">{{ s.label }}</button>
          </div>
        </div>
        <div ref="chartA" class="chart" @click="onChartClick"></div>
        <div class="ref-row">
          <button class="btn-ghost info" @click="toggleRef('eol14')"><i class="dot red" />1.4 Ah 是什么？</button>
          <button class="btn-ghost info" @click="toggleRef('soh80')"><i class="dot amber" />80% 教学参考线是什么？</button>
          <span class="hint">点击曲线任意位置可跳转回放</span>
        </div>
        <transition name="fade">
          <div class="ref-explain panel-glass" v-if="refInfo" :key="refInfo.t">
            <b>{{ refInfo.title }}</b>
            <p v-html="refInfo.body"></p>
          </div>
        </transition>
      </div>

      <aside class="readout-panel">
        <div class="guide panel" :key="guideStep.k">
          <b>{{ guideStep.title }}</b>
          <p>{{ guideStep.body }}</p>
        </div>
        <div class="readouts panel">
          <div class="ro wide"><i>当前有效放电记录</i><b class="num">第 {{ cursor.cycle }} 次</b></div>
          <div class="ro"><i>放电容量</i><b class="num">{{ cursor.capacity.toFixed(3) }}</b><u>Ah</u></div>
          <div class="ro"><i>SOH</i><b class="num" :class="{ low: cursor.soh < 0.8 }">{{ (cursor.soh * 100).toFixed(1) }}%</b></div>
        </div>
        <transition name="fade-slide" mode="out-in">
          <p class="story-line panel-glass" :key="cursor.cycle">{{ cursorStory }}</p>
        </transition>
        <!-- 证据卡：为什么判定这一段在退化 -->
        <div class="evidence panel">
          <i>判定依据 · 当前点位证据</i>
          <div class="ev-row"><span>局部斜率</span><b>{{ evidence.slope }}</b></div>
          <div class="ev-row"><span>波动性质</span><b>{{ evidence.fluct }}</b></div>
          <div class="ev-row"><span>距 80% 线</span><b>{{ evidence.gap }}</b></div>
          <p class="ev-note">{{ evidence.note }}</p>
        </div>
        <div class="cond panel">
          <i>测试工况</i>
          <template v-if="!compare">
            <p class="num">{{ curMetaA.vCutoff }} V 截止 · {{ curMetaA.temp }}℃ · {{ curMetaA.nCycles }} 次有效放电记录</p>
          </template>
          <template v-else>
            <p class="num"><b class="a">{{ selA }}</b>：{{ curMetaA.vCutoff }} V · {{ curMetaA.temp }}℃</p>
            <p class="num"><b class="b">{{ selB }}</b>：{{ curMetaB.vCutoff }} V · {{ curMetaB.temp }}℃</p>
            <p class="cond-note">{{ conditionNote }}</p>
          </template>
        </div>
      </aside>
    </div>

    <!-- ═══ 板块 B · 因素—机制—趋势沙盘 ═══ -->
    <div class="section-head">
      <h3>板块 B · 因素 → 机制 → 趋势沙盘</h3>
      <p>选择环境因素 → 看它触发的老化机制 → 趋势曲线随之变化。趋势演示，不输出精确寿命数字。</p>
    </div>

    <div class="labB panel">
      <div class="sandbox">
        <!-- 列1：因素 -->
        <div class="sb-col factors">
          <h4>① 因素</h4>
          <div v-for="(cfg, k) in envRules" :key="k" class="env-group">
            <span class="env-name">{{ cfg.name }}</span>
            <div class="env-opts">
              <button v-for="o in cfg.options" :key="o.key" class="btn-ghost" :class="{ active: env[k] === o.key, hot: o.trend === 2 && env[k] === o.key }" @click="env[k] = o.key">{{ o.label }}</button>
            </div>
          </div>
        </div>
        <!-- 列2：机制链 -->
        <div class="sb-col mechs">
          <h4>② 触发的机制</h4>
          <transition-group name="fade" tag="div" class="mech-list">
            <div class="mech" v-for="m in activeMechs" :key="m.k">
              <i class="mech-dot" :class="m.level"></i>
              <div><b>{{ m.name }}</b><p>{{ m.desc }}</p></div>
            </div>
          </transition-group>
          <p v-if="comboHint" class="combo" :class="{ danger: comboHint.includes('析锂') }"><IconGlyph name="alert" />风险组合：{{ comboHint }}</p>
        </div>
        <!-- 列3：趋势 -->
        <div class="sb-col trend-col">
          <h4>③ 衰退趋势</h4>
          <div ref="chartB" class="chart"></div>
          <div class="verdict panel-glass">
            <i>组合趋势</i>
            <b :class="trendClass">{{ trendText }}</b>
          </div>
        </div>
      </div>
      <p class="tag demo sb-note">环境因素趋势演示 · 固定科普规则矩阵，非寿命预测模型</p>
    </div>

    <ChapterFooter conclusion="真实曲线告诉我们电池怎样变老；因素—机制—趋势的链条帮助我们理解它为什么可能老得更快。" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { initChart } from '../services/charts.js'
import { loadBattery, NASA_IDS, envRules, TREND_LEVELS } from '../data/index.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import DataBadge from '../components/DataBadge.vue'
import IconGlyph from '../components/IconGlyph.vue'

const showMeta = ref(false)
const selA = ref('B0005')
const selB = ref('B0006')
const compare = ref(false)
const playA = ref(false)
const playModeA = ref('story')
const cursor = reactive({ cycle: 1, capacity: 0, soh: 1 })
const chartA = ref(null)
const chartB = ref(null)
const env = reactive({ temperature: 'mid', rate: 'mid', dod: 'mid' })
const refKey = ref('')
const speeds = [{ k: 'slow', label: '0.5×', v: 0.5 }, { k: 'normal', label: '1×', v: 1 }, { k: 'fast', label: '2×', v: 2 }]
const speedKey = ref('normal')

let chart = null, chart2 = null, rafA = 0
let lastT = 0, pauseTimer = 0
let playPosition = 1

const dataA = computed(() => loadBattery(selA.value))
const dataB = computed(() => loadBattery(selB.value))
const curMetaA = computed(() => dataA.value.meta)
const curMetaB = computed(() => dataB.value.meta)
const conditionNote = computed(() => {
  const a = curMetaA.value, b = curMetaB.value
  if (a.vCutoff !== b.vCutoff) {
    return `公开元数据中的放电截止电压不同（${selA.value}：${a.vCutoff} V；${selB.value}：${b.vCutoff} V）。曲线对比只描述观测差异，不能全部归因于个体离散。`
  }
  return '已显示的温度与截止电压一致，但仅凭这些元数据仍不能排除协议细节与个体差异。'
})

const refInfo = computed(() => ({
  eol14: { t: 'eol14', title: 'NASA 停止判据 1.4 Ah', body: 'NASA 原实验以额定容量从 2 Ah 衰减至 <b>1.4 Ah（30% 容量衰减）</b>作为停止实验的判据，画在容量坐标里。它决定了曲线在哪里结束。' },
  soh80: { t: 'soh80', title: '80% 教学寿命参考线', body: '容量保持率 <b>80%</b> 常被用作教学和部分应用中的寿命参考点。这里按当前电池的初始容量画出虚线；它<b>不等于统一报废标准</b>，也不是 NASA 原实验的 1.4 Ah 停止判据。' }
}[refKey.value]))
function toggleRef(k) { refKey.value = refKey.value === k ? '' : k }

function pick(id) {
  if (compare.value) {
    if (id === selA.value) return
    selB.value = id
  } else {
    selA.value = id
  }
}

// ── 按真实 cycle 字段查找（cycle 有跳号，不能按索引-1） ──
function findCycle(d, c) {
  const cyc = d.cycles
  let lo = 0, hi = cyc.length - 1
  if (c <= cyc[0].cycle) return cyc[0]
  if (c >= cyc[hi].cycle) return cyc[hi]
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (cyc[mid].cycle <= c) lo = mid; else hi = mid
  }
  return (c - cyc[lo].cycle) <= (cyc[hi].cycle - c) ? cyc[lo] : cyc[hi]
}
function recordOf(d, c) { return d.cycles.find((x) => x.cycle === c) || findCycle(d, c) }

// ── 故事模式 5 个关键节点 ──
function keyNodes(d) {
  const cyc = d.cycles
  const eolIdx = cyc.findIndex((c) => c.soh <= 0.8)
  const nodes = [
    { c: cyc[0].cycle, label: '首次循环：出厂容量基准' },
    { c: cyc[Math.floor(cyc.length * 0.25)].cycle, label: '前期阶段：容量开始下降' },
    { c: cyc[Math.floor(cyc.length * 0.55)].cycle, label: '稳定磨损：缓慢累积' },
    { c: cyc[Math.floor(cyc.length * 0.8)].cycle, label: '波动观察：真实测量从不完美' },
    eolIdx > 0
      ? { c: cyc[eolIdx].cycle, label: `SOH 越过 80%（第 ${cyc[eolIdx].cycle} 次记录）`, eol: true }
      : { c: cyc[cyc.length - 1].cycle, label: '实验结束：未达 80% 参考线' }
  ]
  return nodes
}
const storyNodes = computed(() => keyNodes(dataA.value))
const nextNode = computed(() => storyNodes.value.find((n) => n.c > cursor.cycle) || null)
const atNode = computed(() => storyNodes.value.find((n) => Math.abs(n.c - cursor.cycle) < 3) || null)

const guideStep = computed(() => {
  const c = cursor.cycle, d = dataA.value
  if (c <= d.cycles[2].cycle) return { k: 's1', title: '① 看懂坐标', body: '横轴：循环次数（充了多少次电）；纵轴：每次放电测得的容量。这条向下的线，就是这块电池的一生。' }
  if (cursor.soh > 0.8) return { k: 's2', title: '② 沿曲线走过一生', body: '容量整体下降但伴随局部起伏。温度、静置时间、测试条件与测量误差都可能影响单次读数，因此应观察长期趋势。仅凭容量曲线不能单独识别 SEI 等微观机制。' }
  return { k: 's3', title: '③ 寻找教学参考点', body: '容量跌破初始值的 80% 时，曲线越过本站采用的教学参考线。这不代表电池立即损坏或必须报废，实际判据取决于应用、安全与标准。' }
})

const cursorStory = computed(() => {
  const s = cursor.soh
  if (s > 0.95) return '↘ 刚出厂的状态：容量接近初始值。'
  if (s > 0.9) return '↘ 前期阶段：容量小幅下降；其原因不能由容量曲线单独判定。'
  if (s > 0.85) return '↘ 稳定磨损：每一次循环留下一点点痕迹。'
  if (s > 0.8) return '↘ 接近教学参考线：损伤在累积，波动也在变大。'
  return '↘ 已越过 80% 教学参考线：容量保持率较低，但是否达到实际 EOL 需结合应用判据。'
})

// 证据卡：局部斜率 / 波动性质 / 距 80% 线
const evidence = computed(() => {
  const d = dataA.value, cyc = d.cycles
  const idx = cyc.findIndex((x) => x.cycle === cursor.cycle)
  if (idx < 0) return { slope: '—', fluct: '—', gap: '—', note: '' }
  const w = 8
  const a = cyc[Math.max(0, idx - w)], b = cyc[Math.min(cyc.length - 1, idx + w)]
  const slope = ((b.soh - a.soh) / Math.max(1, b.cycle - a.cycle)) * 100
  let win = cyc.slice(Math.max(0, idx - 5), idx + 6).map((x) => x.soh)
  const mean = win.reduce((s, v) => s + v, 0) / win.length
  const sd = Math.sqrt(win.reduce((s, v) => s + (v - mean) ** 2, 0) / win.length)
  const fluct = sd > 0.004 ? '表观波动偏大' : '波动较小，趋势稳定'
  const gapPct = (cursor.soh - 0.8) * 100
  const gap = gapPct <= 0 ? '已越过参考线' : `还差 ${gapPct.toFixed(1)} 个百分点`
  let slopeTxt
  if (slope > -0.02) slopeTxt = `≈ 平缓（每循环 −${Math.abs(slope).toFixed(3)}%）`
  else if (slope > -0.06) slopeTxt = `缓降（每循环 −${Math.abs(slope).toFixed(3)}%）`
  else slopeTxt = `加速（每循环 −${Math.abs(slope).toFixed(3)}%）`
  const note = gapPct <= 0
    ? 'SOH 已低于 80% 教学参考线；这只是本站的比较口径，不直接等于报废结论。'
    : slope < -0.06 ? '局部斜率明显变陡：退化在加速，值得重点关注。'
      : fluct.includes('偏大') ? '局部起伏可能受温度、静置、测试条件或测量影响；不能据此解释为容量真实恢复。' : '当前窗口下降较缓，仍应结合更长区间判断整体趋势。'
  return { slope: slopeTxt, fluct, gap, note }
})

const eolInfo = computed(() => {
  const a = dataA.value.cycles.findIndex((c) => c.soh <= 0.8)
  const b = dataB.value.cycles.findIndex((c) => c.soh <= 0.8)
  const ai = a > 0 ? dataA.value.cycles[a].cycle : null
  const bi = b > 0 ? dataB.value.cycles[b].cycle : null
  if (ai == null && bi == null) return '两块电池在各自实验周期内均未到达 80% 教学寿命参考线。'
  if (bi == null || (ai != null && ai < bi)) return `按 80% 教学寿命参考线：${selA.value} 先到达（第 ${ai} 次记录）。`
  return `按 80% 教学寿命参考线：${selB.value} 先到达（第 ${bi} 次记录）。`
})

// ── 图 A ──
function drawA() {
  const d = dataA.value
  const series = []
  const mk = (data, color, name) => ({
    name, type: 'line', data, smooth: false, symbol: 'none',
    lineStyle: { color, width: 2 }, itemStyle: { color }
  })
  const capA = d.cycles.map((c) => [c.cycle, +c.capacity.toFixed(4)])
  series.push(mk(capA, '#4da8ff', `${d.id} 放电容量`))
  const lastCycleA = d.cycles[d.cycles.length - 1].cycle
  const lastCycleB = compare.value ? dataB.value.cycles[dataB.value.cycles.length - 1].cycle : 0
  const maxX = Math.max(lastCycleA, lastCycleB)
  if (compare.value) {
    const db = dataB.value
    series.push(mk(db.cycles.map((c) => [c.cycle, +c.capacity.toFixed(4)]), '#22d3ee', `${db.id} 放电容量`))
    // 游标位置：短者的曲线到头后停住，游标仍随长者推进
    const cb = recordOf(db, cursor.cycle)
    series.push({
      name: 'playheadB', type: 'line', data: [], silent: true,
      markPoint: { symbol: 'circle', symbolSize: 9, itemStyle: { color: 'rgba(34,211,238,0.85)' }, label: { show: false }, data: [{ coord: [cb.cycle, +cb.capacity.toFixed(3)] }] }
    })
  }
  // NASA 原始 1.4Ah 停止判据
  series.push({
    name: 'NASA 停止判据 1.4Ah', type: 'line', data: [[1, 1.4], [maxX, 1.4]], symbol: 'none',
    lineStyle: { color: '#ef4444', type: 'dashed', width: 1.6 }, itemStyle: { color: '#ef4444' }
  })
  // 80% 教学参考线（当前电池口径；对比时两条都画）
  const y80 = +(d.meta.qRef * 0.8).toFixed(3)
  series.push({
    name: '80% 教学参考线', type: 'line', data: [[1, y80], [maxX, y80]], symbol: 'none',
    lineStyle: { color: '#f59e0b', type: 'dotted', width: 1.4 }, itemStyle: { color: '#f59e0b' }
  })
  if (compare.value) {
    const y80b = +(dataB.value.meta.qRef * 0.8).toFixed(3)
    if (Math.abs(y80b - y80) > 0.005) series.push({
      name: `${dataB.value.id} 80% 线`, type: 'line', data: [[1, y80b], [maxX, y80b]], symbol: 'none',
      lineStyle: { color: 'rgba(245,158,11,0.45)', type: 'dotted', width: 1.2 }, itemStyle: { color: 'rgba(245,158,11,0.45)' }
    })
  }
  // 播放头
  series.push({
    name: 'playhead', type: 'line', data: [], silent: true,
    markPoint: { symbol: 'circle', symbolSize: 10, itemStyle: { color: '#22d3ee', shadowColor: '#22d3ee', shadowBlur: 12 }, label: { show: false }, data: [{ coord: [cursor.cycle, +cursor.capacity.toFixed(3)] }] },
    markLine: { silent: true, symbol: 'none', lineStyle: { color: 'rgba(34,211,238,0.35)', width: 1.4 }, label: { show: false }, data: [{ xAxis: cursor.cycle }] }
  })

  chart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 600,
    grid: { left: 56, right: 22, top: 42, bottom: 44 },
    legend: { textStyle: { color: '#8b98b0', fontSize: 11 }, top: 4, icon: 'rect', itemWidth: 14, itemHeight: 3 },
    tooltip: { trigger: 'item', backgroundColor: 'rgba(13,18,32,0.95)', borderColor: 'rgba(77,168,255,0.3)', textStyle: { color: '#e6edf7', fontSize: 12 } },
    xAxis: { type: 'value', min: 0, max: maxX, name: '循环', nameTextStyle: { color: '#8b98b0' }, axisLabel: { color: '#8b98b0' }, splitLine: { show: false }, axisLine: { lineStyle: { color: 'rgba(77,168,255,0.3)' } } },
    yAxis: { type: 'value', min: 1.1, max: 2.1, name: '容量 (Ah)', nameTextStyle: { color: '#8b98b0' }, axisLabel: { color: '#8b98b0' }, splitLine: { lineStyle: { color: 'rgba(77,168,255,0.08)' } } },
    series
  }, { notMerge: true })
}

function syncCursor(target = cursor.cycle) {
  const c = recordOf(dataA.value, target)
  cursor.cycle = c.cycle
  cursor.capacity = c.capacity
  cursor.soh = c.soh
}

// 点击图面跳转
function onChartClick() { /* echarts click 事件在 init 后绑定 */ }

function stepA(dir) {
  playA.value = false
  const d = dataA.value
  const idx = d.cycles.findIndex((x) => x.cycle === cursor.cycle)
  const ni = idx < 0 ? 0 : Math.min(d.cycles.length - 1, Math.max(0, idx + dir))
  cursor.cycle = d.cycles[ni].cycle
  playPosition = cursor.cycle
  syncCursor(); drawA()
}
function resetA() {
  playA.value = false
  clearTimeout(pauseTimer)
  cursor.cycle = dataA.value.cycles[0].cycle
  playPosition = cursor.cycle
  syncCursor(); drawA()
}
function advanceStory() {
  clearTimeout(pauseTimer)
  const next = storyNodes.value.find((n) => n.c > cursor.cycle)
  if (!next) { playA.value = false; return }
  playPosition = next.c
  syncCursor(playPosition)
  drawA()
  pauseTimer = setTimeout(() => {
    if (playA.value && playModeA.value === 'story') advanceStory()
  }, 2400)
}
function togglePlay() {
  clearTimeout(pauseTimer)
  if (playA.value) { playA.value = false; return }
  playA.value = true
  if (playModeA.value === 'story') advanceStory()
}

// ── 板块 B：因素 → 机制 → 趋势 ──
const MECH_LIB = {
  sei: { k: 'sei', name: 'SEI 增厚', desc: '负极表面保护膜变厚，可用的锂变少', level: 'mid' },
  polar: { k: 'polar', name: '极化加剧', desc: '离子迁移阻力上升，可用容量缩水', level: 'mid' },
  heat: { k: 'heat', name: '产热与副反应', desc: '温度升高加速电解液分解等副反应', level: 'hot' },
  lithium: { k: 'lithium', name: '析锂风险', desc: '低温/大倍率下锂离子"来不及接收"，金属锂沉积', level: 'hot' },
  stress: { k: 'stress', name: '颗粒应力累积', desc: '深度充放让电极材料反复膨胀收缩，产生微裂纹', level: 'mid' }
}
const activeMechs = computed(() => {
  const out = []
  const add = (k, hot) => { const m = MECH_LIB[k]; if (!out.includes(m)) out.push({ ...m, level: hot ? 'hot' : m.level }) }
  const T = env.temperature, R = env.rate, D = env.dod
  if (T === 'low') add('polar', true)
  if (T === 'high') add('heat', true)
  if (R === 'fast') { add('polar', true); add('lithium', T === 'low') }
  if (R === 'slow' && T !== 'low') add('sei', false)
  if (D === 'deep') add('stress', true)
  if (out.length === 0) add('sei', false)
  return out
})

const activeReasons = computed(() => {
  const out = []
  for (const k in envRules) {
    const o = envRules[k].options.find((o) => o.key === env[k])
    out.push(`【${envRules[k].name}·${o.label}】${o.explain}`)
  }
  return out
})
const trendText = computed(() => TREND_LEVELS[Math.min(3, activeTrend.value)])
const activeTrend = computed(() => {
  let t = 1
  for (const k in envRules) {
    t += envRules[k].options.find((o) => o.key === env[k]).trend - 1
  }
  return Math.max(0, t)
})
const trendClass = computed(() => ['good', '', 'warn', 'bad'][Math.min(3, activeTrend.value)])
const comboHint = computed(() => {
  if (env.temperature === 'low' && env.rate === 'fast') return '低温 × 快充 —— 析锂风险组合'
  if (env.temperature === 'high' && env.rate === 'fast') return '高温 × 快充 —— 副反应叠加组合'
  return ''
})

function drawB() {
  const sev = activeTrend.value // 0..3
  const xs = []
  const ys = []
  const y2 = []
  const k = [0.6, 1, 1.5, 2.1][sev]
  for (let c = 0; c <= 600; c += 5) {
    xs.push(c)
    ys.push(+Math.max(60, 100 - 1.1 * k * (c / 600) * 22 - 0.4 * k * Math.pow(c / 600, 2.2) * 22).toFixed(2))
    y2.push(+(100 + (k - 1) * 22 * (c / 600) + (k > 1 ? 8 * Math.pow(c / 600, 2) : 0)).toFixed(2))
  }
  chart2.setOption({
    backgroundColor: 'transparent',
    animationDuration: 700,
    grid: { left: 46, right: 14, top: 26, bottom: 36 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(13,18,32,0.95)', borderColor: 'rgba(77,168,255,0.3)', textStyle: { color: '#e6edf7', fontSize: 12 } },
    xAxis: { type: 'category', data: xs, name: '循环', nameTextStyle: { color: '#8b98b0' }, axisLabel: { color: '#8b98b0' }, axisLine: { lineStyle: { color: 'rgba(77,168,255,0.3)' } } },
    yAxis: { type: 'value', min: 55, max: 135, axisLabel: { color: '#8b98b0' }, splitLine: { lineStyle: { color: 'rgba(77,168,255,0.08)' } } },
    series: [
      { name: 'SOH 趋势（示意）', type: 'line', data: ys, smooth: 0.4, symbol: 'none', lineStyle: { color: sev >= 2 ? '#f59e0b' : '#34d399', width: 2.4 }, itemStyle: { color: sev >= 2 ? '#f59e0b' : '#34d399' }, areaStyle: { color: 'rgba(77,168,255,0.06)' } },
      { name: '内阻趋势（示意）', type: 'line', data: y2, smooth: 0.4, symbol: 'none', lineStyle: { color: '#ef4444', width: 1.8, type: 'dashed' }, itemStyle: { color: '#ef4444' } }
    ]
  }, { notMerge: true })
}

onMounted(async () => {
  await nextTick()
  chart = initChart(chartA.value)
  chart2 = initChart(chartB.value)
  playPosition = dataA.value.cycles[0].cycle
  syncCursor()
  drawA(); drawB()
  chart.on('click', (p) => {
    if (p.value && typeof p.value[0] === 'number') {
      playA.value = false
      clearTimeout(pauseTimer)
      playPosition = p.value[0]
      syncCursor(playPosition); drawA()
    }
  })
  window.addEventListener('resize', onResize)

  // 连续回放：deltaTime 驱动 + 故事节点停顿
  const loopA = (t) => {
    rafA = requestAnimationFrame(loopA)
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016)
    lastT = t
    if (!playA.value) return
    const d = dataA.value
    if (playModeA.value === 'story') return
    const spd = speeds.find((s) => s.k === speedKey.value).v
    const perSec = 22 * spd
    playPosition += perSec * dt
    const lastCycle = d.cycles[d.cycles.length - 1].cycle
    if (playPosition >= lastCycle) { playPosition = lastCycle; playA.value = false }
    syncCursor(playPosition); drawA()
  }
  rafA = requestAnimationFrame(loopA)
})

function onResize() { chart?.resize(); chart2?.resize() }
watch([selA, selB, compare], () => {
  clearTimeout(pauseTimer)
  playA.value = false
  playPosition = dataA.value.cycles[0].cycle
  syncCursor(playPosition)
  drawA()
})
watch(playModeA, () => {
  clearTimeout(pauseTimer)
  playA.value = false
})
watch(env, drawB, { deep: true })

onBeforeUnmount(() => {
  cancelAnimationFrame(rafA)
  clearTimeout(pauseTimer)
  window.removeEventListener('resize', onResize)
  chart?.dispose(); chart2?.dispose()
})
</script>

<style scoped lang="scss">
.datalab { display: flex; flex-direction: column; gap: 22px; }
.head { position: relative;
  .corner { position: absolute; right: 0; top: 8px; display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-2); }
  .corner > span { display: flex; align-items: center; gap: 9px; }
}
.meta-overlay { position: fixed; inset: 0; z-index: 180; display: flex; justify-content: flex-end; background: rgba(0, 7, 6, .58); backdrop-filter: blur(5px); }
.meta-drawer {
  width: min(520px, 94vw); height: 100%; padding: 28px; overflow-y: auto; border-radius: 22px 0 0 22px;
  background: rgba(7, 20, 17, .98);
  .drawer-head { display: flex; align-items: start; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--hairline); }
  .drawer-head h3 { font-size: 22px; }
  dl > div { display: grid; grid-template-columns: 120px 1fr; gap: 18px; padding: 13px 0; border-bottom: 1px solid rgba(112,180,160,.12); }
  dt { color: var(--text-3); font-size: 12px; }
  dd { color: var(--text-1); font-size: 12.5px; }
  .badge-guide { display: grid; gap: 10px; margin-top: 22px; padding: 16px; border: 1px solid var(--hairline); border-radius: 14px; }
  .badge-guide span { display: flex; align-items: center; gap: 9px; color: var(--text-2); font-size: 11.5px; }
}
.section-head {
  h3 { font-size: 19px; }
  p { font-size: 13px; color: var(--text-2); }
}
.labA { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; }
.chart-panel { padding: 16px;
  .batt-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;
    .dim { opacity: 0.55; } }
  .mode-row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; align-items: center;
    .icon { padding: 6px 14px; }
    .speeds { display: flex; gap: 5px; margin-left: auto; } }
  .chart { height: 340px; }
  .ref-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap;
    .info { font-size: 12px; padding: 4px 10px; display: flex; align-items: center; gap: 6px;
      .dot { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
      .dot.red { background: #ef4444; } .dot.amber { background: #f59e0b; } }
    .hint { font-size: 12px; color: var(--text-2); margin-left: auto; } }
  .ref-explain { margin-top: 10px; padding: 12px 16px; font-size: 12.5px; color: var(--text-2); line-height: 1.8;
    b { color: var(--amber); display: block; margin-bottom: 4px; } }
}
.switch { font-size: 12.5px; color: var(--text-2); display: flex; align-items: center; gap: 6px; input { accent-color: var(--blue); } }
.vs { font-size: 13px; color: var(--text-2); display: flex; align-items: center; gap: 8px;
  i { font-style: normal; font-size: 11px; opacity: 0.7; }
  b.a { color: #4da8ff; } b.b { color: var(--cyan); } }
.readout-panel { display: flex; flex-direction: column; gap: 12px;
  .guide { padding: 15px 18px; b { color: var(--blue); } p { font-size: 13px; color: var(--text-2); margin-top: 6px; line-height: 1.8; } }
  .readouts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px;
    .ro { text-align: center; i { display: block; font-style: normal; font-size: 11.5px; color: var(--text-2); } b { font-size: 20px; color: var(--cyan); }
      b.low { color: var(--amber); }
      .ro.wide, &.wide { grid-column: 1 / -1; } u { text-decoration: none; font-size: 11px; color: var(--text-2); } } }
  .story-line { padding: 12px 16px; font-size: 13px; color: var(--text-1); }
  .evidence { padding: 12px 16px;
    i { font-style: normal; font-size: 11px; color: var(--blue); letter-spacing: 0.15em; }
    .ev-row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-top: 7px; font-size: 12.5px;
      span { color: var(--text-2); } b { color: var(--text-1); text-align: right; } }
    .ev-note { margin-top: 9px; font-size: 12px; color: var(--text-2); line-height: 1.7; border-top: 1px solid rgba(77,168,255,0.12); padding-top: 8px; } }
  .cond { padding: 12px 16px; i { font-style: normal; font-size: 11.5px; color: var(--blue); letter-spacing: 0.15em; } p { font-size: 12.5px; color: var(--text-2); margin-top: 4px; }
    p b.a { color: #4da8ff; } p b.b { color: var(--cyan); }
    .cond-note { font-size: 11.5px; opacity: 0.8; } }
}
.labB { padding: 20px; }
.sandbox { display: grid; grid-template-columns: 1fr 1.1fr 1.5fr; gap: 20px;
  h4 { font-size: 13px; color: var(--blue); letter-spacing: 0.12em; margin-bottom: 12px; } }
.factors { .env-group { margin-bottom: 14px; }
  .env-name { display: block; font-size: 12.5px; color: var(--text-1); margin-bottom: 6px; }
  .env-opts { display: flex; gap: 6px; flex-wrap: wrap; }
  .hot { border-color: rgba(239, 68, 68, 0.5); color: #ffb4b4; } }
.mechs { .mech-list { display: flex; flex-direction: column; gap: 9px; }
  .mech { display: flex; gap: 10px; align-items: flex-start; padding: 9px 12px; background: rgba(13,18,32,0.5); border: 1px solid rgba(77,168,255,0.12); border-radius: 10px;
    .mech-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: #4da8ff; box-shadow: 0 0 6px #4da8ff; }
    .mech-dot.hot { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    b { font-size: 13px; color: var(--text-1); display: block; }
    p { font-size: 12px; color: var(--text-2); margin-top: 2px; line-height: 1.6; } }
  .combo { margin-top: 12px; font-size: 12.5px; color: var(--amber); line-height: 1.7;
    &.danger { color: #ffb4b4; } } }
.trend-col { display: flex; flex-direction: column;
  .chart { height: 250px; }
  .verdict { margin-top: 10px; padding: 10px 16px; display: flex; align-items: center; justify-content: center; gap: 14px;
    i { font-style: normal; font-size: 11.5px; color: var(--text-2); letter-spacing: 0.2em; }
    b { font-size: 22px; &.good { color: var(--green); } &.warn { color: var(--amber); } &.bad { color: var(--red); } } } }
.sb-note { margin-top: 14px; font-size: 11.5px; color: var(--text-2); }
@media (max-width: 900px) {
  .labA, .sandbox { grid-template-columns: 1fr; }
}
</style>
