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
  server: { port: 5188, open: false },
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
