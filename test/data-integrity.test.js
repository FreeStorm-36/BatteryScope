import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const ids = ['B0005', 'B0006', 'B0007', 'B0018']

for (const id of ids) {
  test(`${id} 数据结构、顺序和 SOH 计算一致`, async () => {
    const text = await readFile(new URL(`../src/data/nasa/${id}.json`, import.meta.url), 'utf8')
    const data = JSON.parse(text)
    assert.equal(data.id, id)
    assert.equal(data.meta.nCycles, data.cycles.at(-1).cycle)
    assert.match(data.meta.source, /NASA PCoE/)
    assert.ok(data.cycles.length >= 100)

    for (let index = 0; index < data.cycles.length; index += 1) {
      const point = data.cycles[index]
      if (index > 0) assert.ok(point.cycle > data.cycles[index - 1].cycle)
      assert.ok(point.capacity > 0)
      assert.ok(point.soh > 0 && point.soh <= 1.05)
      // qRef 与逐点 SOH 均保留有限小数，允许由双重舍入引入的 5e-5 误差。
      assert.ok(Math.abs(point.soh - point.capacity / data.meta.qRef) < 0.00005)
    }
  })
}
