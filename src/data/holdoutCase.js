/**
 * 第 07 章留出法回测的**唯一数据入口**（微动画与页面共用同一套口径）
 * ---------------------------------------------------------------
 * 页面 EndingView 与页内微动画都必须走这里，避免"动画里一个数、结果面板里另一个数"
 * 这种最伤可信度的情况。
 *
 * 做法：只把 B0005 前 80 次实测记录交给 predictBatteryLife，
 * 后续记录仅用于回测比对，不参与拟合。
 */

import { loadBattery } from './index.js'
import { predictBatteryLife } from '../services/predictor.js'

export const TRAIN_N = 80

const series = loadBattery('B0005').cycles

export const seriesOf = () => series

let resolved = null

/** 计算一次即缓存。模块被 import 时启动，通常早于用户滚动到该动画。 */
export const holdoutReady = predictBatteryLife({
  history: series.slice(0, TRAIN_N).map((c) => ({ cycle: c.cycle, soh: c.soh }))
}).then((r) => {
  const actualEol = series.find((p) => p.soh <= r.threshold)?.cycle ?? null
  resolved = {
    ...r,
    actualEol,
    absError: actualEol == null || r.eolCycle == null ? null : Math.abs(actualEol - r.eolCycle)
  }
  return resolved
})

export const getHoldout = () => resolved
