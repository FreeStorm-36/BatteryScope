<template>
  <LifeTrackNav />
  <router-view v-slot="{ Component }">
    <transition name="fade-slide" mode="out-in">
      <component :is="Component" :key="$route.path" />
    </transition>
  </router-view>
</template>

<script setup>
import LifeTrackNav from './components/LifeTrackNav.vue'
</script>

<style lang="scss">
.page {
  max-width: 1240px; margin: 0 auto; padding: 118px 48px 0;
  min-height: calc(100vh - 200px);
}
.page-full {
  max-width: 1320px; margin: 0 auto;
  padding: 110px 48px 0;
  min-height: calc(100vh - 160px);
  box-sizing: border-box;
}
@media (max-width: 760px) {
  .page, .page-full { padding: 94px 20px 0; }
}
</style>
