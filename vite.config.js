import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' }
    }
  },
  // ⚠️ dev server 端口必须避开 5188：5188 是 serve-dist.mjs（交付预览）的固定端口。
  // 两者若同端口，Windows 下 0.0.0.0:5188 与 127.0.0.1:5188 会同时监听且轮流命中，
  // 表现为"首页能打开、点导航就 404 跳不动"。这里固定用 vite 惯用的 5173。
  server: { port: 5173, strictPort: true, open: false },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          echarts: ['echarts'],
          vue: ['vue', 'vue-router'],
          gsap: ['gsap']
        }
      }
    }
  }
})
