<template>
  <header class="site-header">
    <!-- 宽屏：品牌 + 全部章节 + 当前对象读数。三者在 393px 里装不下，
         所以窄屏整套隐藏，换成下面的 nav-compact（见样式里的 767px 断点）。 -->
    <div class="nav-row">
      <router-link to="/" class="brand" aria-label="返回 BatteryScope 首页">
        <span class="brand-mark" aria-hidden="true">
          <img :src="logoUrl" alt="" class="brand-logo" />
        </span>
        <span><b>BatteryScope</b><i>锂电池生命观察站</i></span>
      </router-link>

      <nav class="chapter-links" aria-label="章节导航">
        <router-link
          v-for="(c, i) in chapters"
          :key="c.path"
          :to="c.path"
          class="chapter-link"
          :class="{ active: i === current, done: i < current }"
        >
          <span class="num">{{ pad(c.n) }}</span>
          <b>{{ shortNames[i] }}</b>
        </router-link>
      </nav>

      <div class="nav-status">
        <span class="status-dot"></span>
        <span class="status-copy"><i>当前对象</i><b>{{ ch?.subject }}</b></span>
        <span class="counter num">{{ current + 1 }}/{{ pad(chapters.length) }}</span>
      </div>
    </div>

    <!-- 窄屏：上一章 / 当前章（点开目录）/ 下一章。
         7 个章节横向排不进一块手机屏，改成"顺着章节叙事翻页"，
         和下方 energy-rail 的进度语言是一套。 -->
    <div class="nav-compact">
      <router-link
        v-if="prev"
        class="nc-edge"
        :to="prev.path"
        :aria-label="`上一章：${prev.name}`"
      >
        <IconGlyph name="prev" :size="18" />
      </router-link>
      <span v-else class="nc-edge is-empty" aria-hidden="true"></span>

      <button
        type="button"
        class="nc-current"
        :aria-expanded="sheetOpen"
        aria-haspopup="dialog"
        @click="sheetOpen = true"
      >
        <span class="nc-num num">{{ pad(current + 1) }}</span>
        <b>{{ shortNames[current] }}</b>
        <IconGlyph name="down" :size="14" />
      </button>

      <router-link
        v-if="next"
        class="nc-edge"
        :to="next.path"
        :aria-label="`下一章：${next.name}`"
      >
        <IconGlyph name="next" :size="18" />
      </router-link>
      <span v-else class="nc-edge is-empty" aria-hidden="true"></span>
    </div>

    <div class="energy-rail" aria-hidden="true">
      <div class="rail-fill" :style="{ width: `${progress}%` }"></div>
      <span
        v-for="(c, i) in chapters"
        :key="c.path"
        class="rail-node"
        :class="{ active: i === current, done: i < current }"
        :style="{ left: `${(i / (chapters.length - 1)) * 100}%` }"
      ></span>
      <span class="li-marker" :style="{ left: `${progress}%` }"></span>
    </div>
  </header>

  <!-- 章节目录：必须 Teleport 出 header。header 上的 backdrop-filter 会创建
       containing block，内部任何 position:fixed 都会转而相对 header 定位，
       遮罩就盖不住整屏了。 -->
  <Teleport to="body">
    <transition name="sheet">
      <div v-if="sheetOpen" class="chapter-sheet" @click.self="sheetOpen = false">
        <div ref="csPanel" class="cs-panel" role="dialog" aria-modal="true" aria-label="章节目录" tabindex="-1">
          <div class="cs-head">
            <!-- 总时长由各章的 duration（秒）实时求和，不写死数字 ——
                 以后增删章节，这里会自动跟着变，不会再出现"各章之和与表头对不上"的老问题。 -->
            <span><i>共 {{ chapters.length }} 章 · 快速浏览约 {{ totalMinutes }} 分钟</i><b>章节目录</b></span>
            <button type="button" class="cs-close" aria-label="关闭目录" @click="sheetOpen = false">
              <IconGlyph name="close" :size="18" />
            </button>
          </div>
          <nav class="cs-list">
            <router-link
              v-for="(c, i) in chapters"
              :key="c.path"
              :to="c.path"
              class="cs-item"
              :class="{ active: i === current, done: i < current }"
            >
              <span class="cs-num num">{{ pad(c.n) }}</span>
              <span class="cs-body">
                <b>{{ c.name }}</b>
                <i>{{ c.brief }}</i>
              </span>
              <!-- 单位是"秒"不是"分"：各章相加 320 秒 ≈ 5.3 分钟，与表头"约 5 分钟"一致。
                   旧版标成"分"会与表头差 60 倍（各章之和会读成 5 小时 20 分）。 -->
              <span class="cs-dur num">≈ {{ c.duration }} 秒</span>
            </router-link>
          </nav>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
const logoUrl = `${import.meta.env.BASE_URL}batteryscope-logo.png`
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { chapters } from '../stores/tour.js'
import IconGlyph from './IconGlyph.vue'
import { useDialog } from '../composables/useDialog.js'

const route = useRoute()
const shortNames = ['首页', '结构', '工作', '老化', '数据', '模型', '预测', '学习']
const current = computed(() => (route.meta.chapter ?? 1) - 1)
const ch = computed(() => chapters[current.value])
const progress = computed(() => (current.value / (chapters.length - 1)) * 100)
// 目录面板表头的"约 N 分钟"：由各章 duration（秒）求和后四舍五入，避免写死数字后与列内条目矛盾。
const totalMinutes = computed(() => Math.max(1, Math.round(chapters.reduce((sum, c) => sum + c.duration, 0) / 60)))
const pad = (n) => String(n).padStart(2, '0')

const prev = computed(() => chapters[current.value - 1] || null)
const next = computed(() => chapters[current.value + 1] || null)

const sheetOpen = ref(false)
const csPanel = ref(null)

// 跳转后自动收起，否则点完目录还停在遮罩上
watch(() => route.fullPath, () => { sheetOpen.value = false })

// Esc 关闭、焦点移入 / 困在层内 / 关闭后归还，以及背景滚动锁，
// 统一交给 useDialog —— 站内三处弹层共用同一套行为，避免各写一遍后逐渐漂移。
useDialog(sheetOpen, csPanel, { trap: true, lockScroll: true })
</script>

<style scoped lang="scss">
.site-header {
  position: fixed; inset: 0 0 auto; z-index: 100;
  background: rgba(8, 12, 22, 0.84);
  border-bottom: 1px solid rgba(90, 150, 220, 0.18);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
}
.nav-row {
  width: min(1380px, calc(100% - 48px)); height: 72px; margin: 0 auto;
  display: grid; grid-template-columns: minmax(210px, 1fr) auto minmax(210px, 1fr);
  align-items: center; gap: 24px;
}
.brand {
  display: inline-flex; align-items: center; gap: 11px; width: fit-content;
  color: var(--text-1); text-decoration: none;
  .brand-mark {
    width: 36px; height: 36px; display: grid; place-items: center;
    border: 1px solid rgba(77, 168, 255, 0.4); border-radius: 10px;
    background: rgba(77, 168, 255, 0.09);
  }
  svg { width: 23px; fill: none; stroke: var(--blue); stroke-width: 1.6; stroke-linecap: round; }
  b { display: block; font-size: 17px; letter-spacing: 0.025em; }
  i { display: block; color: var(--text-3); font-size: 14px; font-style: normal; letter-spacing: 0.08em; }
}
.chapter-links { display: flex; align-items: center; gap: 2px; }
.chapter-link {
  position: relative; display: inline-flex; align-items: baseline; gap: 5px;
  padding: 10px 11px; color: var(--text-3); text-decoration: none; border-radius: 9px;
  transition: color 0.2s ease, background 0.2s ease;
  .num { font-size: 14px; opacity: 0.7; }
  b { font-size: 14.5px; font-weight: 500; white-space: nowrap; }
  &::after {
    content: ''; position: absolute; left: 12px; right: 12px; bottom: 4px; height: 1px;
    background: var(--blue); transform: scaleX(0); transition: transform 0.22s ease;
  }
  &:hover { color: var(--text-1); background: rgba(255,255,255,0.035); }
  &.done { color: #7a8aa4; }
  &.active { color: #eaf6ff; background: rgba(77, 168, 255, 0.09); }
  &.active::after { transform: scaleX(1); }
}
.nav-status {
  justify-self: end; display: flex; align-items: center; gap: 9px;
  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 7px rgba(34,211,238,.6); }
  .status-copy { min-width: 0; }
  i { display: block; color: var(--text-3); font-size: 14px; line-height: 1.1; font-style: normal; }
  b { display: block; max-width: 150px; color: var(--text-2); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .counter { padding: 4px 8px; border: 1px solid var(--hairline); border-radius: 999px; color: var(--cyan); font-size: 14px; }
}
.energy-rail {
  position: relative; width: min(1380px, calc(100% - 48px)); height: 10px; margin: 0 auto;
  border-top: 1px solid rgba(90, 130, 190, 0.14);
}
.energy-rail::before, .rail-fill { content: ''; position: absolute; left: 0; top: -1px; height: 1px; }
.energy-rail::before { right: 0; background: rgba(90, 130, 190, 0.14); }
.rail-fill { background: linear-gradient(90deg, var(--blue), var(--cyan)); transition: width .7s cubic-bezier(.2,.7,.3,1); }
.rail-node {
  position: absolute; top: -4px; width: 7px; height: 7px; border-radius: 50%; transform: translateX(-50%);
  background: #16223c; border: 1px solid #3d5885;
  &.done, &.active { background: var(--blue); border-color: #bfe3ff; }
}
.li-marker {
  position: absolute; top: -6px; width: 11px; height: 11px; border-radius: 50%; transform: translateX(-50%);
  background: #d9fbff; border: 2px solid var(--cyan); box-shadow: 0 0 10px rgba(34,211,238,.6);
  transition: left .7s cubic-bezier(.2,.7,.3,1);
}

/* ── 窄屏顶栏：默认不参与布局，只在 767px 以下接管 ── */
.nav-compact {
  display: none;
  width: calc(100% - 28px); height: 60px; margin: 0 auto;
  align-items: center; gap: 8px;
}
.nc-edge {
  flex: 0 0 auto;
  width: 44px; height: 44px;              /* 触摸目标下限 44px */
  display: grid; place-items: center;
  border: 1px solid var(--hairline); border-radius: 12px;
  color: var(--text-2); text-decoration: none;
  background: rgba(255, 255, 255, 0.035);
  transition: background 0.18s ease, color 0.18s ease;
  &:active { background: rgba(77, 168, 255, 0.16); color: var(--text-1); }
  /* 首章没有上一章、末章没有下一章：占位保持三格宽度稳定，不做成禁用态按钮 */
  &.is-empty { visibility: hidden; }
}
.nc-current {
  flex: 1; min-width: 0; height: 44px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 1px solid rgba(77, 168, 255, 0.34); border-radius: 12px;
  background: rgba(77, 168, 255, 0.1);
  color: var(--text-1); font: inherit; cursor: pointer;
  transition: background 0.18s ease;
  &:active { background: rgba(77, 168, 255, 0.2); }
  .nc-num { font-size: 14px; color: var(--cyan); }
  b { font-size: 16px; font-weight: 500; white-space: nowrap; }
  svg { color: var(--text-3); flex: 0 0 auto; }
}

/* ── 章节目录抽屉 ── */
.chapter-sheet {
  position: fixed; inset: 0; z-index: 180;
  display: flex; align-items: flex-end;
  background: rgba(4, 8, 16, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.cs-panel {
  width: 100%; max-height: 84vh; overflow-y: auto;
  padding: 18px 16px calc(20px + env(safe-area-inset-bottom));
  border-radius: 20px 20px 0 0;
  background: rgba(11, 17, 30, 0.98);
  border-top: 1px solid var(--hairline);
  box-shadow: 0 -18px 48px rgba(0, 0, 0, 0.5);
}
.cs-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 14px; padding: 0 4px;
  span i { display: block; font-style: normal; font-size: 14px; color: var(--text-3); }
  span b { display: block; margin-top: 3px; font-size: 16px; font-weight: 500; color: var(--text-1); }
}
.cs-close {
  flex: 0 0 auto; width: 44px; height: 44px; display: grid; place-items: center;
  border: 1px solid var(--hairline); border-radius: 12px;
  background: rgba(255, 255, 255, 0.04); color: var(--text-2); cursor: pointer;
  &:active { background: rgba(255, 255, 255, 0.1); }
}
.cs-list { display: flex; flex-direction: column; gap: 6px; }
.cs-item {
  display: flex; align-items: center; gap: 12px;
  min-height: 58px; padding: 10px 14px;
  border: 1px solid transparent; border-radius: 12px;
  color: var(--text-2); text-decoration: none;
  .cs-num { flex: 0 0 20px; font-size: 15px; color: var(--text-3); }
  .cs-body {
    flex: 1; min-width: 0;
    b { display: block; font-size: 17px; font-weight: 500; color: var(--text-1); }
    i { display: block; margin-top: 3px; font-style: normal; font-size: 14.5px; color: var(--text-3); }
  }
  .cs-dur { flex: 0 0 auto; font-size: 14px; color: var(--text-3); }
  &.done .cs-num { color: var(--blue); }
  &.active { border-color: rgba(77, 168, 255, 0.5); background: rgba(77, 168, 255, 0.1); }
}
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.22s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-active .cs-panel { transition: transform 0.28s cubic-bezier(0.2, 0.7, 0.3, 1); }
.sheet-leave-active .cs-panel { transition: transform 0.2s ease; }
.sheet-enter-from .cs-panel, .sheet-leave-to .cs-panel { transform: translateY(100%); }

@media (max-width: 1080px) {
  .nav-row { grid-template-columns: auto 1fr auto; gap: 12px; }
  .chapter-link { padding-inline: 7px; .num { display: none; } }
  .brand i, .status-copy { display: none; }
}
@media (max-width: 767px) {
  /* 三段式在手机上装不下（实测章节导航会侵入品牌区约 40px），整块撤掉换翻页式 */
  .nav-row { display: none; }
  .nav-compact { display: flex; }
  .energy-rail { width: calc(100% - 28px); }
}
</style>

<style>.brand-mark .brand-logo { width: 46px; height: 46px; object-fit: contain; } .brand-mark { background: transparent !important; border: none !important; } @media(max-width:1100px) and (min-width:768px) { .nav-status { display: none !important; } }</style>

<style>
@media(min-width:768px) and (max-width:1250px) { .nav-row { grid-template-columns: 210px 1fr; gap: 15px; } .nav-status { display: none; } .chapter-links { justify-self: end; } .chapter-link { padding: 10px 7px; } }
@media(min-width:768px) and (max-width:960px) { .chapter-link .num { display: none; } .chapter-link { padding: 10px 8px; } }
</style>
