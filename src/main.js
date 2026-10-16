import { createApp, ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import gsap from 'gsap'
import App from './App.vue'
import './styles/base.scss'

// gsap 默认开启 lagSmoothing：一旦 rAF 间隔超过 500ms（页面被节流、切到后台、
// 或 headless 截图），它会把每帧的时间增量强行钳到 33ms，动画于是推进得极慢，
// 看上去就是"点了没反应"或"入场动画卡在 opacity: 0 的半截状态"。
// 关掉它，让 gsap 老老实实按真实时间推进。
gsap.ticker.lagSmoothing(0)

import HomeView from './views/HomeView.vue'

// 首页保留同步加载，其余章节按需加载，降低首次进入时的脚本体积。
const TypesView = () => import('./views/TypesView.vue')
const PrincipleView = () => import('./views/PrincipleView.vue')
const AgingView = () => import('./views/AgingView.vue')
const DataLabView = () => import('./views/DataLabView.vue')
const PredictionView = () => import('./views/PredictionView.vue')
const EndingView = () => import('./views/EndingView.vue')
const LearningView = () => import('./views/LearningView.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: '进入电池生命实验室', chapter: 1 } },
    { path: '/types', name: 'types', component: TypesView, meta: { title: '电芯展柜', chapter: 2 } },
    { path: '/principle', name: 'principle', component: PrincipleView, meta: { title: '充放电实验台', chapter: 3 } },
    { path: '/aging', name: 'aging', component: AgingView, meta: { title: '老化观测舱', chapter: 4 } },
    { path: '/datalab', name: 'datalab', component: DataLabView, meta: { title: '真实数据实验室', chapter: 5 } },
    { path: '/prediction', name: 'prediction', component: PredictionView, meta: { title: '预测方法实验室', chapter: 6 } },
    { path: '/ending', name: 'ending', component: EndingView, meta: { title: '预测任务', chapter: 7 } },
    { path: '/learn', name: 'learn', component: LearningView, meta: { title: '学习地图与资料来源', chapter: 8 } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior() { return { top: 0 } }
})

// 换章时章节组件是懒加载的：vue-router 会等 chunk 到齐才切换路由，
// 这段时间里旧页面仍然挂在那儿（所以不需要整屏骨架，硬塞一个反而会把已经画好的内容盖掉），
// 但用户完全得不到任何"正在加载"的反馈。这里给一条顶部进度条。
const routeLoading = ref(false)
let loadingTimer = null

router.beforeEach((to, from, next) => {
  if (to.path !== from.path) {
    clearTimeout(loadingTimer)
    // 延迟 150ms 才亮：本机命中缓存时 chunk 是瞬间到位的，
    // 不加延迟会让进度条闪一下，比没有还糟。
    loadingTimer = setTimeout(() => { routeLoading.value = true }, 150)
  }
  next()
})

router.afterEach((to) => {
  document.title = `${to.meta.title} · BatteryScope`
  clearTimeout(loadingTimer)
  routeLoading.value = false
})

// 懒加载 chunk 取不到时（断网、部署漏传资源）也要把进度条收掉，否则它会一直转下去
router.onError(() => {
  clearTimeout(loadingTimer)
  routeLoading.value = false
})

createApp(App).use(router).provide('routeLoading', routeLoading).mount('#app')
