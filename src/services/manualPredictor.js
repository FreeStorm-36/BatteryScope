/** Two measured capacity points determine an explicit exponential scenario, not a trained model. */
export function estimateManualLife(config) {
  const keys = ['cycles', 'previousCycles', 'nominalCapacity', 'currentCapacity', 'previousCapacity', 'threshold']
  const c = Object.fromEntries(keys.map(key => [key, Number(config[key])]))
  if (keys.some(key => config[key] === '' || config[key] == null || !Number.isFinite(c[key]))) throw new Error('请填写所有参数，且使用有效数字。')
  if (!Number.isInteger(c.cycles) || !Number.isInteger(c.previousCycles) || c.previousCycles < 0 || c.cycles <= c.previousCycles) throw new Error('当前循环数需大于历史循环数，且均为非负整数。')
  if (c.nominalCapacity <= 0 || c.currentCapacity <= 0 || c.previousCapacity <= 0) throw new Error('容量必须大于 0。')
  if (c.currentCapacity > c.nominalCapacity || c.previousCapacity > c.nominalCapacity) throw new Error('测得容量不能超过本次设定的初始容量。')
  if (c.threshold < 60 || c.threshold > 95) throw new Error('寿命阈值请设在 60%–95% 之间。')
  const soh = c.currentCapacity / c.nominalCapacity
  const threshold = c.threshold / 100
  if (soh <= threshold) return { ...c, soh, rate: null, rul: 0, eol: c.cycles, reached: true, curve: [{ cycle: c.cycles, soh }] }
  if (c.currentCapacity >= c.previousCapacity) throw new Error('这两次记录没有容量下降，暂时无法估算剩余寿命。请补充有下降趋势的历史测量。')
  const rate = Math.log(c.currentCapacity / c.previousCapacity) / (c.cycles - c.previousCycles)
  const rul = Math.ceil(Math.log(threshold / soh) / rate)
  if (!Number.isSafeInteger(rul) || rul > 100000) throw new Error('容量变化过小，外推距离过长。请增加测量间隔后重试。')
  const curve = Array.from({length: 61}, (_, i) => { const offset = rul * 1.15 * i / 60; return {cycle: c.cycles + offset, soh: soh * Math.exp(rate * offset)} })
  return { ...c, soh, rate, rul, eol: c.cycles + rul, curve, reached: false }
}
