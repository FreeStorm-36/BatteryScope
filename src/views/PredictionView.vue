<template>
  <div class="page-full prediction">
    <header class="head">
      <p class="chapter-eyebrow">Chapter 06 · 预测方法实验室</p>
      <h2 class="chapter-title">同一道预测题，三种解法</h2>
      <p class="chapter-sub">三条路线回答同一个问题：输入什么、里面怎么算、输出什么。切换路线，看各自的解法与权衡。</p>
      <span class="corner badge-line"><DataBadge type="concept" />方法演示 · 示意输出，非真实模型结果</span>
    </header>

    <!-- 固定问题卡：三条路线共答 -->
    <div class="quiz panel">
      <div class="q-main">
        <span class="q-tag">固定问题 · 三条路线都要回答</span>
        <p class="q-text">电池 <b class="num">B0005</b> 在完成了前 <b class="num">80</b> 次有效放电记录后，<b>剩余寿命（RUL）还有多长？</b></p>
      </div>
      <div class="q-input panel-glass">
        <i>共用的输入数据</i>
        <div class="spark" aria-hidden="true">
          <span v-for="(h, n) in sparkBars" :key="n" class="s-bar" :style="{ height: h + '%' }"></span>
          <span class="q-cut" title="80 次记录处截断"></span>
        </div>
        <p class="num q-note">前 80 次放电容量记录 · 之后未知</p>
      </div>
    </div>

    <!-- 路线切换 -->
    <div class="route-tabs">
      <button v-for="r in routes" :key="r.key" class="tab" :class="{ active: route === r.key }" @click="route = r.key">
        <svg class="t-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="r.key === 'physics'">
            <circle cx="12" cy="12" r="1.6" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-60 12 12)" />
          </template>
          <template v-else-if="r.key === 'data'">
            <path d="M3 20 L7.5 12 L11.5 15.5 L16 6 L21 9" />
            <circle cx="7.5" cy="12" r="1.2" /><circle cx="11.5" cy="15.5" r="1.2" /><circle cx="16" cy="6" r="1.2" />
          </template>
          <template v-else>
            <path d="M12 4 L12 20" />
            <path d="M4 8 C7 8 8 11 12 11 C16 11 17 14 20 14" />
            <path d="M4 16 C7 16 8 13 12 13 C16 13 17 10 20 10" stroke-dasharray="2.5 2.5" />
            <circle cx="12" cy="12" r="1.4" />
          </template>
        </svg>
        <span class="t-name">{{ r.name }}</span>
        <span class="t-brief">{{ r.brief }}</span>
      </button>
    </div>

    <!-- 中央实验舞台 -->
    <div class="stage panel">
      <div class="stage-left">
        <h4>{{ cur.name }} · 解法</h4>
        <div class="io-flow">
          <div class="io card-panel"><i>输入</i><b>{{ cur.input }}</b></div>
          <span class="io-arrow">→</span>
          <div class="io card-panel"><i>模型内部</i><b>{{ cur.inner }}</b></div>
          <span class="io-arrow">→</span>
          <div class="io card-panel"><i>输出</i><b>{{ cur.output }}</b></div>
        </div>

        <!-- 物理路线：机制开关 -->
        <div v-if="route === 'physics'" class="inner-zone">
          <p class="zone-title">假设实验：拨动内部机制开关，看响应曲线怎么变</p>
          <div class="chips">
            <button v-for="m in physicsModules" :key="m.key" class="btn-ghost" :class="{ active: pickP === m.key }" @click="pickP = m.key">{{ m.name }}</button>
          </div>
          <transition name="fade-slide" mode="out-in">
            <div class="module-detail card-panel" :key="pickP">
              <b>{{ curP.name }}</b>
              <p class="num eq">{{ curP.eq }}</p>
              <p>{{ curP.desc }}</p>
              <p class="dim">影响：{{ curP.impact }} · 假设加速该机制 → 容量衰减前移，RUL 缩短（示意）</p>
            </div>
          </transition>
          <p class="note">物理模型可解释性强，但需要大量材料参数和内部状态信息；公开数据集不总能提供这些变量，通常需要参数适配。</p>
        </div>

        <!-- 数据路线：积木 + mini viz -->
        <div v-else-if="route === 'data'" class="inner-zone">
          <p class="zone-title">假设实验：切换学习积木，看模型"看"什么</p>
          <div class="chips">
            <button v-for="m in dataModules" :key="m.key" class="btn-ghost" :class="{ active: pickD === m.key }" @click="pickD = m.key">{{ m.name }}</button>
          </div>
          <transition name="fade-slide" mode="out-in">
            <div class="module-detail card-panel" :key="pickD">
              <b>{{ curD.name }}</b>
              <p>{{ curD.desc }}</p>
              <div class="mini-viz">
                <div v-if="pickD === 'cnn'" class="viz-cnn">
                  <div class="wave"><span v-for="n in 40" :key="n" class="w-bar" :style="{ height: (18 + 26 * Math.abs(Math.sin(n / 4.5))) + '%' }"></span>
                    <span class="conv-win" :style="{ left: convPos + '%' }"></span>
                  </div>
                  <p class="viz-label num">卷积窗口沿充电电压曲线滑动 → 提取局部形状与拐点（示意）</p>
                </div>
                <div v-else-if="pickD === 'gru'" class="viz-gru">
                  <span v-for="n in 14" :key="n" class="g-dot" :class="{ lit: n <= gruLit }">{{ n * 6 }}</span>
                  <p class="viz-label">循环依次连入 → 学习退化随时间的演化规律（示意）</p>
                </div>
                <div v-else-if="pickD === 'attention'" class="viz-att">
                  <span v-for="(w, n) in attWeights" :key="n" class="a-cell" :style="{ opacity: 0.25 + w * 0.75, background: w > 0.12 ? '#f59e0b' : '#4da8ff' }" :title="`Cycle ${n * 6 + 1} · weight ${w.toFixed(2)}`"></span>
                  <p class="viz-label num">Attention 权重热力条：自动关注更重要的历史循环（示意）</p>
                </div>
                <div v-else-if="pickD === 'multi'" class="viz-multi">
                  <svg viewBox="0 0 300 90">
                    <path d="M0,70 C60,66 120,58 180,44 240,30 300,18" fill="none" stroke="#4da8ff" stroke-width="2" stroke-dasharray="4 3" />
                    <path d="M0,70 C50,72 100,64 150,60 200,58 250,52 300,50" fill="none" stroke="#22d3ee" stroke-width="2" />
                    <path d="M0,70 L300,64" fill="none" stroke="#8b98b0" stroke-width="1.5" />
                    <text x="6" y="14" fill="#4da8ff" font-size="10">长期趋势 Coarse</text>
                    <text x="6" y="28" fill="#22d3ee" font-size="10">中期变化 Medium</text>
                    <text x="6" y="42" fill="#8b98b0" font-size="10">局部波动 Fine</text>
                    <text x="170" y="80" fill="#e6edf7" font-size="10" font-family="monospace">r_future = r_c + r_m + r_f</text>
                  </svg>
                  <p class="viz-label">复杂退化率被拆成三个尺度，再叠加回一条 SOH 曲线（示意）</p>
                </div>
                <div v-else class="viz-bayes">
                  <svg viewBox="0 0 300 90">
                    <path d="M0,55 C80,52 160,40 300,18 L300,34 C160,54 80,60 0,60 Z" fill="rgba(77,168,255,0.18)" />
                    <path d="M0,58 C80,56 160,46 300,26" fill="none" stroke="#4da8ff" stroke-width="2" />
                    <text x="150" y="82" fill="#8b98b0" font-size="10" font-family="monospace">RUL estimate · interval output</text>
                  </svg>
                  <p class="viz-label">概率预测：不只给一条线，还给一个"可能范围"（示例）</p>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- 融合路线：动态权衡 -->
        <div v-else class="inner-zone">
          <p class="zone-title">假设实验：拖动融合权重 λ，看两种极端如何被调和</p>
          <div class="lambda-row">
            <span class="num">只看数据</span>
            <input type="range" min="0" max="100" v-model.number="lambda" />
            <span class="num">物理约束拉满</span>
          </div>
          <div class="balance" :class="{ 'l-low': lambda < 35, 'l-high': lambda > 65 }">
            <div class="scale-side">
              <p><b>数据驱动项</b></p>
              <div class="pan" :style="{ transform: `rotate(${(50 - lambda) * 0.06}deg)` }">
                <span class="dot-line"></span>
                <p class="verdict">{{ lambda < 35 ? '贴合历史，但可能违反物理规律' : lambda > 65 ? '被物理约束修正' : '与物理项平衡' }}</p>
              </div>
            </div>
            <div class="beam"></div>
            <div class="scale-side">
              <p><b>物理约束项 λ = {{ (lambda / 100).toFixed(2) }}</b></p>
              <div class="pan ok" :style="{ transform: `rotate(${(50 - lambda) * -0.06}deg)` }">
                <span class="dot-line ok"></span>
                <p class="verdict">{{ lambda > 65 ? '更符合规律，参数可解释' : lambda < 35 ? '约束弱，可解释性下降' : '与数据项平衡' }}</p>
              </div>
            </div>
          </div>
          <div class="loss-decomp card-panel">
            <p class="num">Total Loss = L_data + {{ (lambda / 100).toFixed(2) }}·L_physics + λ₂·L_bc</p>
            <p class="dim">PINN 思想：把方程写进损失函数，让规律与数据互相校正——这是我们实验室正在研究的方法。</p>
          </div>
        </div>
      </div>

      <!-- 右侧：动态权衡图 -->
      <div class="stage-right">
        <h4>方法权衡地图</h4>
        <div ref="chartTrade" class="trade-chart"></div>
        <p class="trade-note">没有"一定最好"的方法——数据条件、机理信息、计算成本和验证目标会共同决定方案。</p>
      </div>
    </div>

    <!-- 三条路线各自对固定问题的答案 -->
    <div class="answers">
      <div v-for="r in routes" :key="r.key" class="answer panel" :class="{ active: route === r.key }" @click="route = r.key">
        <span class="a-name" :style="{ color: r.color }">{{ r.name }}</span>
        <p class="a-rul num">{{ r.answer }}</p>
        <p class="a-note">{{ r.answerNote }}</p>
        <span class="a-fit">◎ 最适合：{{ r.fit }}</span>
      </div>
    </div>

    <ChapterFooter conclusion="物理模型从规律出发，数据模型从历史出发，融合模型尝试让规律与数据互相校正——同一道题，没有唯一最优解法。" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { initChart } from '../services/charts.js'
import ChapterFooter from '../components/ChapterFooter.vue'
import DataBadge from '../components/DataBadge.vue'

const route = ref('physics')
const pickP = ref('sei')
const pickD = ref('gru')
const lambda = ref(50)
const chartTrade = ref(null)
let chart = null, convTimer = null, gruTimer = null

const convPos = ref(0)
const gruLit = ref(1)
const attWeights = Array.from({ length: 14 }, (_, i) => +(0.02 + Math.abs(Math.sin(i * 1.7)) * (i === 12 ? 0.6 : 0.14)).toFixed(2))
const sparkBars = Array.from({ length: 40 }, (_, i) => 30 + 55 * Math.exp(-i / 26) + (i % 5) * 1.6)

const routes = [
  {
    key: 'physics', name: '路线 A · 物理模型', color: '#a78bfa',
    brief: '从电化学方程出发，把电池内部"算"出来',
    input: '电流 / 温度 / SOC 工况', inner: '电化学方程组（扩散、反应、产热、SEI、析锂、应力）', output: '内部状态 → 容量与寿命',
    answer: 'RUL 由参数辨识后求解', answerNote: '把前 80 次记录代入经过校准的机理方程，才能向外积分求解；本页不虚构具体数值。',
    fit: '新材料研究、机理分析'
  },
  {
    key: 'data', name: '路线 B · 数据模型', color: '#4da8ff',
    brief: '让 AI 从历史循环数据里学规律',
    input: '历史电压 / 电流 / 温度 / 容量', inner: '特征提取 + 序列模型（按需组合）', output: '未来 SOH / RUL（可含区间）',
    answer: 'RUL 由训练模型给出', answerNote: '需要先用独立训练集训练并验证序列模型，再对前 80 次记录推断；本页只展示流程。',
    fit: '有大量同工况历史数据的场景'
  },
  {
    key: 'fusion', name: '路线 C · 物理—数据融合', color: '#34d399',
    brief: 'PINN：把方程写进损失函数，让两者互相约束',
    input: '真实数据 + 物理规律（方程）', inner: '联合约束学习（数据误差 + 方程残差）', output: '可解释状态 + SOH / RUL',
    answer: 'RUL 由联合训练给出', answerNote: '数据项贴合历史、物理项约束趋势；完成联合训练与独立测试后才能报告数值。',
    fit: '数据有限但机理清楚的难题（我们的方向）'
  }
]
const cur = computed(() => routes.find((r) => r.key === route.value))

const physicsModules = [
  { key: 'diff', name: '离子扩散', eq: '∂c/∂t = D·∇²c', desc: '锂离子在固相颗粒内部的浓度场随时间演化。', impact: '决定高倍率下能"吞吐"多少锂' },
  { key: 'sei', name: 'SEI 生长', eq: 'dL/dt ∝ 1/L', desc: '负极表面膜持续生长，消耗可循环锂。', impact: '容量缓慢下降（LLI）' },
  { key: 'plate', name: '析锂', eq: 'U_anode + φ < 0 时发生', desc: '电位越过临界值时锂金属沉积。', impact: '容量损失 + 安全风险' },
  { key: 'stress', name: '颗粒应力/LAM', eq: 'dε/dt = −k(σ/σc)^m', desc: '嵌锂应力累积导致颗粒开裂失活。', impact: '内阻上升、活性材料损失' }
]
const dataModules = [
  { key: 'cnn', name: 'CNN', desc: '学习单次充电电压曲线中的局部形状和拐点。' },
  { key: 'gru', name: 'GRU / LSTM', desc: '把多个循环连成序列，学习退化随时间的演化。' },
  { key: 'attention', name: 'Attention', desc: '自动判断哪些历史循环对预测更重要，权重可视化。' },
  { key: 'multi', name: '多尺度模块', desc: '同时观察长期趋势、中期变化和局部波动，把复杂退化率拆成三层再叠加。' },
  { key: 'bayes', name: '概率预测', desc: '输出结果范围而不是一条绝对曲线，诚实地表达不确定性。' }
]
const curP = computed(() => physicsModules.find((m) => m.key === pickP.value))
const curD = computed(() => dataModules.find((m) => m.key === pickD.value))

// 权衡地图：数据需求(x) vs 可解释性(y)
function drawTrade() {
  if (!chart) return
  const pts = { physics: [45, 88], data: [86, 30], fusion: [62, 66] }
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 44, right: 20, top: 30, bottom: 40 },
    animationDuration: 700,
    xAxis: { type: 'value', min: 0, max: 100, name: '数据需求 →', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#8b98b0', fontSize: 11 }, axisLabel: { color: '#5b6680', fontSize: 10 }, splitLine: { show: false }, axisLine: { lineStyle: { color: 'rgba(77,168,255,0.25)' } } },
    yAxis: { type: 'value', min: 0, max: 100, name: '可解释性 →', nameTextStyle: { color: '#8b98b0', fontSize: 11 }, axisLabel: { color: '#5b6680', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(77,168,255,0.06)' } } },
    series: routes.map((r) => ({
      name: r.name, type: 'scatter',
      data: [[pts[r.key][0], pts[r.key][1]]],
      symbolSize: route.value === r.key ? 26 : 16,
      itemStyle: { color: r.color, opacity: route.value === r.key ? 1 : 0.45, shadowBlur: route.value === r.key ? 16 : 0, shadowColor: r.color },
      label: { show: true, position: 'right', color: route.value === r.key ? r.color : '#5b6680', fontSize: 11, formatter: r.name.replace('路线 ', '').replace(' · ', ' ') },
      z: route.value === r.key ? 5 : 2
    }))
  }, { notMerge: true })
}

onMounted(async () => {
  await nextTick()
  chart = initChart(chartTrade.value)
  drawTrade()
  convTimer = setInterval(() => { convPos.value = (convPos.value + 4) % 88 }, 120)
  gruTimer = setInterval(() => { gruLit.value = gruLit.value >= 14 ? 1 : gruLit.value + 1 }, 280)
  window.addEventListener('resize', onResize)
})
function onResize() { chart?.resize() }
watch(route, () => nextTick(drawTrade))
onBeforeUnmount(() => {
  chart?.dispose()
  clearInterval(convTimer); clearInterval(gruTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped lang="scss">
.prediction { display: flex; flex-direction: column; gap: 20px; }
.head { position: relative;
  .corner { position: absolute; right: 0; top: 8px; display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-2); } }
// 固定问题卡
.quiz { display: grid; grid-template-columns: 1.4fr 1fr; gap: 22px; padding: 20px 24px; align-items: center; border-left: 3px solid var(--amber);
  .q-tag { font-size: 11px; color: var(--amber); letter-spacing: 0.18em; }
  .q-text { font-size: 17px; color: var(--text-1); line-height: 1.7; margin-top: 8px;
    b { color: var(--cyan); } }
  .q-input { padding: 12px 16px;
    i { font-style: normal; font-size: 11px; color: var(--blue); letter-spacing: 0.16em; }
    .spark { position: relative; display: flex; align-items: flex-end; gap: 2px; height: 46px; margin-top: 8px;
      .s-bar { flex: 1; background: linear-gradient(180deg, var(--blue), rgba(77,168,255,0.25)); border-radius: 2px 2px 0 0; opacity: 0.7; }
      .q-cut { position: absolute; top: -4px; bottom: 0; left: 62%; width: 2px; background: var(--amber); box-shadow: 0 0 10px rgba(245,158,11,0.6); } }
    .q-note { font-size: 11px; color: var(--text-3); margin-top: 6px; } }
}
// 路线 tab
.route-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  .tab { display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: rgba(20,27,46,0.55); border: 1px solid var(--hairline); border-radius: 14px; cursor: pointer; text-align: left; transition: all 0.25s;
    .t-icon { width: 34px; height: 34px; flex-shrink: 0; color: var(--text-3); transition: color 0.25s; }
    .t-name { font-size: 15px; color: var(--text-1); display: block; }
    .t-brief { font-size: 12px; color: var(--text-3); display: block; margin-top: 3px; line-height: 1.5; }
    &:hover { border-color: var(--hairline-strong); }
    &.active { border-color: rgba(77,168,255,0.55); background: rgba(30,42,70,0.65); box-shadow: 0 0 24px rgba(77,168,255,0.12);
      .t-icon { color: var(--cyan); } } }
}
// 舞台
.stage { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; padding: 22px 24px;
  h4 { font-size: 15px; color: var(--blue); margin-bottom: 12px; } }
.io-flow { display: flex; align-items: stretch; gap: 10px; flex-wrap: wrap;
  .io { flex: 1; min-width: 140px; padding: 11px 14px;
    i { font-style: normal; display: block; font-size: 11px; color: var(--blue); letter-spacing: 0.2em; margin-bottom: 4px; }
    b { font-size: 12.5px; font-weight: 500; line-height: 1.5; } }
  .io-arrow { align-self: center; color: var(--blue); font-size: 18px; } }
.card-panel { background: rgba(20,27,46,0.6); border: 1px solid var(--hairline); border-radius: 10px; }
.inner-zone { margin-top: 16px;
  .zone-title { font-size: 13px; color: var(--text-1); margin-bottom: 9px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; } }
.module-detail { padding: 15px 18px;
  b { color: var(--cyan); }
  p { font-size: 13px; color: var(--text-2); margin-top: 6px; line-height: 1.75; }
  .eq { background: rgba(34,211,238,0.07); padding: 7px 12px; border-radius: 7px; color: var(--cyan); display: inline-block; }
  .dim { color: var(--text-3); } }
.note { margin-top: 12px; font-size: 12.5px; color: var(--text-2); line-height: 1.8; border-left: 2px solid var(--hairline-strong); padding-left: 12px; }
.mini-viz { margin-top: 12px; }
.viz-label { font-size: 11.5px; color: var(--text-3); margin-top: 8px; }
.viz-cnn { .wave { position: relative; display: flex; align-items: flex-end; gap: 2px; height: 54px; padding: 0 6px;
    .w-bar { flex: 1; background: linear-gradient(180deg, var(--blue), #1d4ed8); border-radius: 2px 2px 0 0; opacity: 0.75; }
    .conv-win { position: absolute; top: 0; bottom: 0; width: 12%; border: 2px solid var(--amber); border-radius: 6px; box-shadow: 0 0 14px rgba(245,158,11,0.4); transition: left 0.12s linear; background: rgba(245,158,11,0.08); } } }
.viz-gru { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; height: 54px; align-content: center;
  .g-dot { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid rgba(77,168,255,0.4); display: grid; place-items: center; font-size: 10.5px; color: var(--text-3); font-family: var(--mono); transition: all 0.25s;
    &.lit { border-color: var(--cyan); color: #dffaff; background: rgba(34,211,238,0.15); box-shadow: 0 0 12px rgba(34,211,238,0.45); } } }
.viz-att { display: flex; gap: 3px; height: 54px; align-items: stretch; padding: 6px;
  .a-cell { flex: 1; border-radius: 4px; transition: opacity 0.2s; } }
.viz-multi svg, .viz-bayes svg { width: 100%; height: auto; background: rgba(13,18,32,0.5); border-radius: 8px; }
// λ 滑块
.lambda-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 12px; color: var(--text-2);
  input[type='range'] { flex: 1; accent-color: var(--green); } }
.balance { display: flex; align-items: flex-end; gap: 14px;
  .scale-side { flex: 1; text-align: center; p { font-size: 13px; margin-bottom: 8px; } }
  .beam { width: 3px; height: 74px; background: linear-gradient(180deg, var(--hairline-strong), transparent); border-radius: 2px; }
  .pan { padding: 12px; border-radius: 10px; border: 1px solid var(--hairline); transition: transform 0.3s ease;
    &.ok { border-color: rgba(52,211,153,0.4); }
    .verdict { font-size: 12px; color: var(--text-2); &.good { color: var(--green); } } } }
.loss-decomp { padding: 13px 17px; p { font-size: 12.5px; color: var(--text-2); } .num { color: var(--cyan); } .dim { color: var(--text-3); } }
.stage-right { border-left: 1px solid var(--hairline); padding-left: 24px; display: flex; flex-direction: column;
  .trade-chart { flex: 1; min-height: 250px; }
  .trade-note { font-size: 12px; color: var(--text-2); line-height: 1.8; margin-top: 8px; } }
// 答案行
.answers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  .answer { padding: 16px 18px; cursor: pointer; transition: all 0.25s; opacity: 0.72;
    &.active { opacity: 1; border-color: var(--hairline-strong); box-shadow: 0 0 22px rgba(77,168,255,0.1); }
    .a-name { font-size: 12.5px; letter-spacing: 0.05em; }
    .a-rul { font-size: 24px; color: var(--cyan); margin-top: 8px;
      i { font-style: normal; font-size: 11.5px; color: var(--text-3); } }
    .a-note { font-size: 12px; color: var(--text-2); line-height: 1.7; margin-top: 6px; }
    .a-fit { font-size: 11.5px; color: var(--text-3); display: block; margin-top: 8px; } } }
@media (max-width: 900px) {
  .quiz, .stage, .answers { grid-template-columns: 1fr; }
  .route-tabs { grid-template-columns: 1fr; }
  .stage-right { border-left: none; padding-left: 0; }
}
</style>
