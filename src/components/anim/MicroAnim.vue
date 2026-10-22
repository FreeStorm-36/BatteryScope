<template>
  <section class="micro-anim panel">
    <div class="ma-head">
      <!-- 明确标注"本站自制"：这是参赛材料里"学生实质性贡献 + 原创性"的直接证据 -->
      <span class="ma-tag"><IconGlyph name="play" :size="11" />本站自制微动画</span>
      <b>{{ scene.title }}</b>
      <span class="ma-dur num">{{ scene.seconds }}</span>
    </div>

    <div class="ma-stage">
      <canvas ref="canvasRef" role="img" :aria-label="scene.aria"></canvas>
    </div>

    <div class="ma-bar">
      <button class="ma-btn" type="button" :aria-label="playing ? '暂停' : '播放'" @click="toggle">
        <IconGlyph :name="playing ? 'pause' : 'play'" :size="14" />
      </button>
      <button class="ma-btn" type="button" aria-label="从头重播" @click="replay">
        <IconGlyph name="reset" :size="14" />
      </button>
      <input
        class="ma-seek"
        type="range"
        min="0"
        max="1000"
        step="1"
        :value="Math.round(progress * 1000)"
        aria-label="动画进度"
        @input="onSeek"
      />
      <span class="ma-pct num">{{ Math.round(progress * 100) }}%</span>
    </div>

    <ul v-if="scene.legend" class="ma-legend">
      <li v-for="l in scene.legend" :key="l.label">
        <i :style="{ background: l.color }"></i>{{ l.label }}
      </li>
    </ul>

    <!-- 两行常驻口径：上面写"依据什么画的"，下面写"哪些是示意"。
         这是本项目数据真实性铁律的落地形式——写在代码注释里不算，必须写在页面上。 -->
    <p class="ma-basis"><i>依据</i>{{ scene.basis }}</p>
    <p class="ma-note"><i>口径</i>{{ scene.disclaimer }}</p>
  </section>
</template>

<script setup>
import IconGlyph from '../IconGlyph.vue'
import { useAnimStage } from './stage.js'

const props = defineProps({
  // 场景模块：{ title, seconds, aria, basis, disclaimer, legend?, duration?, draw(ctx, frame) }
  scene: { type: Object, required: true }
})

// duration 是静态常量，不需要做成响应式；场景模块里已按"单遍时长"给好。
const stage = useAnimStage((ctx, frame) => props.scene.draw(ctx, frame), {
  duration: props.scene.duration ?? 11000
})

const { canvasRef, playing, progress, toggle, replay, seek } = stage

function onSeek(e) {
  seek(Number(e.target.value) / 1000)
}
</script>

<style scoped lang="scss">
.micro-anim { padding: 16px 18px; }

.ma-head {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;
  .ma-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border: 1px solid rgba(52, 211, 153, 0.42); border-radius: 999px;
    color: var(--green); font-size: 14px; letter-spacing: 0.06em;
  }
  b { font-size: 16.5px; font-weight: 600; color: var(--text-1); }
  .ma-dur { margin-left: auto; font-size: 14px; color: var(--text-3); }
}

.ma-stage {
  position: relative; width: 100%;
  aspect-ratio: 16 / 9; max-height: 430px; min-height: 250px;
  border: 1px solid var(--hairline); border-radius: 12px; overflow: hidden;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(139, 92, 246, 0.10), transparent 62%),
    linear-gradient(180deg, #14161c 0%, #0b0d11 100%);
  canvas { display: block; width: 100%; height: 100%; }
}

.ma-bar {
  display: flex; align-items: center; gap: 10px; margin-top: 10px;
  .ma-btn {
    flex: 0 0 auto; width: 32px; height: 32px; display: inline-grid; place-items: center;
    border: 1px solid var(--hairline-strong); border-radius: 9px;
    background: rgba(77, 168, 255, 0.07); color: var(--blue); cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
    &:hover { background: rgba(77, 168, 255, 0.16); color: #9fd0ff; }
  }
  .ma-seek { flex: 1; min-width: 0; height: 22px; cursor: pointer; }
  .ma-pct { flex: 0 0 auto; width: 40px; text-align: right; font-size: 14px; color: var(--text-3); }
}

.ma-legend {
  display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; list-style: none;
  li { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; color: var(--text-2);
    i { width: 14px; height: 3px; border-radius: 2px; }
  }
}

.ma-basis, .ma-note {
  margin-top: 8px; font-size: 14px; color: var(--text-2); line-height: 1.72;
  i { display: inline-block; min-width: 34px; margin-right: 8px; font-style: normal; color: var(--blue); font-size: 14px; }
}
.ma-note i { color: var(--cyan); }

@media (max-width: 767px) {
  .micro-anim { padding: 14px; }
  .ma-head b { font-size: 16px; }
  .ma-stage { aspect-ratio: auto; height: 280px; }
  /* ⚠️ 必须写成 `.ma-bar .ma-btn` 两层：上面 `.ma-bar { .ma-btn {} }` 编译后是
     `.ma-bar .ma-btn[data-v-x]`（三层），这里若只写 `.ma-btn[data-v-x]` 特异性更低，
     覆盖会**静默失效** —— 实测触摸目标仍是 32×32，被 audit-mobile 抓出来过一次。 */
  .ma-bar {
    .ma-btn { width: 44px; height: 44px; }
    .ma-seek { height: 44px; }
  }
  .ma-basis, .ma-note { font-size: 14px; }
}
</style>
