<template>
  <div class="game strat">
    <div class="g-head">
      <div class="g-title">
        <span class="g-badge">游戏 02</span>
        <b>快充抉择</b>
        <i>给下一段使用选个充电策略</i>
      </div>
      <span class="g-stat num" v-if="!over">已用 {{ segments * 10 }} 循环 · SOH {{ soh.toFixed(1) }}%</span>
      <span class="g-stat num" v-else>游戏结束</span>
    </div>

    <div class="g-body">
      <div class="g-left panel">
        <div class="gs-chart">
          <svg viewBox="0 0 340 150" class="gs-svg" role="img" aria-label="SOH 随使用策略变化的曲线">
            <!-- 网格与参考线 -->
            <line v-for="v in [70, 80, 90, 100]" :key="v" :x1="34" :x2="328" :y1="yOf(v)" :y2="yOf(v)"
                  :class="v === 80 ? 'gs-ref' : 'gs-grid'" />
            <text v-for="v in [70, 80, 100]" :key="'t' + v" :x="2" :y="yOf(v) + 3.5" class="gs-axis">{{ v }}</text>
            <!-- SOH 曲线 -->
            <polyline class="gs-line" :points="linePoints" />
            <circle v-for="(p, i) in history" :key="i" class="gs-dot" :cx="xOf(i)" :cy="yOf(p)" r="2.6" />
            <text x="324" :y="yOf(80) - 5" class="gs-reflabel" text-anchor="end">EOL 80% 教学参考线</text>
          </svg>
        </div>
        <div class="gs-cellbox">
          <div class="gs-cell" :class="cellClass">
            <svg viewBox="0 0 120 168" class="gs-battery" aria-label="电池状态示意">
              <rect x="46" y="6" width="28" height="9" rx="3" fill="#c9d4e4" opacity=".8" />
              <g class="gs-shell">
                <rect x="26" y="14" width="68" height="140" rx="14" fill="#2a3448" stroke="rgba(120,180,255,.4)" stroke-width="1.4" />
              </g>
              <rect x="32" y="20" width="56" height="128" rx="9" fill="rgba(10,14,26,.55)" />
              <rect class="gs-fill" x="34" y="22" width="52" :height="fillHeight" rx="7" :fill="fillColor" />
              <!-- 析锂斑点：银白，随严重度浮现 -->
              <g class="gs-flakes" :opacity="flakeOpacity">
                <circle cx="48" cy="118" r="3.4" fill="#e2e8f0" />
                <circle cx="66" cy="128" r="2.8" fill="#e2e8f0" />
                <circle cx="56" cy="106" r="2.2" fill="#e2e8f0" />
              </g>
              <text x="60" y="163" class="gs-caption" text-anchor="middle">SOH {{ soh.toFixed(1) }}%</text>
            </svg>
          </div>
          <ul class="gs-meters">
            <li><span>SEI 增厚</span><i class="gs-meter"><b :style="{ width: st.sei * 100 + '%', background: '#f59e0b' }"></b></i></li>
            <li><span>析锂沉积</span><i class="gs-meter"><b :style="{ width: st.plating * 100 + '%', background: '#e2e8f0' }"></b></i></li>
            <li><span>产气鼓胀</span><i class="gs-meter"><b :style="{ width: st.gas * 100 + '%', background: '#f87171' }"></b></i></li>
          </ul>
        </div>
      </div>

      <div class="g-right">
        <p class="gs-q">接下来 10 个循环，这块电池怎么用？</p>
        <button v-for="s in strategies" :key="s.key" type="button" class="gs-opt" :disabled="over" @click="choose(s)">
          <b>{{ s.label }}</b>
          <i>{{ s.hint }}</i>
        </button>
        <transition name="fade-slide" mode="out-in">
          <p v-if="eventText" class="gs-event" :class="{ warn: eventIsDamage }" :key="segments">{{ eventText }}</p>
        </transition>
      </div>
    </div>

    <div v-if="over" class="g-over panel">
      <div class="go-score num">{{ rank.grade }}</div>
      <b>{{ rank.title }} · 撑过 {{ segments * 10 }} 个循环</b>
      <p>{{ rank.line }} 主导衰减机制：{{ dominant }}。</p>
      <button type="button" class="btn-primary" @click="restart">再跑一轮</button>
    </div>

    <p class="g-caliber">{{ caliber }}</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { strategies, strategyEvent, strategyRank, STRATEGY_CALIBER } from '../../data/games.js'
import { notifyAssistant } from '../../services/assistantBus.js'
import { assistantCorpus } from '../../data/assistantCorpus.js'

const caliber = STRATEGY_CALIBER
const MAX_SEG = 22          // 曲线横轴上限（段）
const soh = ref(100)
const segments = ref(0)
const history = ref([100])
const eventText = ref('')
const eventIsDamage = ref(false)
const over = ref(false)
const st = reactive({ sei: 0, plating: 0, gas: 0, temp: 0 })
const fired = reactive({})

const AID = { plating: 'plating', sei: 'sei', gas: 'gas', temp: 'usage-factors' }

function choose(s) {
  if (over.value) return
  soh.value = Math.max(0, soh.value + s.soh)
  st.sei = Math.min(1, st.sei + s.sei)
  st.plating = Math.min(1, st.plating + s.plating)
  st.gas = Math.min(1, st.gas + s.gas)
  st.temp = Math.max(0, st.temp + s.temp)
  segments.value += 1
  history.value.push(+soh.value.toFixed(1))

  const ev = strategyEvent({ plating: st.plating, sei: st.sei, gas: st.gas, temp: st.temp }, fired)
  if (ev) {
    eventText.value = ev.text
    eventIsDamage.value = true
    const entry = assistantCorpus.find((c) => c.id === AID[ev.key])
    notifyAssistant({
      text: entry ? `${ev.text} ${entry.a}` : ev.text,
      mood: 'concern',
      path: entry?.path || '',
      ch: entry?.ch || ''
    })
  } else {
    eventText.value = s.flavor
    eventIsDamage.value = false
  }

  if (soh.value <= 80) over.value = true
}

function restart() {
  soh.value = 100
  segments.value = 0
  history.value = [100]
  eventText.value = ''
  eventIsDamage.value = false
  over.value = false
  st.sei = st.plating = st.gas = st.temp = 0
  for (const k in fired) delete fired[k]
}

/* 曲线坐标：SOH 70—100 → y 132—20 */
const yOf = (v) => 132 - ((Math.max(60, Math.min(100, v)) - 70) / 30) * 112
const xOf = (i) => 34 + (i / MAX_SEG) * 294
const linePoints = computed(() => history.value.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' '))

const fillHeight = computed(() => Math.max(4, 124 * (soh.value / 100)))
const fillColor = computed(() => (soh.value >= 90 ? '#34d399' : soh.value >= 85 ? '#22d3ee' : '#f59e0b'))
const cellClass = computed(() => (soh.value >= 90 ? 'healthy' : soh.value >= 85 ? 'warn' : 'bad'))
const flakeOpacity = computed(() => Math.max(0, (st.plating - 0.15) / 0.35))

const rank = computed(() => strategyRank(segments.value))
const dominant = computed(() => {
  const m = [['SEI 增厚', st.sei], ['析锂', st.plating], ['产气鼓胀', st.gas]]
  m.sort((a, b) => b[1] - a[1])
  return m[0][1] > 0 ? m[0][0] : '无明显机制累积'
})
</script>

<style scoped lang="scss">
.game {
  padding: 18px 20px;
  .g-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
    .g-title { display: flex; align-items: baseline; gap: 10px;
      b { font-size: 17.5px; color: var(--text-1); }
      i { font-style: normal; font-size: 14px; color: var(--text-3); } }
    .g-stat { font-size: 14px; color: var(--cyan); } }
  .g-body { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 16px; align-items: start; }
  .g-caliber { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--hairline); font-size: 14px; color: var(--text-3); line-height: 1.7; }
}
.g-badge { padding: 2px 9px; border: 1px solid rgba(34, 211, 238, 0.4); border-radius: 999px; font-size: 14px; color: var(--cyan); }

.gs-svg { display: block; width: 100%; height: auto; }
.gs-grid { stroke: rgba(77, 168, 255, 0.1); stroke-width: 1; }
.gs-ref { stroke: rgba(239, 68, 68, 0.55); stroke-width: 1.2; stroke-dasharray: 5 4; }
.gs-axis { fill: var(--text-3); font-size: 14px; }
.gs-reflabel { fill: rgba(239, 68, 68, 0.75); font-size: 14px; text-anchor: end; }
.gs-line { fill: none; stroke: var(--cyan); stroke-width: 2; stroke-linejoin: round; }
.gs-dot { fill: var(--cyan); }
.gs-caption { fill: var(--text-2); font-size: 15px; }

.gs-cellbox { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 14px; align-items: center; margin-top: 12px; }
.gs-battery { display: block; width: 110px; height: auto; }
.gs-shell { transform-origin: center; transition: transform 0.5s ease; }
.gs-cell.bad .gs-shell { transform: scale(1.05); }
.gs-fill { transition: height 0.45s ease, fill 0.45s ease; }
.gs-flakes { transition: opacity 0.5s ease; }
.gs-meters { list-style: none; display: flex; flex-direction: column; gap: 9px;
  li { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 10px; align-items: center;
    span { font-size: 14px; color: var(--text-2); }
    i { display: block; height: 8px; border-radius: 4px; background: rgba(77, 168, 255, 0.1); overflow: hidden;
      b { display: block; height: 100%; border-radius: 4px; transition: width 0.45s ease; } } } }

.gs-q { font-size: 15px; color: var(--text-1); margin-bottom: 10px; }
.gs-opt {
  display: block; width: 100%; text-align: left;
  min-height: 44px; margin-bottom: 8px; padding: 9px 13px;
  border: 1px solid var(--hairline); border-radius: 10px;
  background: rgba(19, 26, 43, 0.55); cursor: pointer; transition: all 0.2s ease;
  b { display: block; font-size: 15px; color: var(--text-1); }
  i { display: block; margin-top: 2px; font-style: normal; font-size: 14px; color: var(--text-3); }
  &:not(:disabled):hover { border-color: var(--hairline-strong); background: rgba(77, 168, 255, 0.08); }
  &:disabled { opacity: 0.5; cursor: default; }
}
.gs-event { margin-top: 4px; padding: 10px 14px; border-left: 2px solid rgba(34, 211, 238, 0.5); border-radius: 0 8px 8px 0;
  background: rgba(34, 211, 238, 0.05); font-size: 14.5px; color: var(--text-2); line-height: 1.85;
  &.warn { border-left-color: rgba(245, 158, 11, 0.6); background: rgba(245, 158, 11, 0.06); } }

.g-over { text-align: center; padding: 26px 20px;
  .go-score { font-size: 34px; color: var(--cyan); }
  b { display: block; margin: 6px 0 8px; font-size: 17px; color: var(--text-1); }
  p { font-size: 14.5px; color: var(--text-2); line-height: 1.8; max-width: 52ch; margin: 0 auto 16px; }
  .btn-primary { min-height: 44px; } }

@media (max-width: 1080px) {
  .game .g-body { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .game { padding: 14px 16px; }
  .gs-opt { b { font-size: 15.5px; } i { font-size: 14px; } }
  .gs-event { font-size: 14.5px; }
  .gs-cellbox { grid-template-columns: 104px minmax(0, 1fr); }
  /* SVG 内文字按 viewBox 缩放：窄屏容器约为 viewBox 的 0.87—0.97 倍，
     用户单位字号相应放大，保证渲染后仍 ≥12px 可读下限 */
  .gs-axis { font-size: 15px; }
  .gs-reflabel { font-size: 14.5px; }
  .gs-caption { font-size: 17px; }
}
</style>
