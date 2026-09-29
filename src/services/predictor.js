// 浏览器端可解释基线：只使用传入的 SOH 历史，不读取未来数据。
// 它不是训练完成的 PINN。后续接入真实 PINN 时可继续沿用本文件的返回结构。

const DEFAULT_THRESHOLD = 0.8
const MIN_POINTS = 8

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) throw new TypeError('history 必须是数组')

  const invalidRows = []
  const byCycle = new Map()
  history.forEach((row, index) => {
    const cycle = Number(row?.cycle)
    const soh = Number(row?.soh)
    if (!Number.isFinite(cycle) || !Number.isFinite(soh) || cycle < 0 || soh <= 0 || soh > 1.2) {
      invalidRows.push(index)
      return
    }
    byCycle.set(cycle, { cycle, soh })
  })

  const clean = [...byCycle.values()].sort((a, b) => a.cycle - b.cycle)
  if (clean.length < MIN_POINTS) {
    throw new RangeError(`至少需要 ${MIN_POINTS} 条有效 SOH 记录，当前为 ${clean.length} 条`)
  }
  return {
    clean,
    quality: {
      inputRows: history.length,
      validRows: clean.length,
      removedRows: invalidRows.length,
      duplicateRows: Math.max(0, history.length - invalidRows.length - clean.length)
    }
  }
}

// Theil–Sen 中位斜率对容量恢复和单次测量尖峰比普通最小二乘更稳健。
function robustSlope(points) {
  const slopes = []
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[j].cycle - points[i].cycle
      if (dx > 0) slopes.push((points[j].soh - points[i].soh) / dx)
    }
  }
  return median(slopes)
}

function interpolateCrossing(series, threshold, key = 'mean') {
  for (let i = 1; i < series.length; i += 1) {
    const a = series[i - 1]
    const b = series[i]
    if (a[key] > threshold && b[key] <= threshold) {
      const ratio = (a[key] - threshold) / Math.max(1e-9, a[key] - b[key])
      return a.cycle + ratio * (b.cycle - a.cycle)
    }
  }
  return null
}

/**
 * 以最近历史的稳健退化率外推 SOH，并用拟合残差给出随预测步长扩展的区间。
 * @param {{history: {cycle:number, soh:number}[], threshold?: number}} input
 */
export async function predictBatteryLife(input = {}) {
  const threshold = Number(input.threshold ?? DEFAULT_THRESHOLD)
  if (!Number.isFinite(threshold) || threshold <= 0.5 || threshold >= 1) {
    throw new RangeError('threshold 必须位于 0.5 与 1 之间')
  }

  const { clean: history, quality } = normalizeHistory(input.history)
  const last = history.at(-1)
  const observedCrossing = history.find((point) => point.soh <= threshold)

  // 最近 60 条兼顾局部退化趋势与抗噪性；短序列则使用全部记录。
  const fitWindow = history.slice(-Math.min(60, history.length))
  const rawSlope = robustSlope(fitWindow)
  if (!Number.isFinite(rawSlope) || rawSlope >= -1e-6) {
    throw new Error('当前历史没有可辨识的下降趋势，无法可靠外推寿命')
  }

  // 用指数衰减保证 SOH 为正且预测段单调下降；斜率仍完全来自输入历史。
  const relativeRate = rawSlope / Math.max(last.soh, 1e-6)
  const intercepts = fitWindow.map((point) => point.soh - rawSlope * point.cycle)
  const intercept = median(intercepts)
  const residuals = fitWindow.map((point) => point.soh - (intercept + rawSlope * point.cycle))
  const residualMedian = median(residuals)
  const robustSigma = Math.max(0.003, 1.4826 * median(residuals.map((value) => Math.abs(value - residualMedian))))

  let estimatedEol = observedCrossing?.cycle ?? null
  if (estimatedEol == null && last.soh > threshold) {
    estimatedEol = last.cycle + Math.log(threshold / last.soh) / relativeRate
  }

  const horizon = Math.max(80, Math.min(320, Math.ceil((estimatedEol ?? last.cycle + 160) - last.cycle + 40)))
  const sohForecast = []
  for (let offset = 0; offset <= horizon; offset += 2) {
    const cycle = last.cycle + offset
    const mean = last.soh * Math.exp(relativeRate * offset)
    const width = 1.96 * robustSigma * Math.sqrt(1 + offset / Math.max(20, fitWindow.length))
    sohForecast.push({
      cycle,
      mean: +Math.max(0.4, mean).toFixed(5),
      lower: +Math.max(0.35, mean - width).toFixed(5),
      upper: +Math.min(1.05, mean + width).toFixed(5)
    })
  }

  const meanCrossing = observedCrossing?.cycle ?? interpolateCrossing(sohForecast, threshold, 'mean')
  const earlyCrossing = observedCrossing?.cycle ?? interpolateCrossing(sohForecast, threshold, 'lower')
  const lateCrossing = observedCrossing?.cycle ?? interpolateCrossing(sohForecast, threshold, 'upper')
  const eolCycle = meanCrossing == null ? null : Math.round(meanCrossing)
  const rul = eolCycle == null ? null : Math.max(0, eolCycle - last.cycle)

  return {
    modelVersion: 'robust-exp-baseline-v1',
    modelLabel: '稳健指数退化基线（非 PINN）',
    method: 'Theil–Sen 稳健斜率 + 单调指数外推 + 残差区间',
    units: { soh: '无量纲', rul: '循环', cycle: '循环' },
    sohForecast,
    threshold,
    eolCycle,
    rul,
    eolInterval: [earlyCrossing, lateCrossing].every(Number.isFinite)
      ? [Math.round(earlyCrossing), Math.round(lateCrossing)]
      : null,
    status: 'baseline',
    dataQuality: quality,
    fit: {
      points: fitWindow.length,
      slopePerCycle: +rawSlope.toFixed(7),
      robustSigma: +robustSigma.toFixed(5)
    },
    error: null
  }
}

export async function predictSOH(history) {
  const result = await predictBatteryLife({ history })
  return result.sohForecast.map((point) => ({ cycle: point.cycle, soh: point.mean }))
}

export async function predictRUL(history) {
  const result = await predictBatteryLife({ history })
  return { rul: result.rul, interval: result.eolInterval, threshold: result.threshold }
}

