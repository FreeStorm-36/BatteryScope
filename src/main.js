import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './styles/base.scss'

import HomeView from './views/HomeView.vue'

// 首页保留同步加载，其余章节按需加载，降低首次进入时的脚本体积。
const TypesView = () => import('./views/TypesView.vue')
const PrincipleView = () => import('./views/PrincipleView.vue')
const AgingView = () => import('./views/AgingView.vue')
const DataLabView = () => import('./views/DataLabView.vue')
const PredictionView = () => import('./views/PredictionView.vue')
const EndingView = () => import('./views/EndingView.vue')

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
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior() { return { top: 0 } }
})

router.afterEach((to) => {
  document.title = `${to.meta.title} · BatteryScope`
})

createApp(App).use(router).mount('#app')
