<template>
  <section v-if="goal" class="chapter-goals panel">
    <div class="cg-head">
      <span class="cg-label">本章学习目标</span>
      <span class="cg-meta num">对照自查 · {{ goal.goals.length }} 条</span>
    </div>
    <ul class="cg-list">
      <li v-for="(g, i) in goal.goals" :key="i">
        <span class="cg-check"><IconGlyph name="check" :size="13" /></span>{{ g }}
      </li>
    </ul>
    <p v-if="goal.plain" class="cg-plain"><i>一句话理解</i>{{ goal.plain }}</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { chapterGoals } from '../data/learning.js'
import IconGlyph from './IconGlyph.vue'

const props = defineProps({
  chapter: { type: Number, required: true }
})

const goal = computed(() => chapterGoals.find((g) => g.n === props.chapter) || null)
</script>

<style scoped lang="scss">
/* 放在 ChapterFooter 之前：既不占首屏高度（避免把动画舞台顶出视口），
   又能在"学完这一章"的位置自然形成一次对照自查。
   外层间距交给各章节页的 flex gap 处理，这里不自带 margin，
   否则会与 gap 叠加成双倍间距。 */
.chapter-goals {
  max-width: 1280px; padding: 18px 24px 20px;
  border-left: 3px solid rgba(34, 211, 238, 0.55);
}
.cg-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px;
  .cg-label { font-size: 12px; letter-spacing: 0.22em; color: var(--cyan); }
  .cg-meta { font-size: 11px; color: var(--text-3); }
}
.cg-list {
  display: flex; flex-direction: column; gap: 8px; list-style: none;
  li {
    display: flex; align-items: flex-start; gap: 9px;
    font-size: 13.5px; color: var(--text-2); line-height: 1.7;
  }
  .cg-check { flex: 0 0 auto; margin-top: 3px; color: var(--green); display: inline-flex; }
}
.cg-plain {
  margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--hairline);
  font-size: 13px; color: var(--text-3); line-height: 1.75;
  i { font-style: normal; margin-right: 8px; color: var(--blue); font-size: 11.5px; letter-spacing: 0.06em; }
}

@media (max-width: 767px) {
  .chapter-goals { padding: 16px 16px 18px; margin-bottom: 20px; }
  .cg-head .cg-label { font-size: 12px; letter-spacing: 0.16em; }
  .cg-list li { font-size: 13px; }
  .cg-plain { font-size: 12.5px; }
}
</style>
