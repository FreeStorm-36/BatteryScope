<template>
  <div class="page-full ending">
    <header class="head">
      <p class="chapter-eyebrow">Chapter 07 · 预测任务</p>
      <h2 class="chapter-title">如果让 AI 预测一块电池，它会经历什么？</h2>
      <p class="chapter-sub">只把 B0005 前 <b class="num">80</b> 次实测记录交给模型，再用后续实测记录检验它是否猜对。</p>
      <span class="corner badge-line"><DataBadge type="model" text="可解释基线输出" />真实历史输入 · 非 PINN 结果</span>
    </header>

    <div class="task">
      <div class="steps">
        <div v-for="(s, i) in steps" :key="i" class="step card-panel" :class="{ active: done >= i, current: done === i }"
          role="button" :tabindex="!running && i <= done ? 0 : -1" :aria-disabled="running || i > done"
          @click="goStep(i)" @keydown.enter="goStep(i)" @keydown.space.prevent="goStep(i)">
          <span class="step-num num">{{ ['①', '②', '③', '④', '⑤', '⑥'][i] }}</span>
          <div class="step-body">
            <b>{{ s.name }}</b>
            <transition name="fade-slide">
              <div v-if="done >= i" class="step-detail">
                <p><i>输入</i>{{ s.input }}</p>
                <p><i>发生</i>{{ s.doing }}</p>
                <p><i>输出</i>{{ s.output }}</p>
              </div>
            </transition>
          </div>
          <span v-if="done > i" class="ok"><IconGlyph name="check" /></span>
        </div>
      </div>

      <div class="result-col">
        <button class="btn-primary run-btn" @click="run" :disabled="running || done >= 6">
          <IconGlyph v-if="done >= 6" name="check" />{{ done >= 6 ? '流程已完成' : running ? '预测中…' : '开始预测流程' }}
        </button>
        <button class="btn-ghost reset-btn" @click="reset" :disabled="running"><IconGlyph name="reset" />一键复位</button>
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

        <!-- 待机引导（未开始/进行中时显示） -->
        <transition name="fade-slide">
          <div v-if="done < 6" class="idle panel">
            <div class="idle-cell">
              <div class="ic-shell"><span class="ic-liquid" :style="{ height: idlePct + '%' }"></span></div>
              <div class="idle-meta">
                <b class="num">B0005</b>
                <p>已完成 <b class="num cyan">80</b> 次循环</p>
                <p>当前 SOH <b class="num cyan">{{ (idleSoh * 100).toFixed(1) }}%</b></p>
              </div>
            </div>
            <ul class="idle-steps">
              <li v-for="(s, i) in steps" :key="i" :class="{ on: done >= i, cur: done === i }">
                <span class="n num">{{ ['①', '②', '③', '④', '⑤', '⑥'][i] }}</span>{{ s.name }}
              </li>
            </ul>
            <p class="idle-hint">{{ done < 0 ? '点击上方按钮，看基线模型完整走一遍寿命预测 →' : '流程进行中，注意左侧步骤逐一点亮…' }}</p>
          </div>
        </transition>

        <transition name="fade-slide">
          <div v-if="done >= 6" class="result panel" aria-live="polite">
            <h4>基线预测结果（留出法回测）</h4>
            <div class="big-nums">
              <div class="bn"><i>当前 SOH</i><b class="num">{{ (result.currentSoh * 100).toFixed(1) }}%</b><u>第 80 次实测</u></div>
              <div class="bn main"><i>预测 RUL</i><b class="num">{{ result.rul ?? '—' }}</b><u>距阈值剩余循环</u></div>
              <div class="bn"><i>SOH 80% 预计到达</i><b class="num">{{ result.eolCycle ?? '—' }}</b><u>循环</u></div>
            </div>
            <div class="backtest">
              <span>回测实测交点 <b class="num">第 {{ result.actualEol }} 次</b></span>
              <span>绝对误差 <b class="num">{{ result.absError }} 次</b></span>
              <span>预测区间 <b class="num">{{ result.intervalText }}</b></span>
            </div>
            <p class="holdout-note">后续实测只用于回测，未参与前 80 次历史的拟合。</p>
            <div ref="chartR" class="chart" role="img" :aria-label="`B0005 SOH 基线预测图，预计第 ${result.eolCycle} 次循环到达 80%，实测为第 ${result.actualEol} 次`"></div>
            <ul class="explain">
              <li><b>SOH</b> 是"现在的健康程度"——容量相对初始值的比例；</li>
              <li><b>RUL</b> 是"还剩多久"——距离寿命阈值（本任务采用 80% 教学参考线）还剩多少循环；</li>
              <li><b>青色虚线</b>由稳健历史斜率外推；<b>绿色实线</b>是模型未见过的留出数据；</li>
              <li><b>阴影区间</b>由历史拟合残差传播得到，只表达这条基线的不确定性，不等同于 PINN 置信区间。</li>
            </ul>
            <p class="verdict num">{{ result.method }} · EOL、RUL 与区间同源计算</p>
          </div>
        </transition>

        <!-- 最终回望 -->
        <transition name="fade-slide">
          <div v-if="done >= 6" class="lookback panel">
            <span v-for="(c, i) in concepts" :key="c" class="lb-chip" :style="{ animationDelay: i * 0.25 + 's' }">{{ c }}</span>
            <p class="final">预测不是魔法。它从每一次充放电留下的数据出发，也必须尊重电池内部真实发生的物理过程。</p>
            <p class="research">当前网页已实现可回测基线；PINN 仍是下一阶段训练、验证和替换的研究目标。</p>
          </div>
        </transition>
      </div>
    </div>

    <ChapterFooter conclusion="预测不是魔法，而是一步步从数据到规律的过程——这就是我们正在做的事。" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { initChart } from '../services/charts.js'
import { loadBattery } from '../data/index.js'
import { predictBatteryLife } from '../services/predictor.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import DataBadge from '../components/DataBadge.vue'
import IconGlyph from '../components/IconGlyph.vue'

const steps = [
  { name: '读取历史', input: 'B0005 前 80 个有效放电循环', doing: '只载入循环编号、放电容量与 SOH', output: '80 行真实历史记录' },
  { name: '检查数据', input: '循环编号与 SOH', doing: '排序、去重并剔除非法数值；原始测量波动不平滑', output: '可用记录 + 数据质量统计' },
  { name: '提取信息', input: '最近 60 条可用记录', doing: '用 Theil–Sen 中位斜率抵抗恢复尖峰和异常波动', output: '稳健退化率 + 拟合残差' },
  { name: '确认模型', input: '退化率 + 当前 SOH', doing: '采用单调指数退化基线；不冒充尚未训练的 PINN', output: '可解释基线配置' },
  { name: '推演未来', input: '真实历史 + 基线模型', doing: '外推未来 SOH，并让残差区间随预测距离展宽', output: 'SOH 预测曲线 + 基线区间' },
  { name: '判断寿命', input: '预测曲线 + 阈值', doing: '曲线与 SOH 80% 参考线相交', output: 'EOL 循环数 → RUL' }
]
const concepts = ['外形与材料', '离子与电子', '老化痕迹', '真实曲线', '寿命预测']

const done = ref(-1)       // 已完成的步骤索引（-1 = 未开始）
const running = ref(false)
const errorMessage = ref('')
const chartR = ref(null)
let chart = null, timers = []
const cachedResult = ref(null)
const result = reactive({ rul: 0, eolCycle: 0, currentSoh: 0.912, actualEol: 0, absError: 0, intervalText: '—', method: '' })

// 待机面板：真实历史 SOH + 液位示意
const idleSoh = loadBattery('B0005').cycles[79].soh
const idlePct = computed(() => Math.round(done.value >= 0 ? (done.value + 1) / 6 * 100 : idleSoh * 100))

function goStep(i) {
  if (running.value || i > done.value) return
  done.value = i - 1
  if (i === 0) reset()
}

async function run() {
  if (running.value || done.value >= 6) return
  running.value = true
  errorMessage.value = ''
  try {
    const data = loadBattery('B0005')
    const history = data.cycles.slice(0, 80).map((c) => ({ cycle: c.cycle, soh: c.soh }))
    const r = await predictBatteryLife({ history })
    const actualEol = data.cycles.find((point) => point.soh <= r.threshold)?.cycle ?? null
    cachedResult.value = r
    result.rul = r.rul
    result.eolCycle = r.eolCycle
    result.currentSoh = history.at(-1).soh
    result.actualEol = actualEol
    result.absError = actualEol == null || r.eolCycle == null ? '—' : Math.abs(actualEol - r.eolCycle)
    result.intervalText = r.eolInterval ? `${r.eolInterval[0]}–${r.eolInterval[1]} 次` : '未形成'
    result.method = r.method
  } catch (error) {
    running.value = false
    errorMessage.value = `预测未完成：${error.message}`
    return
  }

  for (let i = 0; i < 6; i++) {
    timers.push(setTimeout(() => {
      done.value = i
      if (i === 5) {
        // 流程收尾：标记完成态，结果面板 v-if="done >= 6" 随之挂载，再绘制图表
        timers.push(setTimeout(() => {
          done.value = 6
          running.value = false
          nextTick(drawResult)
        }, 350))
      }
    }, 900 * (i + 1)))
  }
}

function reset() {
  timers.forEach(clearTimeout); timers = []
  running.value = false
  done.value = -1
  errorMessage.value = ''
  chart?.dispose()
  chart = null
}

function drawResult() {
  if (!chartR.value) return
  chart = chart || initChart(chartR.value)
  const all = loadBattery('B0005').cycles
  const hist = all.slice(0, 80)
  const holdout = all.slice(79)
  const r = cachedResult.value
  if (!r) return
  {
    const xMax = Math.max(all.at(-1).cycle, r.eolCycle == null ? 0 : r.eolCycle + 12)
    const mean = r.sohForecast.map((f) => [f.cycle, +(f.mean * 100).toFixed(2)])
    const lower = r.sohForecast.map((f) => [f.cycle, +(f.lower * 100).toFixed(2)])
    const band = r.sohForecast.map((f) => [f.cycle, +((f.upper - f.lower) * 100).toFixed(2)])
    chart.setOption({
      backgroundColor: 'transparent', animationDuration: 1200,
      grid: { left: 48, right: 18, top: 48, bottom: 34 },
      legend: { top: 4, textStyle: { color: '#8b98b0', fontSize: 10 }, itemWidth: 14, itemHeight: 3 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(13,18,32,0.95)', borderColor: 'rgba(77,168,255,0.3)', textStyle: { color: '#e6edf7', fontSize: 12 } },
      xAxis: { type: 'value', min: 0, max: xMax, name: '循环', nameTextStyle: { color: '#8b98b0' }, axisLabel: { color: '#8b98b0' }, splitLine: { show: false } },
      yAxis: { type: 'value', min: 60, max: 102, axisLabel: { color: '#8b98b0', formatter: '{value}%' }, splitLine: { lineStyle: { color: 'rgba(77,168,255,0.08)' } } },
      series: [
        { name: '历史 SOH（真实测量）', type: 'line', data: hist.map((c) => [c.cycle, +(c.soh * 100).toFixed(2)]), symbol: 'none', lineStyle: { color: '#4da8ff', width: 2 }, itemStyle: { color: '#4da8ff' } },
        { name: '回测观测（未参与拟合）', type: 'line', data: holdout.map((c) => [c.cycle, +(c.soh * 100).toFixed(2)]), symbol: 'none', lineStyle: { color: '#34d399', width: 1.8 }, itemStyle: { color: '#34d399' } },
        { name: '预测区间', type: 'line', data: lower, symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 }, stack: 'confidence', silent: true },
        { name: '预测区间', type: 'line', data: band, symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(34,211,238,0.16)' }, stack: 'confidence', silent: true },
        { name: '基线预测 SOH', type: 'line', data: mean, symbol: 'none', lineStyle: { color: '#22d3ee', type: 'dashed', width: 2 }, itemStyle: { color: '#22d3ee' } },
        { name: '80% 教学参考线', type: 'line', data: [[0, 80], [xMax, 80]], symbol: 'none', lineStyle: { color: '#ef4444', type: 'dotted', width: 1.5 }, itemStyle: { color: '#ef4444' }, markPoint: { symbol: 'circle', symbolSize: 9, itemStyle: { color: '#f59e0b', shadowColor: '#f59e0b', shadowBlur: 10 }, label: { show: false }, data: [{ coord: [r.eolCycle, 80] }] } }
      ]
    }, { notMerge: true })
  }
}

function onChartResize() { chart?.resize() }
onMounted(() => { window.addEventListener('resize', onChartResize) })
onBeforeUnmount(() => { reset(); window.removeEventListener('resize', onChartResize); chart?.dispose() })
</script>

<style scoped lang="scss">
.ending { display: flex; flex-direction: column; gap: 22px; }
.head { position: relative;
  .corner { position: absolute; right: 0; top: 8px; display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-2); }
}
.task { display: grid; grid-template-columns: 1.15fr 1fr; gap: 18px; align-items: start; }
.steps { display: flex; flex-direction: column; gap: 10px; }
.step {
  display: flex; align-items: flex-start; gap: 14px; padding: 14px 18px; cursor: pointer;
  opacity: 0.45; transition: all 0.3s ease;
  &.current { opacity: 1; border-color: rgba(77, 168, 255, 0.5); box-shadow: var(--glow-blue); }
  &.active { opacity: 1; }
  .step-num { font-size: 22px; color: var(--blue); }
  .step-body { flex: 1;
    b { font-size: 15px; }
  }
  .step-detail { margin-top: 8px; display: flex; flex-direction: column; gap: 5px;
    p { font-size: 12.5px; color: var(--text-2); line-height: 1.65;
      i { font-style: normal; display: inline-block; min-width: 38px; color: var(--cyan); font-size: 11.5px; margin-right: 8px; }
    }
  }
  .ok { color: var(--green); font-size: 16px; }
}
.result-col { display: flex; flex-direction: column; gap: 12px; }
.idle { padding: 20px;
  .idle-cell { display: flex; align-items: center; gap: 18px; margin-bottom: 16px; }
  .ic-shell { width: 44px; height: 74px; border: 2px solid rgba(77,168,255,0.55); border-radius: 8px; position: relative; overflow: hidden; background: rgba(13,18,32,0.8);
    &::before { content: ''; position: absolute; top: -7px; left: 12px; right: 12px; height: 7px; border: 2px solid rgba(77,168,255,0.55); border-bottom: none; border-radius: 4px 4px 0 0; }
    .ic-liquid { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(34,211,238,0.75), rgba(77,168,255,0.5)); transition: height 0.8s ease; box-shadow: 0 0 12px rgba(34,211,238,0.4); }
  }
  .idle-meta { b { font-size: 19px; color: var(--text-1); } p { font-size: 12.5px; color: var(--text-2); margin-top: 4px; .cyan { color: var(--cyan); } } }
  .idle-steps { display: flex; flex-direction: column; gap: 7px;
    li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-3); padding: 7px 12px; border: 1px dashed var(--hairline); border-radius: 8px; transition: all 0.35s;
      .n { color: var(--text-3); }
      &.on { color: var(--text-1); border-style: solid; border-color: rgba(77,168,255,0.35); }
      &.on .n { color: var(--cyan); }
      &.cur { border-color: rgba(34,211,238,0.6); box-shadow: 0 0 14px rgba(34,211,238,0.15); }
    }
  }
  .idle-hint { margin-top: 14px; font-size: 12px; color: var(--blue); text-align: center; }
}
.run-btn { justify-content: center; font-size: 15.5px; &:disabled { opacity: 0.55; cursor: default; transform: none; } }
.reset-btn { align-self: flex-start; }
.error-message { padding: 10px 14px; border: 1px solid rgba(239,68,68,0.45); border-radius: 9px; color: #fecaca; background: rgba(239,68,68,0.08); font-size: 12.5px; }
.result { padding: 20px;
  h4 { color: var(--cyan); font-size: 15px; margin-bottom: 14px; }
}
.big-nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;
  .bn { text-align: center; padding: 12px 6px; background: rgba(20,27,46,0.6); border: 1px solid var(--hairline); border-radius: 10px;
    i { display: block; font-style: normal; font-size: 11px; color: var(--text-2); }
    b { font-size: 24px; color: var(--cyan); }
    u { display: block; text-decoration: none; font-size: 10.5px; color: var(--text-3); }
    &.main { border-color: rgba(34,211,238,0.5); box-shadow: 0 0 18px rgba(34,211,238,0.18);
      b { font-size: 30px; color: #7df3ff; } }
  }
}
.backtest { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 6px;
  span { flex: 1; min-width: 126px; padding: 7px 10px; border: 1px solid rgba(52,211,153,0.24); border-radius: 8px; color: var(--text-2); font-size: 11px; text-align: center; background: rgba(52,211,153,0.05); }
  b { color: #6ee7a0; }
}
.holdout-note { color: var(--text-3); font-size: 11px; margin-bottom: 8px; }
.chart { height: 270px; }
.explain { margin: 14px 0 10px; padding-left: 18px;
  li { font-size: 12.5px; color: var(--text-2); line-height: 1.9; b { color: var(--text-1); } }
}
.verdict { font-size: 11.5px; color: var(--amber); }
.lookback { padding: 20px; text-align: center;
  .lb-chip { display: inline-block; margin: 4px; padding: 7px 18px; border: 1px solid var(--hairline-strong); border-radius: 999px; font-size: 13px; color: #bfe3ff; animation: chipIn 0.6s ease backwards; box-shadow: 0 0 14px rgba(77,168,255,0.12); }
  .final { margin-top: 16px; font-size: 15.5px; color: var(--text-1); line-height: 1.9; }
  .research { margin-top: 8px; font-size: 12.5px; color: var(--text-2); }
}
@keyframes chipIn { from { opacity: 0; transform: translateY(12px) scale(0.92); } }
@media (max-width: 900px) {
  .task { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .big-nums { grid-template-columns: 1fr; }
  .chart { height: 300px; }
}
</style>
