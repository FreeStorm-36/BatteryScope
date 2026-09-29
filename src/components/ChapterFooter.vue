<template>
  <footer class="chapter-footer">
    <div class="inner">
      <router-link v-if="prev" :to="prev.path" class="side">
        <span class="arrow">←</span>
        <span><i>上一章</i><b>{{ prev.name }}</b></span>
      </router-link>
      <div v-else class="side empty"></div>

      <div class="conclusion">
        <span class="label">本章结论</span>
        <p>{{ conclusion }}</p>
      </div>

      <router-link v-if="next" :to="next.path" class="side right">
        <span><i>下一章</i><b>{{ next.name }} →</b></span>
      </router-link>
      <router-link v-else to="/" class="side right">
        <span><i>回望</i><b>重新开始 ⟳</b></span>
      </router-link>
    </div>
    <div class="project-signature">
      <span>BatteryScope</span>
      <i>物理机理 × 真实数据 × 寿命预测</i>
      <b class="num">EDUCATIONAL RESEARCH PROTOTYPE</b>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { chapters } from '../stores/tour.js'

const props = defineProps({ conclusion: String })
const route = useRoute()
const idx = computed(() => (route.meta.chapter ?? 1) - 1)
const prev = computed(() => chapters[idx.value - 1] || null)
const next = computed(() => chapters[idx.value + 1] || null)
</script>

<style scoped lang="scss">
.chapter-footer { position: relative; z-index: 2; padding: 44px 0 34px; }
.inner {
  max-width: 1280px; margin: 0 auto; padding: 0 40px;
  display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 16px; align-items: stretch;
  border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline);
}
.side {
  display: flex; align-items: center; gap: 12px;
  min-height: 104px; padding: 14px 20px; text-decoration: none; color: var(--text-1);
  transition: background .2s ease, color .2s ease;
  &:hover { background: rgba(52,211,153,.05); }
  i { display: block; font-style: normal; font-size: 11.5px; color: var(--text-2); letter-spacing: 0.12em; }
  b { font-size: 14.5px; }
  .arrow { font-size: 22px; color: var(--green); }
  &.right { justify-content: flex-end; text-align: right; }
  &.empty { visibility: hidden; }
}
.conclusion {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 18px 26px; text-align: center;
  border-left: 1px solid var(--hairline); border-right: 1px solid var(--hairline);
  .label { font-size: 10px; letter-spacing: 0.3em; color: var(--green); }
  p { font-size: 15.5px; font-weight: 600; color: var(--text-1); }
}
.project-signature {
  max-width: 1200px; margin: 26px auto 0; padding: 0 40px;
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px;
  color: var(--text-3); font-size: 10.5px;
  span { color: var(--text-2); font-size: 13px; font-weight: 650; }
  i { font-style: normal; }
  b { font-size: 9px; font-weight: 400; letter-spacing: .09em; }
}
@media (max-width: 900px) {
  .inner { grid-template-columns: 1fr; border-bottom: 0; }
  .side.empty { display: none; }
  .conclusion { border: 1px solid var(--hairline); }
  .project-signature { grid-template-columns: 1fr; gap: 2px; }
}
</style>
