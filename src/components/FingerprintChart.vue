<template>
  <div class="fp">
    <svg viewBox="0 0 600 236" preserveAspectRatio="xMidYMid meet" role="img" aria-label="六种老化机制的相对严重度雷达图，每根轴按机制着色，可点击进入对应机制视图">
      <title>损伤指纹：六种老化机制的相对严重度</title>
      <!-- 网格环 -->
      <circle v-for="r in [0.25, 0.5, 0.75, 1]" :key="r" class="fp-ring" :cx="cx" :cy="cy" :r="R * r" />
      <!-- 机制轴：每根轴用自己的机制色，六种机制不再挤成一团橙 -->
      <line
        v-for="(m, i) in items"
        :key="'ax' + m.key"
        class="fp-axis"
        :x1="cx" :y1="cy"
        :x2="cx + Math.cos(angle(i)) * R * 1.06" :y2="cy + Math.sin(angle(i)) * R * 1.06"
        :stroke="m.color"
      />
      <!-- 数值多边形 -->
      <polygon class="fp-area" :points="polyPoints" />
      <!-- 数据点 -->
      <circle v-for="(v, i) in values" :key="'pt' + i" class="fp-dot" :cx="cx + Math.cos(angle(i)) * R * v" :cy="cy + Math.sin(angle(i)) * R * v" :fill="items[i].color" />
      <!-- 轴标签 -->
      <text
        v-for="(m, i) in items"
        :key="'lb' + m.key"
        class="fp-label"
        :x="labelPos(i).x" :y="labelPos(i).y"
        :text-anchor="labelPos(i).anchor"
        :fill="m.color"
      >{{ m.short }}</text>
      <!-- 点击热区（透明粗线，含键盘可达）。窄屏下线宽不足 44px，
           改为装饰性 —— 窄屏交互走图表下方的机制按钮（≥44px） -->
      <line
        v-for="(m, i) in items"
        :key="'hit' + m.key"
        class="fp-hit"
        :class="{ 'fp-hit-off': narrow }"
        :x1="cx" :y1="cy"
        :x2="cx + Math.cos(angle(i)) * R * 1.06" :y2="cy + Math.sin(angle(i)) * R * 1.06"
        :tabindex="narrow ? null : 0"
        :role="narrow ? 'presentation' : 'button'"
        :aria-label="`进入${m.short}专属视图`"
        @click="$emit('select', m.key)"
        @keydown.enter.prevent="$emit('select', m.key)"
        @keydown.space.prevent="$emit('select', m.key)"
        @mouseenter="$emit('hover', i)"
        @mouseleave="$emit('hover', null)"
        @focus="$emit('hover', i)"
        @blur="$emit('hover', null)"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },   // mechanisms（含 key / short / color）
  values: { type: Array, required: true }   // 与 items 等长的 0—1 相对严重度
})
defineEmits(['select', 'hover'])

// 窄屏（≤767px）时雷达点击热区只有约 9px 宽，达不到 44px 触摸下限，
// 交给她下方的机制按钮；桌面 / 键盘用户仍保留热区与 focus 能力。
const narrow = ref(false)
let mq = null
function sync(e) { narrow.value = e.matches }
onMounted(() => {
  mq = window.matchMedia('(max-width: 767px)')
  narrow.value = mq.matches
  mq.addEventListener('change', sync)
})
onUnmounted(() => { mq?.removeEventListener('change', sync) })

const cx = 300, cy = 120, R = 76
const angle = (i) => (-90 + i * 60) * Math.PI / 180

const polyPoints = computed(() =>
  props.values.map((v, i) => `${(cx + Math.cos(angle(i)) * R * v).toFixed(1)},${(cy + Math.sin(angle(i)) * R * v).toFixed(1)}`).join(' ')
)

// 标签排布：按轴的角度决定对齐方式，避免左右两侧的标签被画布裁掉
function labelPos(i) {
  const a = angle(i)
  const r = R * 1.3
  const x = cx + Math.cos(a) * r
  const y = cy + Math.sin(a) * r
  const c = Math.cos(a)
  return { x, y: y + (Math.sin(a) > 0.9 ? 15 : Math.sin(a) < -0.9 ? -5 : 4), anchor: c > 0.35 ? 'start' : c < -0.35 ? 'end' : 'middle' }
}
</script>

<style scoped lang="scss">
.fp { width: 100%; }
svg { display: block; width: 100%; height: auto; }
/* 描边不随缩放变粗变细：窄屏画布缩小后，1px 网格线不会糊成灰带 */
.fp-ring, .fp-axis, .fp-area { vector-effect: non-scaling-stroke; }
.fp-ring { fill: none; stroke: rgba(77, 168, 255, 0.16); stroke-width: 1; }
.fp-axis { stroke-width: 1.4; opacity: 0.6; }
.fp-area { fill: rgba(245, 158, 11, 0.16); stroke: #f59e0b; stroke-width: 2; stroke-linejoin: round; }
.fp-dot { stroke: rgba(10, 14, 26, 0.9); stroke-width: 1; }
.fp-label { font-size: 13px; }
.fp-hit { stroke: transparent; stroke-width: 15; cursor: pointer; }
.fp-hit:focus-visible { stroke: rgba(34, 211, 238, 0.4); outline: none; }
/* 窄屏：热区退化为装饰图形，不再拦截触摸（避免 <44px 的伪按钮） */
.fp-hit-off { pointer-events: none; }

/* 窄屏：viewBox 被压缩到约 0.54 倍，标签按同倍数放大，保证不低于 12px 可读下限 */
@media (max-width: 767px) {
  .fp-label { font-size: 22px; }
}
</style>
