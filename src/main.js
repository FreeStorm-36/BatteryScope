import { createApp } from 'vue'
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

router.afterEach((to) => {
  document.title = `${to.meta.title} · BatteryScope`
})

createApp(App).use(router).mount('#app')
