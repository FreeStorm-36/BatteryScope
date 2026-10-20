import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateManualLife } from '../src/services/manualPredictor.js'
const base = {cycles:80,previousCycles:40,nominalCapacity:2000,currentCapacity:1686,previousCapacity:1850,threshold:80}
test('two measurements produce an exponential threshold crossing',()=>{const r=estimateManualLife(base);assert.equal(r.rul,23);assert.equal(r.eol,103);assert.ok(r.curve.every((p,i,a)=>!i||p.soh<a[i-1].soh));assert.ok(r.curve.at(-1).soh<.8)})
test('cycle age, current capacity and threshold change the estimate',()=>{assert.ok(estimateManualLife({...base,cycles:120}).rul>estimateManualLife(base).rul);assert.ok(estimateManualLife({...base,currentCapacity:1750}).rul>estimateManualLife(base).rul);assert.ok(estimateManualLife({...base,threshold:75}).rul>estimateManualLife(base).rul)})
test('already at the threshold gives zero remaining cycles',()=>{const r=estimateManualLife({...base,currentCapacity:1500});assert.equal(r.rul,0);assert.equal(r.reached,true)})
test('invalid or non-degrading input is rejected',()=>{for(const edit of [{cycles:40},{cycles:80.5},{previousCycles:-1},{nominalCapacity:0},{currentCapacity:2001},{currentCapacity:1900},{threshold:50},{cycles:''},{previousCapacity:NaN}]) assert.throws(()=>estimateManualLife({...base,...edit}))})
