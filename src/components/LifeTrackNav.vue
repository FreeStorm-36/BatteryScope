<template>
  <header class="site-header">
    <div class="nav-row">
      <router-link to="/" class="brand" aria-label="返回 BatteryScope 首页">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" role="img">
            <rect x="8" y="5" width="16" height="22" rx="7" />
            <path d="M13 3h6M12 11h8M12 16h8M12 21h5" />
          </svg>
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
          <span class="num">{{ String(c.n).padStart(2, '0') }}</span>
          <b>{{ shortNames[i] }}</b>
        </router-link>
      </nav>

      <div class="nav-status">
        <span class="status-dot"></span>
        <span class="status-copy"><i>当前对象</i><b>{{ ch?.subject }}</b></span>
        <span class="counter num">{{ current + 1 }}/07</span>
      </div>
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
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { chapters } from '../stores/tour.js'

const route = useRoute()
const shortNames = ['首页', '结构', '工作', '老化', '数据', '模型', '预测']
const current = computed(() => (route.meta.chapter ?? 1) - 1)
const ch = computed(() => chapters[current.value])
const progress = computed(() => (current.value / (chapters.length - 1)) * 100)
</script>

<style scoped lang="scss">
.site-header {
  position: fixed; inset: 0 0 auto; z-index: 100;
  background: rgba(6, 13, 13, 0.84);
  border-bottom: 1px solid rgba(94, 184, 159, 0.16);
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
    border: 1px solid rgba(52, 211, 153, 0.38); border-radius: 10px;
    background: rgba(52, 211, 153, 0.08);
  }
  svg { width: 23px; fill: none; stroke: var(--green); stroke-width: 1.6; stroke-linecap: round; }
  b { display: block; font-size: 15px; letter-spacing: 0.025em; }
  i { display: block; color: var(--text-3); font-size: 10.5px; font-style: normal; letter-spacing: 0.08em; }
}
.chapter-links { display: flex; align-items: center; gap: 2px; }
.chapter-link {
  position: relative; display: inline-flex; align-items: baseline; gap: 5px;
  padding: 10px 11px; color: var(--text-3); text-decoration: none; border-radius: 9px;
  transition: color 0.2s ease, background 0.2s ease;
  .num { font-size: 9px; opacity: 0.7; }
  b { font-size: 12.5px; font-weight: 500; white-space: nowrap; }
  &::after {
    content: ''; position: absolute; left: 12px; right: 12px; bottom: 4px; height: 1px;
    background: var(--green); transform: scaleX(0); transition: transform 0.22s ease;
  }
  &:hover { color: var(--text-1); background: rgba(255,255,255,0.035); }
  &.done { color: #78968e; }
  &.active { color: #e9fff7; background: rgba(52, 211, 153, 0.075); }
  &.active::after { transform: scaleX(1); }
}
.nav-status {
  justify-self: end; display: flex; align-items: center; gap: 9px;
  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 9px rgba(52,211,153,.75); }
  .status-copy { min-width: 0; }
  i { display: block; color: var(--text-3); font-size: 9.5px; line-height: 1.1; font-style: normal; }
  b { display: block; max-width: 150px; color: var(--text-2); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .counter { padding: 4px 8px; border: 1px solid var(--hairline); border-radius: 999px; color: var(--green); font-size: 10.5px; }
}
.energy-rail {
  position: relative; width: min(1380px, calc(100% - 48px)); height: 10px; margin: 0 auto;
  border-top: 1px solid rgba(105, 155, 145, 0.12);
}
.energy-rail::before, .rail-fill { content: ''; position: absolute; left: 0; top: -1px; height: 1px; }
.energy-rail::before { right: 0; background: rgba(105, 155, 145, 0.12); }
.rail-fill { background: linear-gradient(90deg, var(--green), var(--cyan)); transition: width .7s cubic-bezier(.2,.7,.3,1); }
.rail-node {
  position: absolute; top: -4px; width: 7px; height: 7px; border-radius: 50%; transform: translateX(-50%);
  background: #13211f; border: 1px solid #43665d;
  &.done, &.active { background: var(--green); border-color: #b7f7de; }
}
.li-marker {
  position: absolute; top: -6px; width: 11px; height: 11px; border-radius: 50%; transform: translateX(-50%);
  background: #dffff5; border: 2px solid var(--green); box-shadow: 0 0 12px rgba(52,211,153,.75);
  transition: left .7s cubic-bezier(.2,.7,.3,1);
}
@media (max-width: 1080px) {
  .nav-row { grid-template-columns: auto 1fr auto; gap: 12px; }
  .chapter-link { padding-inline: 7px; .num { display: none; } }
  .brand i, .status-copy { display: none; }
}
@media (max-width: 720px) {
  .nav-row { width: calc(100% - 28px); height: 62px; grid-template-columns: auto 1fr auto; }
  .brand { .brand-mark { width: 32px; height: 32px; } b { font-size: 13px; } }
  .chapter-links { justify-self: end; max-width: calc(100vw - 175px); overflow-x: auto; scrollbar-width: none; }
  .chapter-links::-webkit-scrollbar { display: none; }
  .chapter-link { padding: 9px 7px; b { font-size: 11px; } }
  .nav-status .status-dot { display: none; }
  .energy-rail { width: calc(100% - 28px); }
}
</style>
