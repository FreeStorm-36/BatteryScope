<template>
  <div class="game doc">
    <div class="g-head">
      <div class="g-title">
        <span class="g-badge">游戏 01</span>
        <b>电芯小医生</b>
        <i>看症状 · 找主凶机制</i>
      </div>
      <span class="g-stat num" v-if="!done">第 {{ idx + 1 }} / {{ rounds.length }} 例 · 已确诊 {{ score }}</span>
      <span class="g-stat num" v-else>诊断完成 {{ score }} / {{ rounds.length }}</span>
    </div>

    <template v-if="!done">
      <div class="g-body">
        <div class="g-patient panel">
          <div class="gp-screen">
            <!-- 症状动画：六种机制各有一套形貌，与第 04 章 3D 聚焦视图同一套视觉语言 -->
            <svg v-if="cur.visual === 'sei'" viewBox="0 0 180 130" class="gv" aria-label="病例症状示意">
              <rect class="gv-bg" x="4" y="4" width="172" height="122" rx="12" />
              <rect x="26" y="36" width="20" height="60" rx="3" fill="#6d5fc7" opacity=".85" />
              <rect x="50" y="36" width="12" height="60" rx="2" fill="#b9c4d6" opacity=".8" />
              <rect x="66" y="36" width="22" height="60" rx="3" fill="#5f7a99" />
              <rect class="gv-sei" x="88" y="36" width="9" height="60" rx="3" fill="#b45309" opacity=".92" />
              <rect x="98" y="18" width="64" height="8" rx="4" fill="rgba(77,168,255,.15)" />
              <rect class="gv-inv" x="98" y="18" width="53" height="8" rx="4" fill="#34d399" />
              <!-- 中性结构标签（不剧透答案）：库存标签紧贴指示条，含义自明 -->
              <text x="94" y="24.5" class="gv-tag dim" text-anchor="end">可循环锂库存</text>
              <text x="26" y="112" class="gv-tag dim">正极</text>
              <text x="84" y="112" class="gv-tag dim">负极</text>
              <!-- 答题后出现：机制标注 + 引导线 + 形貌脉冲 -->
              <g class="gv-reveal" :class="{ on: answered }">
                <ellipse class="gv-flash" cx="100" cy="66" rx="12" ry="38" />
                <line x1="95" y1="62" x2="112" y2="56" />
                <text x="114" y="54" class="gv-tag" fill="#f59e0b">SEI 膜增厚</text>
              </g>
            </svg>

            <svg v-else-if="cur.visual === 'plating'" viewBox="0 0 180 130" class="gv" aria-label="病例症状示意">
              <rect class="gv-bg" x="4" y="4" width="172" height="122" rx="12" />
              <rect x="26" y="36" width="20" height="60" rx="3" fill="#6d5fc7" opacity=".85" />
              <rect x="50" y="36" width="12" height="60" rx="2" fill="#b9c4d6" opacity=".8" />
              <rect x="66" y="36" width="22" height="60" rx="3" fill="#5f7a99" />
              <g class="gv-needles">
                <polygon class="gv-needle d1" points="90,96 94,58 98,96" fill="#e2e8f0" />
                <polygon class="gv-needle d2" points="100,96 104,44 108,96" fill="#e2e8f0" />
                <polygon class="gv-needle d3" points="110,96 113,70 116,96" fill="#e2e8f0" />
              </g>
              <!-- 中性条件标签（只给工况，不给机制） -->
              <text x="26" y="24" class="gv-tag" fill="#f59e0b">2C / −10 ℃</text>
              <g class="gv-reveal" :class="{ on: answered }">
                <ellipse class="gv-flash" cx="103" cy="76" rx="16" ry="24" />
                <line x1="106" y1="50" x2="116" y2="42" />
                <text x="118" y="40" class="gv-tag" fill="#e2e8f0">枝晶刺向隔膜</text>
                <text x="90" y="114" class="gv-tag dim" text-anchor="middle">负极表面析出银白色金属锂</text>
              </g>
            </svg>

            <svg v-else-if="cur.visual === 'crack'" viewBox="0 0 180 130" class="gv" aria-label="病例症状示意">
              <rect class="gv-bg" x="4" y="4" width="172" height="122" rx="12" />
              <polygon class="gv-grain" points="90,24 130,47 130,89 90,112 50,89 50,47" fill="#5f7a99" />
              <path class="gv-crack d1" d="M60 42 L74 62 L64 70 L82 94" stroke="#140b03" stroke-width="3.6" fill="none" stroke-linecap="round" />
              <path class="gv-crack d2" d="M114 50 L104 66 L116 80" stroke="#140b03" stroke-width="3" fill="none" stroke-linecap="round" />
              <g class="gv-reveal" :class="{ on: answered }">
                <ellipse class="gv-flash" cx="90" cy="68" rx="44" ry="48" />
                <text x="90" y="124" class="gv-tag dim" text-anchor="middle">反复膨胀收缩 → 颗粒疲劳开裂</text>
              </g>
            </svg>

            <svg v-else-if="cur.visual === 'lam'" viewBox="0 0 180 130" class="gv" aria-label="病例症状示意">
              <rect class="gv-bg" x="4" y="4" width="172" height="122" rx="12" />
              <g class="gv-parts">
                <circle cx="34" cy="64" r="13" fill="#5f7a99" />
                <circle class="gv-dead d1" cx="62" cy="64" r="13" fill="#93a1b5" />
                <circle cx="90" cy="64" r="13" fill="#5f7a99" />
                <circle class="gv-dead d2" cx="118" cy="64" r="13" fill="#93a1b5" />
                <circle cx="146" cy="64" r="13" fill="#5f7a99" />
              </g>
              <line x1="21" y1="86" x2="159" y2="86" stroke="rgba(120,180,255,.3)" stroke-width="1.4" />
              <g class="gv-reveal" :class="{ on: answered }">
                <ellipse class="gv-flash" cx="62" cy="64" rx="15" ry="15" />
                <ellipse class="gv-flash" cx="118" cy="64" rx="15" ry="15" />
                <text x="90" y="112" class="gv-tag dim" text-anchor="middle">变灰 = 失去电子连接 · 不再充放电</text>
              </g>
            </svg>

            <svg v-else-if="cur.visual === 'electrolyte'" viewBox="0 0 180 130" class="gv" aria-label="病例症状示意">
              <rect class="gv-bg" x="4" y="4" width="172" height="122" rx="12" />
              <rect class="gv-box" x="46" y="22" width="88" height="86" rx="8" fill="none" stroke="#22d3ee" stroke-width="1.2" stroke-dasharray="5 4" opacity=".55" />
              <rect class="gv-liquid" x="48" y="34" width="84" height="72" rx="6" fill="#2563eb" opacity=".6" />
              <g class="gv-reveal" :class="{ on: answered }">
                <line class="gv-flash" x1="46" y1="34" x2="134" y2="34" style="stroke:#22d3ee" />
                <text x="90" y="124" class="gv-tag dim" text-anchor="middle">液面低于虚线：电解液被副反应消耗</text>
              </g>
            </svg>

            <svg v-else viewBox="0 0 180 130" class="gv" aria-label="病例症状示意">
              <rect class="gv-bg" x="4" y="4" width="172" height="122" rx="12" />
              <rect class="gv-cell" x="54" y="32" width="72" height="68" rx="13" fill="#2a3448" stroke="rgba(120,180,255,.4)" />
              <g class="gv-bubbles">
                <circle class="b1" cx="72" cy="82" r="5" fill="#9fd8ff" opacity=".7" />
                <circle class="b2" cx="94" cy="88" r="4" fill="#9fd8ff" opacity=".7" />
                <circle class="b3" cx="108" cy="78" r="5.5" fill="#9fd8ff" opacity=".7" />
              </g>
              <path class="gv-heat" d="M38 62 q7 -9 0 -18 q-7 -9 0 -18" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round" />
              <path class="gv-heat d2" d="M142 62 q7 -9 0 -18 q-7 -9 0 -18" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round" />
              <g class="gv-reveal" :class="{ on: answered }">
                <ellipse class="gv-flash" cx="90" cy="66" rx="42" ry="40" />
                <text x="90" y="124" class="gv-tag dim" text-anchor="middle">产气积聚 → 内压升高 → 外壳鼓胀</text>
              </g>
            </svg>
          </div>
          <p class="gp-case"><i>症状</i>{{ cur.case }}</p>
        </div>

        <div class="g-opts">
          <p class="gp-q">你认为主凶是哪种老化机制？</p>
          <button
            v-for="(o, oi) in shownOptions"
            :key="o"
            type="button"
            class="g-opt"
            :class="{ right: answered && o === correctShort, wrong: answered && chosen === o && o !== correctShort }"
            :disabled="answered"
            @click="choose(o)"
          >
            <span class="g-mark num">{{ ['A', 'B', 'C', 'D'][oi] }}</span>{{ o }}
          </button>
          <transition name="fade-slide" mode="out-in">
            <p v-if="answered" class="g-fb" :class="right ? 'ok' : 'no'" :key="right ? 'ok' : 'no'">
              <b>{{ right ? '诊断正确' : '诊断有误' }}</b>
              {{ right ? cur.note : `主凶是「${correctShort}」。${cur.note}` }}
            </p>
          </transition>
          <button v-if="answered" type="button" class="btn-primary g-next" @click="next">
            {{ idx + 1 >= rounds.length ? '看诊断报告 →' : '下一例 →' }}
          </button>
        </div>
      </div>
    </template>

    <div v-else class="g-over panel">
      <div class="go-score num">{{ score }} / {{ rounds.length }}</div>
      <b>{{ doneLine.title }}</b>
      <p>{{ doneLine.line }}</p>
      <button type="button" class="btn-primary" @click="restart">再诊一轮</button>
    </div>

    <p class="g-caliber">症状为教学设定的组合场景；机制描述取自第 04 章机制库；判定完全确定，无随机成分。</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { doctorRounds } from '../../data/games.js'
import { notifyAssistant } from '../../services/assistantBus.js'
import { assistantCorpus } from '../../data/assistantCorpus.js'

const rounds = doctorRounds
const idx = ref(0)
const score = ref(0)
const chosen = ref(null)
const done = ref(false)

const cur = computed(() => rounds[idx.value])
const correctShort = computed(() => rounds[idx.value].options[0])
// 正确项按例次轮换位置（确定性，不用随机）：第 1 例在 A、第 2 例在 B……避免"无脑选 A"
const shownOptions = computed(() => {
  const arr = [...cur.value.options]
  const [c] = arr.splice(0, 1)
  arr.splice(idx.value % 4, 0, c)
  return arr
})
const answered = computed(() => chosen.value !== null)
const right = computed(() => chosen.value === correctShort.value)

// 答错 → 小锂按对应机制讲解（知识库条目与机制一一对应）
const AID = { sei: 'sei', plating: 'plating', crack: 'crack', lam: 'lam', gas: 'gas' }

function choose(o) {
  if (answered.value) return
  chosen.value = o
  if (o === correctShort.value) {
    score.value += 1
  } else {
    const entry = assistantCorpus.find((c) => c.id === AID[cur.value.answer])
    notifyAssistant({
      text: entry ? `主凶其实是「${correctShort.value}」。${entry.a}` : `主凶是「${correctShort.value}」。${cur.value.note}`,
      mood: 'concern',
      path: entry?.path || '/aging',
      ch: entry?.ch || '04 老化'
    })
  }
}

function next() {
  if (idx.value + 1 >= rounds.length) {
    done.value = true
    return
  }
  idx.value += 1
  chosen.value = null
}

function restart() {
  idx.value = 0
  score.value = 0
  chosen.value = null
  done.value = false
}

const doneLine = computed(() => {
  const s = score.value
  if (s === rounds.length) return { title: '全部确诊', line: '可以去第 04 章把每个机制的专属动画再对照看一遍，印象会更深。' }
  if (s >= 4) return { title: '资深住院医', line: '只差一两例——回看第 04 章六种机制的专属演示，补上缺口。' }
  if (s >= 2) return { title: '实习医生', line: '建议按第 04 章的机制按钮逐个点过去：每种机制的形貌其实差别很大。' }
  return { title: '旁观学员', line: '别急，先回第 04 章点一遍六个机制按钮，再回来复诊。' }
})
</script>

<style scoped lang="scss">
.game {
  padding: 18px 20px;
  .g-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
    .g-title { display: flex; align-items: baseline; gap: 10px;
      b { font-size: 15.5px; color: var(--text-1); }
      i { font-style: normal; font-size: 12px; color: var(--text-3); } }
    .g-stat { font-size: 12px; color: var(--cyan); } }
  .g-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 16px; align-items: start; }
  .g-caliber { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--hairline); font-size: 11px; color: var(--text-3); line-height: 1.7; }
}
.g-badge { padding: 2px 9px; border: 1px solid rgba(34, 211, 238, 0.4); border-radius: 999px; font-size: 11px; color: var(--cyan); }

.gp-screen {
  border: 1px solid var(--hairline); border-radius: var(--radius-sm);
  background: rgba(10, 14, 26, 0.6); overflow: hidden;
  .gv { display: block; width: 100%; height: auto; }
}
.gv-bg { fill: rgba(20, 27, 46, 0.5); stroke: var(--hairline); }
/* viewBox 180 宽渲染约 2 倍放大：9px ≈ 视觉 18px，8.5px ≈ 17px，保证长句完整不裁切 */
.gv-tag { font-size: 9px; font-weight: 600; letter-spacing: 0.2px; }
.gv-tag.dim { fill: var(--text-3); font-size: 8.5px; font-weight: 400; }

/* 答题前隐藏机制标注（防剧透）；选择后无论对错都播讲解动画：
   标注淡入上移 → 引导线描画 → 关键形貌绿色脉冲两次 */
.gv-reveal { opacity: 0; transform: translateY(5px); transition: opacity 0.55s ease 0.2s, transform 0.55s ease 0.2s; }
.gv-reveal.on { opacity: 1; transform: translateY(0); }
.gv-reveal line { stroke-dasharray: 30; stroke-dashoffset: 30; stroke-width: 1; transition: stroke-dashoffset 0.5s ease 0.55s; }
.gv-reveal.on line { stroke-dashoffset: 0; }
.gv-flash { opacity: 0; fill: none; stroke: rgba(52, 211, 153, 0.85); stroke-width: 1.4; }
.gv-reveal.on .gv-flash { animation: gv-flash 1.1s ease 0.4s 2; }
@keyframes gv-flash { 0%, 100% { opacity: 0; } 50% { opacity: 0.85; } }

/* SVG 的 CSS transform-origin 默认相对 viewBox 原点而非元素自身，
   不加 transform-box: fill-box 会导致 scaleX 元素"平移"甚至滑出画面。
   所有按自身缩放/位移的元素必须带上 fill-box。 */
.gv-sei, .gv-inv, .gv-needle, .gv-liquid, .gv-cell, .gv-dead { transform-box: fill-box; }

/* SEI：膜呼吸式增厚（原地向右长厚，不滑动）+ 锂库存同步变短 */
.gv-sei { transform-origin: left center; animation: gv-sei 2.8s ease-in-out infinite; }
@keyframes gv-sei { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(2); } }
.gv-inv { transform-origin: left center; animation: gv-inv 2.8s ease-in-out infinite; }
@keyframes gv-inv { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.78); } }

/* 析锂：三根针依次长出 */
.gv-needle { transform-origin: center bottom; animation: gv-grow 2.2s ease-in-out infinite; }
.gv-needle.d2 { animation-delay: 0.35s; }
.gv-needle.d3 { animation-delay: 0.7s; }
@keyframes gv-grow { 0%, 100% { transform: scaleY(0.25); } 55%, 80% { transform: scaleY(1); } }

/* 开裂：裂口逐段画出 */
.gv-crack { stroke-dasharray: 64; stroke-dashoffset: 64; animation: gv-draw 3.4s ease-in-out infinite; }
.gv-crack.d2 { animation-delay: 1.1s; }
@keyframes gv-draw { 0% { stroke-dashoffset: 64; } 45%, 100% { stroke-dashoffset: 0; } }

/* 失活：灰色颗粒脱离连接 */
.gv-dead { animation: gv-float-away 2.6s ease-in-out infinite; }
.gv-dead.d2 { animation-delay: 0.5s; }
@keyframes gv-float-away { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(-7px); opacity: 0.55; } }

/* 电解液：液面相对虚线参考框下降 */
.gv-liquid { transform-origin: center bottom; animation: gv-drop 3s ease-in-out infinite; }
@keyframes gv-drop { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.5); } }

/* 产气：壳体鼓胀脉冲 + 气泡上浮 + 热浪 */
.gv-cell { transform-origin: center; animation: gv-swell 2.4s ease-in-out infinite; }
@keyframes gv-swell { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
.gv-bubbles circle { animation: gv-rise 2.4s ease-in infinite; }
.gv-bubbles .b2 { animation-delay: 0.8s; }
.gv-bubbles .b3 { animation-delay: 1.5s; }
@keyframes gv-rise { 0% { transform: translateY(10px); opacity: 0; } 30% { opacity: 0.75; } 100% { transform: translateY(-30px); opacity: 0; } }
.gv-heat { animation: gv-heat 1.8s ease-in-out infinite; }
.gv-heat.d2 { animation-delay: 0.9s; }
@keyframes gv-heat { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.9; } }

/* 症状描述：加大加亮 + 琥珀底衬，读题是第一步 */
.gp-case { margin-top: 12px; padding: 11px 13px; border: 1px solid rgba(247, 168, 61, 0.3); border-radius: 8px; background: rgba(247, 168, 61, 0.07); font-size: 14.5px; color: var(--text-1); line-height: 1.8;
  i { font-style: normal; margin-right: 8px; padding: 1px 9px; border: 1px solid rgba(247, 168, 61, 0.45); border-radius: 999px; font-size: 12px; color: var(--amber); } }

.gp-q { font-size: 13px; color: var(--text-1); margin-bottom: 10px; }
.g-opt {
  display: flex; align-items: center; gap: 10px; text-align: left;
  width: 100%; min-height: 44px; margin-bottom: 8px; padding: 9px 13px;
  border: 1px solid var(--hairline); border-radius: 10px;
  background: rgba(19, 26, 43, 0.55); color: var(--text-2);
  font-size: 12.5px; cursor: pointer; transition: all 0.2s ease;
  .g-mark { flex: 0 0 auto; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; background: rgba(77, 168, 255, 0.12); color: var(--blue); font-size: 11px; }
  &:not(:disabled):hover { border-color: var(--hairline-strong); color: var(--text-1); background: rgba(77, 168, 255, 0.08); }
  &:disabled { cursor: default; }
  &.right { border-color: rgba(52, 211, 153, 0.55); background: rgba(52, 211, 153, 0.1); color: #d8fbe8;
    .g-mark { background: rgba(52, 211, 153, 0.22); color: #6ee7a0; } }
  &.wrong { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.09); color: #fbd5d5;
    .g-mark { background: rgba(239, 68, 68, 0.2); color: #fca5a5; } }
}
.g-fb { margin: 4px 0 12px; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 12.5px; line-height: 1.85;
  b { display: block; margin-bottom: 3px; font-size: 12.5px; }
  &.ok { border-left: 2px solid rgba(52, 211, 153, 0.55); background: rgba(52, 211, 153, 0.06); color: var(--text-2);
    b { color: #6ee7a0; } }
  &.no { border-left: 2px solid rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.05); color: var(--text-2);
    b { color: #fca5a5; } } }
.g-next { min-height: 44px; }

.g-over { text-align: center; padding: 26px 20px;
  .go-score { font-size: 34px; color: var(--cyan); }
  b { display: block; margin: 6px 0 8px; font-size: 15px; color: var(--text-1); }
  p { font-size: 12.5px; color: var(--text-2); line-height: 1.8; max-width: 46ch; margin: 0 auto 16px; }
  .btn-primary { min-height: 44px; } }

@media (max-width: 1080px) {
  .game .g-body { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .game { padding: 14px 16px; }
  .g-opt { font-size: 13px; }
  .gp-case { font-size: 13.5px; }
}

/* 动效可关闭 */
@media (prefers-reduced-motion: reduce) {
  .gv * { animation: none !important; }
  .gv-reveal { transition: none; }
  .gv-reveal line { transition: none; }
}
</style>
