<template>
  <svg
    class="robot-face"
    :class="'mood-' + mood"
    :style="{ width: size + 'px', height: size + 'px' }"
    viewBox="0 0 64 64"
    aria-hidden="true"
  >
    <!-- 天线 + 灯泡：灯泡颜色随心情切换，think 时会脉冲 -->
    <line class="rf-antenna" x1="32" y1="13.5" x2="32" y2="7.4" />
    <circle class="rf-bulb" cx="32" cy="4.6" r="3.2" />
    <!-- 耳 -->
    <rect class="rf-ear" x="5" y="26" width="4.6" height="12" rx="2.2" />
    <rect class="rf-ear" x="54.4" y="26" width="4.6" height="12" rx="2.2" />
    <!-- 头 + 脸屏 -->
    <rect class="rf-head" x="10" y="12" width="44" height="32" rx="13" />
    <rect class="rf-screen" x="15" y="18" width="34" height="20" rx="8" />
    <!-- 眼睛：happy 换成 ^_^；think 时抬高变小；concern 时缩小 -->
    <g class="rf-eyes">
      <template v-if="mood === 'happy'">
        <path class="rf-eye" d="M21 27.6 Q25 22.9 29 27.6" />
        <path class="rf-eye" d="M35 27.6 Q39 22.9 43 27.6" />
      </template>
      <template v-else>
        <circle class="rf-eye" cx="25" :cy="mood === 'think' ? 25.6 : 27.2" :r="mood === 'concern' ? 2.9 : 3.4" />
        <circle class="rf-eye" cx="39" :cy="mood === 'think' ? 25.6 : 27.2" :r="mood === 'concern' ? 2.9 : 3.4" />
      </template>
    </g>
    <!-- 嘴 -->
    <path v-if="mood === 'happy'" class="rf-mouth rf-mouth-fill" d="M26.5 33 Q32 39.5 37.5 33 Z" />
    <path v-else-if="mood === 'concern'" class="rf-mouth" d="M26.5 35.4 Q32 32.7 37.5 35.4" />
    <circle v-else-if="mood === 'think'" class="rf-mouth" cx="32" cy="34.2" r="1.9" />
    <path v-else class="rf-mouth" d="M26.5 33.4 Q32 37.4 37.5 33.4" />
    <!-- 身体 + 胸灯 -->
    <rect class="rf-body" x="19" y="45.5" width="26" height="11" rx="5" />
    <circle class="rf-chest" cx="32" cy="51" r="2.4" />
  </svg>
</template>

<script setup>
defineProps({
  mood: { type: String, default: 'idle' },   // idle | happy | concern | think
  size: { type: Number, default: 40 }
})
</script>

<style scoped lang="scss">
.robot-face { display: block; overflow: visible; transition: transform 0.3s ease; }
.mood-concern { transform: rotate(-4deg); }
.mood-happy { transform: translateY(-1px); }

.rf-antenna { stroke: #64748b; stroke-width: 2; stroke-linecap: round; }
.rf-bulb { fill: var(--cyan); filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.9)); }
.rf-ear { fill: #2a3a58; }
.rf-head { fill: #22304d; stroke: rgba(120, 180, 255, 0.35); stroke-width: 1; }
.rf-screen { fill: #0b1120; }
.rf-body { fill: #1b2740; stroke: rgba(120, 180, 255, 0.22); stroke-width: 1; }
.rf-eye { fill: var(--cyan); filter: drop-shadow(0 0 3px rgba(34, 211, 238, 0.85)); }
.rf-mouth { fill: none; stroke: var(--cyan); stroke-width: 1.8; stroke-linecap: round; opacity: 0.9; }
.rf-mouth-fill { fill: rgba(34, 211, 238, 0.25); }
.rf-chest { fill: var(--green); filter: drop-shadow(0 0 3px rgba(52, 211, 153, 0.8)); }

/* happy：灯泡转绿、眼睛也是笑脸弧线 */
.mood-happy {
  .rf-bulb { fill: var(--green); filter: drop-shadow(0 0 5px rgba(52, 211, 153, 0.95)); }
  .rf-eye { stroke: var(--green); stroke-width: 2.2; filter: none; }
  .rf-mouth, .rf-mouth-fill { stroke: var(--green); }
}
/* concern：灯泡转琥珀、机身微侧 */
.mood-concern {
  .rf-bulb { fill: var(--amber); filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.9)); }
  .rf-eye { fill: var(--amber); filter: none; }
  .rf-mouth { stroke: var(--amber); }
}
/* think：灯泡脉冲，眼睛抬起 */
.mood-think {
  .rf-bulb { fill: var(--amber); animation: rf-pulse 0.9s ease-in-out infinite; }
  .rf-eye { fill: #a5f3fc; }
}
@keyframes rf-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }

/* 眨眼：整组眼睛纵向缩放，4.6s 一轮 */
.rf-eyes { transform-box: fill-box; transform-origin: center; animation: rf-blink 4.6s ease-in-out infinite; }
@keyframes rf-blink {
  0%, 91%, 100% { transform: scaleY(1); }
  94.5% { transform: scaleY(0.12); }
}

@media (prefers-reduced-motion: reduce) {
  .rf-eyes, .rf-bulb { animation: none; }
  .robot-face { transition: none; }
}
</style>
