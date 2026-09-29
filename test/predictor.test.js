import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { predictBatteryLife, predictRUL, predictSOH } from '../src/services/predictor.js'

async function battery(id) {
  const text = await readFile(new URL(`../src/data/nasa/${id}.json`, import.meta.url), 'utf8')
  return JSON.parse(text)
}

test('B0005 前 80 条记录可得到自洽且可回测的预测', async () => {
  const data = await battery('B0005')
  const history = data.cycles.slice(0, 80)
  const result = await predictBatteryLife({ history })
  const observedEol = data.cycles.find((point) => point.soh <= 0.8).cycle

  assert.equal(result.status, 'baseline')
  assert.equal(result.rul, result.eolCycle - history.at(-1).cycle)
  assert.ok(Math.abs(result.eolCycle - observedEol) <= 15)
  assert.ok(result.eolInterval[0] <= result.eolCycle)
  assert.ok(result.eolInterval[1] >= result.eolCycle)
  assert.ok(result.sohForecast.every((point, index, rows) => index === 0 || point.mean <= rows[index - 1].mean))
})

test('脏行和重复循环会被记录并清理', async () => {
  const history = Array.from({ length: 12 }, (_, index) => ({ cycle: index + 1, soh: 1 - index * 0.01 }))
  history.push({ cycle: 8, soh: 0.925 }, { cycle: 'bad', soh: 0.9 })
  const result = await predictBatteryLife({ history })
  assert.equal(result.dataQuality.removedRows, 1)
  assert.equal(result.dataQuality.duplicateRows, 1)
  assert.equal(result.dataQuality.validRows, 12)
})

test('历史已越过阈值时 RUL 不会为负数', async () => {
  const history = Array.from({ length: 16 }, (_, index) => ({ cycle: index + 1, soh: 0.94 - index * 0.012 }))
  const result = await predictBatteryLife({ history })
  assert.equal(result.rul, 0)
  assert.ok(result.eolCycle <= history.at(-1).cycle)
})

test('兼容接口与主接口同源', async () => {
  const history = Array.from({ length: 20 }, (_, index) => ({ cycle: index + 1, soh: 1 - index * 0.004 }))
  const soh = await predictSOH(history)
  const rul = await predictRUL(history)
  assert.ok(soh.length > 10)
  assert.ok(Number.isInteger(rul.rul))
  assert.equal(rul.interval.length, 2)
})

test('过短历史和无下降趋势会明确报错', async () => {
  await assert.rejects(() => predictBatteryLife({ history: [{ cycle: 1, soh: 1 }] }), /至少需要/)
  const flat = Array.from({ length: 10 }, (_, index) => ({ cycle: index + 1, soh: 0.95 }))
  await assert.rejects(() => predictBatteryLife({ history: flat }), /没有可辨识的下降趋势/)
})

