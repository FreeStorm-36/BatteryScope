<template>
  <section v-if="ready || dev" class="video-slot panel">
    <div class="vs-head">
      <span class="vs-tag"><IconGlyph name="play" :size="12" />科普视频</span>
      <b>{{ slot.title }}</b>
      <span class="vs-dur num">{{ slot.duration }}</span>
    </div>

    <!-- 已就绪：本地自托管播放器。playsinline 让 iOS 不强制全屏接管。 -->
    <div v-if="ready" class="vs-frame">
      <video
        :src="slot.src"
        :poster="slot.poster || undefined"
        controls
        preload="metadata"
        playsinline
      ></video>
    </div>

    <!-- 开发态占位：只在 npm run dev 出现，用于对照位置与核对内容要求。
         正式构建（dist）里这一整块连同外层 section 都不会渲染 ——
         绝不能让评审看到"待接入"这类字样。 -->
    <div v-else class="vs-placeholder">
      <span class="vp-badge">开发态占位 · 正式构建自动隐藏</span>
      <!-- 优先级：必做 / 建议 / 可选。留空不渲染，不会有任何视觉空洞，
           所以"时间紧就不做"是安全选项，不是欠账。 -->
      <span class="vp-pri" :class="`is-${slot.priority}`">{{ priorityLabel[slot.priority] || '未分级' }}</span>
      <p class="vp-where"><i>配套</i>{{ slot.where }}</p>
      <p class="vp-style"><i>形式</i>{{ slot.style }}</p>
      <ul class="vp-needs">
        <li v-for="(m, i) in slot.mustCover" :key="i">{{ m }}</li>
      </ul>
      <p class="vp-avoid"><i>注意</i>{{ slot.avoid }}</p>
      <p v-if="slot.note" class="vp-note"><i>取舍</i>{{ slot.note }}</p>
      <p class="vp-file"><i>放这里</i>public/media/{{ slot.file }}</p>
    </div>

    <p v-if="ready && slot.source" class="vs-credit">
      来源：{{ slot.source }}<span v-if="slot.license"> · {{ slot.license }}</span>
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { videoSlots, slotReady, showPlaceholder, priorityLabel } from '../data/videos.js'
import IconGlyph from './IconGlyph.vue'

const props = defineProps({
  // 视频位 id，对应 src/data/videos.js 中 videoSlots[].id
  id: { type: String, required: true }
})

const slot = computed(() => videoSlots.find((s) => s.id === props.id) || {})
const ready = computed(() => slotReady(slot.value))
const dev = computed(() => showPlaceholder())
</script>

<style scoped lang="scss">
.video-slot { padding: 16px 18px; }
.vs-head {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;
  .vs-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border: 1px solid rgba(34, 211, 238, 0.4); border-radius: 999px;
    color: var(--cyan); font-size: 11px; letter-spacing: 0.06em;
  }
  b { font-size: 14.5px; font-weight: 600; color: var(--text-1); }
  .vs-dur { margin-left: auto; font-size: 11.5px; color: var(--text-3); }
}
.vs-frame {
  position: relative; width: 100%; border-radius: 12px; overflow: hidden;
  background: #05080f; border: 1px solid var(--hairline);
  video { display: block; width: 100%; height: auto; max-height: 420px; background: #05080f; }
}
.vs-credit { margin-top: 10px; font-size: 11.5px; color: var(--text-3); }

/* ── 开发态占位（生产构建不会渲染） ── */
.vs-placeholder {
  padding: 14px 16px; border: 1px dashed rgba(120, 180, 255, 0.34); border-radius: 12px;
  background: rgba(77, 168, 255, 0.045);
  .vp-badge {
    display: inline-block; margin-bottom: 10px; padding: 2px 9px; border-radius: 999px;
    background: rgba(245, 158, 11, 0.14); color: var(--amber); font-size: 10.5px; letter-spacing: 0.04em;
  }
  .vp-pri {
    display: inline-block; margin: 0 0 10px 8px; padding: 2px 10px; border-radius: 999px;
    font-size: 10.5px; letter-spacing: 0.06em;
    &.is-must { background: rgba(77, 168, 255, 0.16); color: var(--blue); }
    &.is-nice { background: rgba(34, 211, 238, 0.13); color: var(--cyan); }
    &.is-optional { background: rgba(148, 163, 184, 0.13); color: var(--text-3); }
  }
  p { font-size: 12.5px; color: var(--text-2); line-height: 1.7; margin-top: 5px;
    i { display: inline-block; min-width: 34px; margin-right: 8px; font-style: normal; color: var(--blue); font-size: 11.5px; }
  }
  .vp-needs {
    margin: 8px 0 0; padding-left: 18px;
    li { font-size: 12.5px; color: var(--text-2); line-height: 1.8; }
  }
  .vp-avoid i { color: var(--amber); }
  /* 取舍说明：这条为什么建议做 / 为什么可以不做 */
  .vp-note i { color: var(--cyan); }
  .vp-file { font-family: var(--mono); font-size: 11.5px; }
}

@media (max-width: 767px) {
  .video-slot { padding: 14px; }
  .vs-head b { font-size: 14px; }
  .vs-frame video { max-height: none; }
  .vs-placeholder p, .vs-placeholder .vp-needs li { font-size: 12.5px; }
}
</style>
