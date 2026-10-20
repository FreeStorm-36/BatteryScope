<template>
  <section class="manual-lab">
    <form class="manual-config panel" @submit.prevent="calculate">
      <p class="chapter-eyebrow">YOUR BATTERY · 你的电池档案</p>
      <h3>从现在的状态出发</h3>
      <p class="config-intro">填入两次容量测量，让退化趋势有据可循。</p>
      <div class="config-fields">
        <label v-for="field in fields" :key="field.key">
          <span>{{ field.label }} <i>{{ field.unit }}</i></span>
          <input :id="`battery-${field.key}`" v-model="config[field.key]" type="number" :min="field.min" :max="field.max" :step="field.step || 1" required @input="invalidate" />
        </label>
      </div>
      <p class="config-help">SOH = 当前容量 ÷ 初始容量。历史容量请与当前容量采用相同测量条件。</p>
      <div class="config-actions"><button type="submit" class="btn-primary">预测剩余寿命 ↗</button><button type="button" class="btn-ghost" @click="reset">恢复示例</button></div>
      <p v-if="error" class="manual-error" role="alert">{{ error }}</p>
    </form>
    <div class="manual-output panel" aria-live="polite">
      <div class="battery-orbit" aria-hidden="true"><div class="battery-core"><span :style="{height: previewSoh + '%'}"></span><b>{{ previewSoh }}<small>%</small></b></div></div>
      <template v-if="!result"><p class="output-eyebrow">{{ dirty ? '参数已更新，等待重新计算' : 'READY TO EXPLORE' }}</p><h3>每一次循环，都留下线索</h3><p class="output-note">配置左侧参数，看看距离寿命阈值还有多少次循环。</p></template>
      <template v-else>
        <p class="output-eyebrow">{{ result.reached ? '已达到设定阈值' : '按当前趋势估算' }}</p>
        <div class="life-number num">{{ result.rul.toLocaleString() }}<small>次循环</small></div>
        <div class="manual-stats"><span>当前 SOH<b>{{ (result.soh * 100).toFixed(1) }}%</b></span><span>预计到达阈值<b>第 {{ result.eol.toLocaleString() }} 次</b></span></div>
        <svg v-if="!result.reached" class="manual-curve" viewBox="0 0 480 180" role="img" aria-label="根据两次容量测量外推的健康度趋势">
          <defs><linearGradient id="manualFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#22d3ee" stop-opacity=".3"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>
          <path :d="areaPath" fill="url(#manualFill)" />
          <line x1="35" x2="455" :y1="y(result.threshold / 100)" :y2="y(result.threshold / 100)" stroke="#b7a1ff" stroke-dasharray="5 5" />
          <path :d="curvePath" stroke="#22d3ee" stroke-width="3" fill="none" />
          <text x="35" y="174" fill="#b2c4db" font-size="13">现在 · {{ result.cycles }} 次</text><text x="455" y="174" fill="#b2c4db" font-size="13" text-anchor="end">未来循环 →</text>
          <text x="455" :y="y(result.threshold / 100) - 8" fill="#c6b5ff" font-size="13" text-anchor="end">{{ result.threshold }}% 阈值</text>
        </svg>
        <p class="output-note">两点容量的指数趋势外推；假设未来工况不变，不含温度、倍率或日历老化修正。</p>
        <details class="manual-details"><summary>查看计算依据</summary><p>Q(n) = Q当前 × exp(k × Δn)，k = ln(Q当前 / Q历史) ÷ 两次测量的循环差。结果仅用于趋势探索，不能替代完整历史数据的验证。</p></details>
      </template>
    </div>
  </section>
</template>
<script setup>
import { reactive, ref, computed } from 'vue'
import { estimateManualLife } from '../services/manualPredictor.js'
const defaults = { cycles: 80, previousCycles: 40, nominalCapacity: 2000, currentCapacity: 1686, previousCapacity: 1850, threshold: 80 }
const config = reactive({...defaults})
const result = ref(null), error = ref(''), dirty = ref(false)
const fields = [
 {key:'cycles',label:'已使用循环',unit:'次',min:1,max:100000},
 {key:'nominalCapacity',label:'初始容量',unit:'mAh',min:1,max:1000000},
 {key:'currentCapacity',label:'当前实测容量',unit:'mAh',min:1,max:1000000},
 {key:'previousCycles',label:'历史测量时的循环',unit:'次',min:0,max:99999},
 {key:'previousCapacity',label:'历史实测容量',unit:'mAh',min:1,max:1000000},
 {key:'threshold',label:'寿命阈值 SOH',unit:'%',min:60,max:95,step:1}
]
const previewSoh = computed(() => {const value = Number(config.currentCapacity) / Number(config.nominalCapacity) * 100;return Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0,value))) : 0})
function invalidate() { result.value = null; error.value = ''; dirty.value = true }
function calculate() {try {result.value = estimateManualLife(config);error.value = '';dirty.value = false} catch(e) {result.value = null;error.value = e.message}}
function reset() {Object.assign(config,defaults);result.value = null;error.value = '';dirty.value = false}
function y(soh) {const low = Math.min(result.value.threshold / 100 - .04, result.value.soh - .08);return 145 - (soh-low) / Math.max(.08,result.value.soh-low) * 115}
const curvePath = computed(() => !result.value || result.value.reached ? '' : result.value.curve.map((p,i) => `${i ? 'L':'M'}${35+i*7},${y(p.soh).toFixed(2)}`).join(' '))
const areaPath = computed(() => curvePath.value ? curvePath.value + ' L455,150 L35,150 Z' : '')
</script>
<style scoped lang="scss">
.manual-lab { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch; }
.manual-config,.manual-output { padding: 30px; } h3 { font-size: 25px; margin: 12px 0; letter-spacing: -.02em; }
.config-intro,.config-help,.output-note { color: var(--text-2); font-size: 15px; line-height: 1.8; }
.config-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 18px; margin: 28px 0 22px; }
.config-fields label { min-width: 0; } .config-fields span { display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 9px; gap: 6px; } .config-fields i { font-style: normal; color: var(--text-3); font-size: 14px; }
.config-fields input { width: 100%; border-radius: 12px; border: 1px solid #49638e88; background: #0b1222; color: #d9f6ff; padding: 12px 14px; font: 22px var(--mono); transition: border-color .25s,box-shadow .25s; }
.config-fields input:focus { border-color: var(--cyan); box-shadow: 0 0 20px #22d3ee18; outline: none; }
.config-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; } .manual-error { margin-top: 18px; color: #ffbcbc; }
.manual-output { text-align: center; background: radial-gradient(ellipse at 50% 15%,#7257e126,transparent 60%),#101829; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.battery-orbit { display: grid; place-items: center; width: 180px; height: 160px; margin: 0 auto 24px; position: relative; }
.battery-orbit::before { content: ''; position: absolute; inset: 30px -18px; border: 1px solid #a28bfa88; border-radius: 50%; transform: rotate(-30deg); box-shadow: 0 0 25px #7257e12a; }
.battery-core { position: relative; width: 76px; height: 122px; border: 2px solid #93c9ff; border-radius: 16px; background: #10182c; overflow: hidden; box-shadow: 0 0 36px #22d3ee30; }
.battery-core span { position: absolute; inset: auto 0 0; background: linear-gradient(0deg,#5474e6,#22d3ee); opacity: .65; transition: height .5s; }
.battery-core b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font: 28px var(--mono); } .battery-core small { font-size: 15px; }
.output-eyebrow { color: #8fe1f6; letter-spacing: .1em; font-size: 14px; }
.life-number { font-size: clamp(46px,5vw,70px); line-height: 1.3; color: #d4f9ff; } .life-number small { font: 16px var(--sans); margin-left: 10px; color: var(--text-2); }
.manual-stats { display: flex; gap: 35px; margin: 16px 0 8px; font-size: 15px; color: var(--text-2); } .manual-stats b { display: block; color: var(--text-1); font-size: 22px; margin-top: 5px; }
.manual-curve { width: 100%; max-width: 480px; margin: 12px 0; } .manual-details { margin-top: 14px; color: var(--text-2); font-size: 14px; text-align: left; } summary { cursor: pointer; color: var(--blue); } .manual-details p { margin-top: 10px; }
@media(max-width:1080px) {.manual-lab { grid-template-columns: 1fr; }}
@media(max-width:480px) { .manual-config,.manual-output { padding: 22px 18px; }.config-fields { grid-template-columns: 1fr; }.manual-stats { gap: 20px; } }
</style>
