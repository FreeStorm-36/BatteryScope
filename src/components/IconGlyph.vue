<template>
  <svg class="icon-glyph" :style="{ width: `${size}px`, height: `${size}px` }" viewBox="0 0 24 24" aria-hidden="true">
    <path v-if="name === 'play'" d="M8 5v14l11-7z" />
    <path v-else-if="name === 'pause'" d="M8 5v14M16 5v14" />
    <path v-else-if="name === 'reset'" d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 8" />
    <path v-else-if="name === 'step'" d="m6 6 8 6-8 6zM17 6v12" />
    <path v-else-if="name === 'check'" d="m5 12 4 4L19 6" />
    <path v-else-if="name === 'alert'" d="M12 4 3 20h18L12 4Zm0 6v4m0 3v.1" />
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, required: true }, size: { type: Number, default: 16 } })
</script>

<style scoped>
.icon-glyph { display: inline-block; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; vertical-align: -0.18em; }
</style>
