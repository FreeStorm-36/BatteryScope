<template>
  <div :class="embedded ? 'embedded-library' : 'page-full learning'">
    <header v-if="!embedded" class="head">
      <p class="chapter-eyebrow">Chapter 08 · 学习地图与资料来源</p>
      <h2 class="chapter-title">探索之后，学以致用</h2>
      <p class="chapter-sub">选一张卡片，打开你的学习空间。</p>
      <span class="corner badge-line"><DataBadge type="model" text="教学设计与数据依据" />可对照、可核查</span>
    </header>

    <div v-if="!embedded" class="library-grid">
      <button v-for="(entry, i) in library" :key="entry.name" class="library-card panel" @click="openSection(i)">
        <span class="library-number num">0{{ i + 1 }} ↗</span><h3>{{ entry.name }}</h3><p>{{ entry.desc }}</p><b>打开探索 →</b>
      </button>
    </div>
    <Teleport to="body"><div v-if="libraryOpen" class="library-backdrop" @click.self="libraryOpen = false">
      <div ref="libraryPanel" class="library-dialog" role="dialog" aria-modal="true" :aria-label="library[activeSection].name" tabindex="-1">
        <div class="library-toolbar"><h2>{{ library[activeSection].name }}</h2><button class="btn-ghost" @click="libraryOpen = false" aria-label="关闭学习浮窗">关闭 ×</button></div>
        <nav class="library-tabs" aria-label="学习内容"><button v-for="(entry, i) in library" :key="i" class="btn-ghost" :class="{ selected: activeSection === i }" @click="activeSection = i">{{ entry.name }}</button></nav>
    <!-- ── 一、讲给谁 · 怎么用 ────────────────────────────── -->
    <section v-show="activeSection === 0" class="sec">
      <div class="sec-head">
        <span class="sec-num num">08.1</span>
        <h3>这门作品讲给谁</h3>
      </div>
      <div class="audience">
        <article class="aud-card primary panel">
          <span class="ac-tag">{{ audience.primary.label }}</span>
          <b>{{ audience.primary.target }}</b>
          <p class="ac-courses">{{ audience.primary.courses }}</p>
          <p class="ac-reason">{{ audience.primary.reason }}</p>
        </article>
        <div class="aud-side">
          <article v-for="(a, i) in audience.secondary" :key="i" class="aud-card card-panel">
            <span class="ac-tag">{{ a.label }}</span>
            <b>{{ a.target }}</b>
            <p>{{ a.note }}</p>
          </article>
        </div>
      </div>

      <div class="sec-head sub">
        <span class="sec-num num">08.2</span>
        <h3>三种使用场景</h3>
      </div>
      <div class="scenes">
        <article v-for="s in scenarios" :key="s.key" class="scene card-panel">
          <div class="sc-top">
            <b>{{ s.name }}</b>
            <i>{{ s.who }}</i>
          </div>
          <p class="sc-flow">{{ s.flow }}</p>
          <p class="sc-why">{{ s.why }}</p>
        </article>
      </div>
    </section>

    <!-- ── 二、知识图谱 ──────────────────────────────────── -->
    <section v-show="activeSection === 1" class="sec">
      <div class="sec-head">
        <span class="sec-num num">08.3</span>
        <h3>知识图谱：七章分别在讲什么</h3>
        <p class="sec-desc">认知层次参照修订版布卢姆分类（识记 → 理解 → 应用 → 分析 → 评价）。点任意一行可直接跳到对应章节。</p>
      </div>
      <div class="kmap">
        <div class="km-row km-head" aria-hidden="true">
          <span>章节</span><span>核心知识点</span><span>认知层次</span>
        </div>
        <router-link v-for="k in knowledgeMap" :key="k.n" :to="k.path" class="km-row">
          <span class="km-ch"><i class="num">{{ pad(k.n) }}</i><em>{{ k.title }}</em></span>
          <span class="km-points"><b v-for="p in k.points" :key="p">{{ p }}</b></span>
          <span class="km-level"><em v-for="l in k.level" :key="l">{{ l }}</em></span>
        </router-link>
      </div>
    </section>

    <!-- ── 三、学习目标 ──────────────────────────────────── -->
    <section v-show="activeSection === 2" class="sec">
      <div class="sec-head">
        <span class="sec-num num">08.4</span>
        <h3>学习目标：学完每一章，你应该能做到什么</h3>
        <p class="sec-desc">每条都写成可检验的行为（能够说出 / 解释 / 区分 / 判断），可直接用于课前导学与课后自查。</p>
      </div>
      <div class="goals">
        <article v-for="g in chapterGoals" :key="g.n" class="goal card-panel">
          <div class="gl-top">
            <span class="gl-num num">{{ pad(g.n) }}</span>
            <b>{{ g.title }}</b>
          </div>
          <ul>
            <li v-for="(t, i) in g.goals" :key="i">{{ t }}</li>
          </ul>
          <p class="gl-plain"><i>一句话理解</i>{{ g.plain }}</p>
        </article>
      </div>
    </section>

    <!-- ── 五、趣味互动 ──────────────────────────────────── -->
    <section v-show="activeSection === 3" class="sec">
      <div class="sec-head">
        <span class="sec-num num">08.5</span>
        <h3>趣味互动：两个小游戏，把知识点玩一遍</h3>
        <p class="sec-desc">游戏里的机制描述、工况解释都来自前七章讲过的东西。诊断失误或策略踩坑时，右下角的小锂会主动出来讲懂原理——也可以直接点它提问。</p>
      </div>
      <div class="games">
        <DoctorGame />
        <StrategyGame />
      </div>
    </section>

    <!-- ── 六、自测 ──────────────────────────────────────── -->
    <section v-show="activeSection === 4" class="sec">
      <div class="sec-head">
        <span class="sec-num num">08.6</span>
        <h3>自测：八道题覆盖前七章</h3>
        <p class="sec-desc">选完即出结果与解析，可以边做边学。答错时右下角的小锂会主动来讲懂这道题；全部答完后对照上面的学习目标，检查哪一章还需要回看。</p>
      </div>
      <div class="quizbox panel">
        <div class="qb-bar">
          <span class="qb-title">学习效果自测</span>
          <span class="qb-stat num">已答 {{ answeredCount }} / {{ quizQuestions.length }} · 答对 {{ correctCount }}</span>
          <button type="button" class="btn-ghost" :disabled="answeredCount === 0" @click="resetQuiz">
            <IconGlyph name="reset" :size="14" />重做
          </button>
        </div>
        <div class="qb-list">
          <article v-for="(q, qi) in quizQuestions" :key="qi" class="q-card" :class="{ locked: picked[qi] !== undefined }">
            <p class="q-text"><span class="q-idx num">Q{{ qi + 1 }}</span>{{ q.q }}</p>
            <div class="q-opts">
              <button
                v-for="(o, oi) in q.options"
                :key="oi"
                type="button"
                class="q-opt"
                :class="{
                  picked: picked[qi] === oi,
                  right: picked[qi] !== undefined && oi === q.answer,
                  wrong: picked[qi] === oi && oi !== q.answer
                }"
                :disabled="picked[qi] !== undefined"
                @click="pick(qi, oi)"
              >
                <span class="q-mark num">{{ ['A', 'B', 'C', 'D'][oi] }}</span>{{ o }}
              </button>
            </div>
            <p v-if="picked[qi] !== undefined" class="q-why"><i>解析</i>{{ q.why }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ── 五、资料来源（真实数据从哪来） ──────────────────── -->
    <section v-show="activeSection === 5" class="sec">
      <div class="sec-head">
        <span class="sec-num num">08.7</span>
        <h3>资料来源：真实数据从哪来</h3>
      </div>
      <div class="dataset panel">
        <div class="ds-head">
          <DataBadge type="real" text="公开学术数据集" />
          <b>{{ dataset.name }}</b>
        </div>
        <p class="ds-holder">{{ dataset.holder }} · 获取渠道：{{ dataset.channel }}</p>
        <div class="ds-proto">
          <div class="dp"><i>体系</i><span>{{ dataset.protocol.chemistry }}</span></div>
          <div class="dp"><i>额定容量</i><span>{{ dataset.protocol.ratedCapacity }}</span></div>
          <div class="dp"><i>充电制度</i><span>{{ dataset.protocol.charge }}</span></div>
          <div class="dp"><i>放电制度</i><span>{{ dataset.protocol.discharge }}</span></div>
          <div class="dp"><i>环境温度</i><span>{{ dataset.protocol.temperature }}</span></div>
        </div>
        <div class="ds-cells">
          <div v-for="c in dataset.cells" :key="c.id" class="dc card-panel">
            <b class="num">{{ c.id }}</b>
            <span class="dc-cut num">截止 {{ c.vCutoff }}</span>
            <i>{{ c.note }}</i>
          </div>
        </div>
        <p class="ds-note"><i>为什么是这四颗</i>{{ dataset.selection }}</p>
        <p class="ds-note"><i>寿命判据</i>{{ dataset.eolRef }}</p>
        <p class="ds-note"><i>使用授权</i>{{ dataset.license }}</p>
        <p class="ds-cite num">{{ citation }}</p>
      </div>
    </section>

      </div>
    </div></Teleport>

    <ChapterFooter v-if="!embedded" conclusion="带着问题探索，带着发现继续。" />

    <!-- 学习助手「小锂」：Teleport 到 body，fixed 定位不受页面布局影响 -->
    <RobotAssistant v-if="!embedded" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataBadge from '../components/DataBadge.vue'
import ChapterFooter from '../components/ChapterFooter.vue'
import IconGlyph from '../components/IconGlyph.vue'
import RobotAssistant from '../components/RobotAssistant.vue'
import DoctorGame from '../components/games/DoctorGame.vue'
import StrategyGame from '../components/games/StrategyGame.vue'
import { useDialog } from '../composables/useDialog.js'
import { assistantCorpus } from '../data/assistantCorpus.js'
import { notifyAssistant } from '../services/assistantBus.js'
import {
  audience, knowledgeMap, chapterGoals, scenarios,
  quizQuestions, dataset, citation
} from '../data/learning.js'

defineProps({ embedded: Boolean })
defineExpose({ openSection })
const libraryRoute = useRoute()
watch(() => libraryRoute.path, () => { libraryOpen.value = false })
const libraryOpen = ref(false)
const activeSection = ref(0)
const libraryPanel = ref(null)
useDialog(libraryOpen, libraryPanel)
const library = [
 { name: '使用指南', desc: '找到适合你的探索路线' },
 { name: '知识地图', desc: '串起电池一生的关键节点' },
 { name: '学习目标', desc: '每一章，都有新的收获' },
 { name: '互动挑战', desc: '当一次电池医生，试一套使用策略' },
 { name: '知识自测', desc: '八道小题，检验你的发现' },
 { name: '数据与来源', desc: '追溯每一条真实曲线' }
]
function openSection(i) { activeSection.value = i; libraryOpen.value = true }
const pad = (n) => String(n).padStart(2, '0')

// 自测：逐题锁定，选完立即给解析（边做边学，而不是最后统一判分）
const picked = ref({})
const answeredCount = computed(() => Object.keys(picked.value).length)
const correctCount = computed(
  () => Object.entries(picked.value).filter(([qi, oi]) => quizQuestions[qi].answer === oi).length
)
function pick(qi, oi) {
  if (picked.value[qi] !== undefined) return
  picked.value = { ...picked.value, [qi]: oi }
  // 答错 → 小锂主动出来讲这道题背后的知识点（知识库条目与题目一一对应）
  if (oi !== quizQuestions[qi].answer) {
    const entry = assistantCorpus.find((c) => c.id === quizQuestions[qi].aid)
    notifyAssistant({
      text: entry
        ? `这题的核心是「${entry.q}」。${entry.a}`
        : quizQuestions[qi].why,
      mood: 'concern',
      path: entry?.path || '',
      ch: entry?.ch || ''
    })
  }
}
function resetQuiz() { picked.value = {} }
</script>

<style scoped lang="scss">
.learning { display: flex; flex-direction: column; gap: 26px; }
.head { position: relative;
  .corner { position: absolute; right: 0; top: 8px; display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-2); }
}

/* ── 区块标题 ── */
.sec { display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 104px; }

// ── 小节跳转条：6000+ px 的长页，先给一条"电梯" ──
.sec-jump {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin: 0 0 22px;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: rgba(19, 26, 43, 0.5);
}
.sj-item {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px;
  border: 1px solid transparent; border-radius: 999px;
  background: transparent; color: var(--text-2);
  font-size: 15px; cursor: pointer;
  transition: all 0.2s ease;
  &:hover { color: var(--text-1); border-color: var(--hairline-strong); background: rgba(77, 168, 255, 0.1); }
  .sj-num { font-size: 14px; color: var(--cyan); letter-spacing: 0.06em; }
}
@media (max-width: 767px) {
  .sec-jump { border-radius: 14px; }
  .sec { scroll-margin-top: 92px; }
}
.sec-head {
  display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
  border-bottom: 1px solid var(--hairline); padding-bottom: 10px;
  &.sub { margin-top: 10px; }
  .sec-num { font-size: 14px; color: var(--cyan); letter-spacing: 0.1em; }
  h3 { font-size: 17px; font-weight: 600; color: var(--text-1); }
  .sec-desc { flex-basis: 100%; font-size: 14.5px; color: var(--text-3); line-height: 1.75; margin-top: 2px; }
}

/* ── 08.1 受众 ── */
.audience { display: grid; grid-template-columns: 1.25fr 1fr; gap: 14px; align-items: start; }
.aud-card {
  padding: 18px 20px;
  .ac-tag { display: inline-block; margin-bottom: 8px; padding: 2px 10px; border: 1px solid var(--hairline); border-radius: 999px; font-size: 14px; color: var(--cyan); }
  b { display: block; font-size: 16.5px; color: var(--text-1); line-height: 1.65; }
  p { margin-top: 8px; font-size: 14.5px; color: var(--text-2); line-height: 1.8; }
}
.aud-card.primary { border-left: 3px solid rgba(77, 168, 255, 0.6);
  .ac-reason { border-top: 1px dashed var(--hairline); padding-top: 9px; color: var(--text-3); } }
.aud-side { display: flex; flex-direction: column; gap: 12px;
  .aud-card { padding: 15px 18px; b { font-size: 15.5px; } p { font-size: 14px; } } }

/* ── 08.2 使用场景 ── */
.scenes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.scene { padding: 16px 18px;
  .sc-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 9px;
    b { font-size: 16.5px; color: var(--text-1); }
    i { font-style: normal; font-size: 14px; color: var(--text-3); } }
  .sc-flow { font-size: 14.5px; color: var(--text-2); line-height: 1.85; }
  .sc-why { margin-top: 9px; padding-top: 9px; border-top: 1px dashed var(--hairline); font-size: 14px; color: var(--text-3); line-height: 1.8; }
}

/* ── 08.3 知识图谱 ── */
.kmap { display: flex; flex-direction: column; border: 1px solid var(--hairline); border-radius: var(--radius); overflow: hidden; }
.km-row {
  display: grid; grid-template-columns: 168px minmax(0, 1fr) 132px; gap: 16px; align-items: center;
  padding: 12px 18px; text-decoration: none; color: inherit;
  border-bottom: 1px solid var(--hairline); transition: background 0.2s ease;
  &:last-child { border-bottom: 0; }
  &:not(.km-head):hover { background: rgba(77, 168, 255, 0.06); }
}
.km-head { background: rgba(20, 27, 46, 0.6);
  span { font-size: 14px; letter-spacing: 0.18em; color: var(--text-3); } }
.km-ch { display: flex; align-items: baseline; gap: 9px; min-width: 0;
  i { font-size: 14px; color: var(--cyan); font-style: normal; }
  em { font-style: normal; font-size: 15.5px; color: var(--text-1); } }
.km-points { display: flex; flex-direction: column; gap: 3px; min-width: 0;
  b { font-size: 14.5px; font-weight: 400; color: var(--text-2); line-height: 1.7; } }
.km-level { display: flex; flex-wrap: wrap; gap: 5px;
  em { font-style: normal; padding: 2px 9px; border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 999px; font-size: 14px; color: #7fd8ea; } }

/* ── 08.4 学习目标 ── */
.goals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.goal { padding: 16px 18px;
  .gl-top { display: flex; align-items: baseline; gap: 9px; margin-bottom: 10px;
    .gl-num { font-size: 14px; color: var(--cyan); }
    b { font-size: 16px; color: var(--text-1); } }
  ul { list-style: none; display: flex; flex-direction: column; gap: 7px;
    li { position: relative; padding-left: 16px; font-size: 14.5px; color: var(--text-2); line-height: 1.8;
      &::before { content: ''; position: absolute; left: 3px; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: var(--green); } } }
  .gl-plain { margin-top: 11px; padding-top: 10px; border-top: 1px dashed var(--hairline); font-size: 14px; color: var(--text-3); line-height: 1.8;
    i { font-style: normal; margin-right: 7px; color: var(--blue); font-size: 14px; } }
}

/* ── 08.5 自测 ── */
.quizbox { padding: 18px 20px; }
.qb-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-bottom: 14px; border-bottom: 1px solid var(--hairline); margin-bottom: 16px;
  .qb-title { font-size: 16.5px; font-weight: 600; color: var(--text-1); }
  .qb-stat { margin-left: auto; font-size: 14px; color: var(--cyan); } }
.qb-list { display: flex; flex-direction: column; gap: 18px; }
.q-card { transition: opacity 0.3s ease; }
.q-text { font-size: 15.5px; color: var(--text-1); line-height: 1.75; display: flex; gap: 9px; align-items: baseline;
  .q-idx { flex: 0 0 auto; font-size: 14px; color: var(--cyan); } }
.q-opts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.q-opt {
  display: flex; align-items: center; gap: 9px; text-align: left;
  padding: 10px 14px; min-height: 44px;
  border: 1px solid var(--hairline); border-radius: 10px;
  background: rgba(19, 26, 43, 0.55); color: var(--text-2);
  font-size: 14.5px; line-height: 1.6; cursor: pointer;
  transition: all 0.2s ease;
  .q-mark { flex: 0 0 auto; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; background: rgba(77, 168, 255, 0.12); color: var(--blue); font-size: 14px; }
  &:not(:disabled):hover { border-color: var(--hairline-strong); color: var(--text-1); background: rgba(77, 168, 255, 0.08); }
  &:disabled { cursor: default; }
  &.right { border-color: rgba(52, 211, 153, 0.55); background: rgba(52, 211, 153, 0.1); color: #d8fbe8;
    .q-mark { background: rgba(52, 211, 153, 0.22); color: #6ee7a0; } }
  &.wrong { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.09); color: #fbd5d5;
    .q-mark { background: rgba(239, 68, 68, 0.2); color: #fca5a5; } }
}
.q-why { margin-top: 10px; padding: 10px 14px; border-left: 2px solid rgba(34, 211, 238, 0.5); background: rgba(34, 211, 238, 0.05); border-radius: 0 8px 8px 0;
  font-size: 14.5px; color: var(--text-2); line-height: 1.85;
  i { font-style: normal; margin-right: 8px; color: var(--cyan); font-size: 14px; } }

/* ── 08.6 数据集 ── */
.dataset { padding: 20px 22px; }
.ds-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;
  b { font-size: 17px; color: var(--text-1); } }
.ds-holder { font-size: 14.5px; color: var(--text-3); margin-bottom: 14px; }
.ds-proto { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; margin-bottom: 14px;
  .dp { padding: 10px 13px; border: 1px solid var(--hairline); border-radius: 9px; background: rgba(20, 27, 46, 0.5);
    i { display: block; font-style: normal; font-size: 14px; color: var(--blue); margin-bottom: 4px; letter-spacing: 0.08em; }
    span { font-size: 14.5px; color: var(--text-2); line-height: 1.65; } } }
.ds-cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 14px;
  .dc { padding: 12px 14px;
    b { font-size: 17px; color: var(--cyan); }
    .dc-cut { display: block; margin: 4px 0 6px; font-size: 14px; color: var(--text-3); }
    i { font-style: normal; font-size: 14px; color: var(--text-2); line-height: 1.7; } } }
.ds-note { margin-top: 9px; padding-left: 12px; border-left: 2px solid var(--hairline-strong); font-size: 14.5px; color: var(--text-2); line-height: 1.85;
  i { font-style: normal; margin-right: 8px; color: var(--blue); font-size: 14px; } }
.ds-cite { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--hairline); font-size: 14px; color: var(--text-3); word-break: break-word; }

/* ── 08.5 趣味互动 ── */
.games { display: flex; flex-direction: column; gap: 14px; }
.games > :deep(.game) {
  border: 1px solid var(--hairline); border-radius: var(--radius);
  background: var(--panel-1);
}

/* ── 平板：双栏塌单栏 ── */
@media (max-width: 1080px) {
  .audience { grid-template-columns: minmax(0, 1fr); }
  .scenes { grid-template-columns: minmax(0, 1fr); }
  .goals { grid-template-columns: minmax(0, 1fr); }
  .km-row { grid-template-columns: 150px minmax(0, 1fr) 110px; gap: 12px; }
}

/* ── 手机 ── */
@media (max-width: 767px) {
  .head .corner { position: static; display: flex; flex-wrap: wrap; margin-top: 12px; }
  .sec-head h3 { font-size: 17.5px; }
  /* 表格类区块在窄屏一律塌成纵向堆叠，避免横向溢出 */
  .km-row { grid-template-columns: minmax(0, 1fr); gap: 7px; }
  .km-head { display: none; }
  .km-row { padding: 14px 16px; }
  .km-ch { justify-content: flex-start; }
  .km-level { margin-top: 2px; }
  .q-opts { grid-template-columns: minmax(0, 1fr); }
  .qb-bar { gap: 10px;
    .qb-stat { margin-left: 0; flex-basis: 100%; order: 3; }
    /* 触摸目标：这个"重做"按钮实测只有 84×39，低于 44px 下限 */
    .btn-ghost { min-height: 44px; } }
  .q-opt { font-size: 15px; }
  .q-text, .q-why, .ds-note, .ds-holder, .goal ul li { font-size: 14.5px; }
  .ds-proto .dp span, .ds-cells .dc i { font-size: 14.5px; }
}
</style>

<style lang="scss">
.library-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; margin: 20px 0 40px; }
.library-card { text-align: left; color: var(--text-1); padding: 30px; min-height: 220px; cursor: pointer; transition: transform .25s, border-color .25s, box-shadow .25s; }
.library-card:hover { transform: translateY(-6px); border-color: #8e9fff99; box-shadow: 0 12px 50px #7654ff20; }
.library-number { color: var(--cyan); } .library-card h3 { margin: 22px 0 8px; font-size: 23px; } .library-card p { color: var(--text-2); font-size: 16px; } .library-card b { display: block; margin-top: 24px; color: var(--blue); font-size: 15px; }
.library-backdrop { position: fixed; inset: 0; z-index: 210; background: #030712b8; backdrop-filter: blur(14px); display: grid; place-items: center; padding: 24px; }
.library-dialog { width: min(1080px,100%); max-height: 88dvh; overflow-y: auto; overscroll-behavior: contain; background: #101727; border: 1px solid #657db166; border-radius: 24px; padding: 28px; }
.library-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; } .library-toolbar h2 { font-size: 25px; }
.library-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; } .library-tabs .selected { border-color: var(--cyan); color: var(--cyan); }
@media(max-width:767px) { .library-grid { grid-template-columns: 1fr; } .library-backdrop { padding: 10px; } .library-dialog { padding: 18px; max-height: 94dvh; } }
</style>
