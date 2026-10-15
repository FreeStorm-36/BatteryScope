// 全局导览 / 章节元信息（轻量 reactive store，不引入 Pinia）
import { reactive, computed } from 'vue'
import { useRoute } from 'vue-router'

// duration 单位是**秒**（各章停留/快速浏览的估算时长）。
// 目录面板的表头会实时把这些值求和后显示成"约 N 分钟"，所以这里改数字不会与表头脱节
// （2026-10-15 新增第 08 章后：八章相加 ≈ 380 秒 ≈ 6 分钟）。
// 目录面板直接显示这个值，别改成"分"——会和表头的"约 5 分钟"差 60 倍。
export const chapters = [
  { n: 1, path: '/', name: '进入电池生命实验室', brief: '认识观察对象 BS-01', subject: 'BS-01 概念标本', duration: 20 },
  { n: 2, path: '/types', name: '电芯展柜', brief: '外形 ≠ 化学体系', subject: 'BS-01 概念标本', duration: 35 },
  { n: 3, path: '/principle', name: '充放电实验台', brief: 'Li⁺ 走内部，e⁻ 走外部', subject: 'BS-01 概念标本', duration: 50 },
  { n: 4, path: '/aging', name: '老化观测舱', brief: '六类损伤如何累积', subject: 'BS-01 概念标本', duration: 65 },
  { n: 5, path: '/datalab', name: '真实数据实验室', brief: 'NASA 曲线与环境趋势', subject: 'NASA B0005 真实数据', duration: 55 },
  { n: 6, path: '/prediction', name: '预测方法实验室', brief: '三类预测方法各有何依据', subject: '方法实验室', duration: 50 },
  { n: 7, path: '/ending', name: '预测任务', brief: '完成一次示例预测流程', subject: 'B0005 示例预测任务', duration: 45 },
  // 第 8 章不是"再讲一块知识"，而是把知识结构、学习目标与全部资料来源摊开——
  // 它同时承担两件事：面向教学的导学页，以及"每一处呈现都有依据"的证据台账。
  { n: 8, path: '/learn', name: '学习地图与资料来源', brief: '知识结构 · 学习目标 · 出处', subject: '教学说明与证据台账', duration: 60 }
]

export const useChapter = () => {
  const route = useRoute()
  return computed(() => chapters[route.meta.chapter - 1] || chapters[0])
}

export const tour = reactive({
  auto: false,        // 自动导览开关
  pageStart: 0,       // 当前页导览开始时间戳
  pageDur: 45,        // 每页停留秒数（可配置）
  chapterIdx: 1
})
