<template>
  <LifeTrackNav />
  <router-view v-slot="{ Component }">
    <transition name="fade-slide" mode="out-in">
      <component :is="Component" :key="$route.path" />
    </transition>
  </router-view>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import LifeTrackNav from './components/LifeTrackNav.vue'

const route = useRoute()

// 章节切换后强制回到页面顶部：
// 固定导航高约 82px，若残留上一页的滚动位置，章节标题会被导航压住、动画区底部也会被切出视口。
watch(
  () => route.path,
  () => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  },
  { flush: 'post' }
)
</script>

<style lang="scss">
.page {
  max-width: 1240px; margin: 0 auto; padding: 118px 48px 0;
  min-height: calc(100vh - 200px);
}
.page-full {
  max-width: 1320px; margin: 0 auto;
  // 固定导航实际高约 82px，上边距收到 92px：章节内容整体上移，
  // 让「标题 + 动画舞台 + 右侧控制卡」能在一屏内完整落位。
  padding: 92px 48px 0;
  min-height: calc(100vh - 160px);
  box-sizing: border-box;
}
// 手机断点统一用 767px。窄屏顶栏换成"上一章 / 当前章 / 下一章"（高 60px + 进度条 10px），
// 比桌面的 82px 矮，所以这里留 78px 就够 —— 原来写死 82px 会白多出一截空白。
@media (max-width: 767px) {
  .page, .page-full { padding: 78px 20px 0; }
}
</style>
