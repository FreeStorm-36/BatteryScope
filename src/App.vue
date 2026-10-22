<template>
  <LifeTrackNav />
  <button v-if="$route.path !== '/learn'" class="learning-fab" @click="openLibrary">学习空间 ↗</button>
  <component v-if="Library && $route.path !== '/learn'" :is="Library" ref="libraryRef" embedded />
  <router-view v-slot="{ Component }">
    <transition name="page-fade" mode="out-in">
      <component :is="Component" :key="$route.path" />
    </transition>
  </router-view>
  <!-- 换章特效：四种动作轮换（竖百叶 / 横幕 / 圆形开合 / 斜向扫掠）。
       放在导航之下（z-index 95 < 导航 100），读作"内容区翻页"、导航保持稳定。
       首次加载不播（fxKey 初值 0），不会拖慢首屏。 -->
  <div v-if="fxKey" :key="fxKey" class="page-fx" :data-fx="fxKind" aria-hidden="true">
    <i v-for="n in 12" :key="n" :style="{ animationDelay: (n - 1) * 26 + 'ms' }"></i>
  </div>
  <!-- 换章时懒加载 chunk 的等待反馈。延迟 150ms 才出现（见 main.js），
       所以本机快速换章不会闪。 -->
  <div v-if="routeLoading" class="route-progress" role="status" aria-live="polite">
    <span class="rp-sweep" aria-hidden="true"></span>
    <span class="rp-text">正在加载章节…</span>
  </div>
</template>

<script setup>
import { inject, ref, watch, shallowRef, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import LifeTrackNav from './components/LifeTrackNav.vue'

const Library = shallowRef(null)
const libraryRef = ref(null)
async function openLibrary() {
  if (!Library.value) Library.value = (await import('./views/LearningView.vue')).default
  await nextTick()
  libraryRef.value?.openSection(1)
}
const route = useRoute()
const routeLoading = inject('routeLoading', ref(false))

// ── 换章：章节主色 + 切换特效 ──
// 八章各配一色，写在 documentElement 上（不动 DOM 结构），由 base.scss 的 --hue-chapter 消费：
// 章节眉标、特效条带、以及任何用到该变量的地方都会跟着换色。
const CHAPTER_HUE = ['#4da8ff', '#22d3ee', '#a78bfa', '#f59e0b', '#34d399', '#38bdf8', '#fb7185', '#e879f9']
// 四种切换特效轮换，连续翻章节不会每次都看到同一个动作
const FX_KINDS = ['blinds', 'curtain', 'iris', 'wipe']
const fxKey = ref(0)
const fxKind = ref('blinds')

function applyChapterTint(chapter) {
  document.documentElement.style.setProperty('--hue-chapter', CHAPTER_HUE[((chapter ?? 1) - 1) % CHAPTER_HUE.length])
}
applyChapterTint(route.meta.chapter) // 进站先设一次；首次不播特效（fxKey 仍为 0）

// 章节切换后强制回到页面顶部：
// 固定导航高约 82px，若残留上一页的滚动位置，章节标题会被导航压住、动画区底部也会被切出视口。
watch(
  () => route.path,
  () => {
    applyChapterTint(route.meta.chapter)
    fxKind.value = FX_KINDS[fxKey.value % FX_KINDS.length]
    fxKey.value += 1 // 自增靠 :key 强制重挂载 → CSS 动画重播
    window.scrollTo({ top: 0, behavior: 'auto' })
  },
  { flush: 'post' }
)
</script>

<style lang="scss">
.page {
  max-width: 1240px; margin: 0 auto; padding: 118px 48px 0;
  min-height: calc(100vh - 200px);
}
.page-full {
  max-width: 1320px; margin: 0 auto;
  // 固定导航实际高约 82px，上边距收到 92px：章节内容整体上移，
  // 让「标题 + 动画舞台 + 右侧控制卡」能在一屏内完整落位。
  padding: 92px 48px 0;
  min-height: calc(100vh - 160px);
  box-sizing: border-box;
}
// 手机断点统一用 767px。窄屏顶栏换成"上一章 / 当前章 / 下一章"（高 60px + 进度条 10px），
// 比桌面的 82px 矮，所以这里留 78px 就够 —— 原来写死 82px 会白多出一截空白。
@media (max-width: 767px) {
  .page, .page-full { padding: 78px 20px 0; }
}

// ── 换章加载进度条 ──
// 章节组件是懒加载的，chunk 没到位时路由还没切换、旧页面仍在显示，
// 这条 3px 扫光是"系统正在干活"的唯一反馈。z-index 取 120：高于导航（100），
// 低于章节目录浮层（180），换章时目录本来也已经收起了。
.route-progress {
  position: fixed; top: 0; left: 0; right: 0; height: 3px;
  z-index: 120;
  overflow: hidden;
  background: rgba(77, 168, 255, 0.14);
  pointer-events: none;
}
.rp-sweep {
  position: absolute; inset: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--blue), var(--cyan), transparent);
  animation: rp-sweep 1.05s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes rp-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
// 纯文字提示只给读屏软件：3px 的条上放不下可读文案
.rp-text {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .rp-sweep { animation: none; width: 100%; opacity: 0.55; }
}

.page-full > .head .corner { position: static; margin-top: 12px; display: flex; flex-wrap: wrap; }
</style>

<style>.learning-fab { position: fixed; z-index: 90; bottom: 24px; left: 24px; border: 1px solid #7a91ca77; border-radius: 999px; padding: 11px 20px; background: #121c32e8; backdrop-filter: blur(12px); color: #c3e9ff; text-decoration: none; font-size: 15px; cursor: pointer; box-shadow: 0 5px 25px #0005; } .learning-fab:hover { border-color: #22d3ee; box-shadow: 0 0 25px #22d3ee25; }</style>
