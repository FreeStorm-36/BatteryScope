<template>
  <!-- 场景就绪前先占住同样的高度，避免加载瞬间把后面的内容顶一下 -->
  <section v-if="!scene" class="ma-skeleton panel" aria-hidden="true"></section>
  <MicroAnim v-else :scene="scene" />
</template>

<script setup>
import { onMounted, shallowRef } from 'vue'
import MicroAnim from './MicroAnim.vue'

/**
 * 按需加载一个微动画场景。
 * 每个场景单独成 chunk：只加载当前页真正用到的那一条，
 * 不至于"打开第 02 章却把七条动画全下载下来"。
 */
const props = defineProps({
  loader: { type: Function, required: true }
})

const scene = shallowRef(null)

onMounted(async () => {
  const mod = await props.loader()
  scene.value = mod?.default ?? mod
})
</script>

<style scoped lang="scss">
.ma-skeleton {
  height: 380px;
  border: 1px dashed var(--hairline);
  background: rgba(77, 168, 255, 0.03);
}
@media (max-width: 767px) {
  .ma-skeleton { height: 300px; }
}
</style>
