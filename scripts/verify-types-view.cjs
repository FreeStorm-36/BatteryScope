/* 结构页视角操作验证：滚轮缩放 / 右键平移 / 左键旋转 / 重置视角 / 拖动不误选 / 单击选中。
   全部用真实 CDP 鼠标事件（含 mouseWheel）。跑完打印每步截图 md5 变化。
   用法：MSYS_NO_PATHCONV=1 SHOT_BASE="http://127.0.0.1:5173/" node scripts/verify-types-view.cjs */
const { spawn, spawnSync } = require('child_process')
const http = require('http')
const crypto = require('crypto')

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = Number(process.env.CDP_PORT || 9342)
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:5173/'

// 结束后必须连子进程一起清掉：只 kill 主进程会留下十几个 headless 渲染进程，
// 攒多之后后续脚本会被拖到超时
function killTree() {
  try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
})

const child = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '/edge-types-view',
  '--window-size=1600,1100', '--hide-scrollbars', 'about:blank'
], { stdio: 'ignore' })

;(async () => {
  let list = null
  for (let i = 0; i < 60; i++) {
    try { list = await get(`http://127.0.0.1:${PORT}/json/list`); if (list?.some((t) => t.type === 'page')) break } catch {}
    await sleep(500)
  }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0; const pending = new Map()
  ws.onmessage = (ev2) => {
    const m = JSON.parse(ev2.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    return r.result?.result?.value
  }
  // 只算指纹、不落盘：本环境对临时 png 的写入次数有配额，而这些验证步骤只需比较画面是否变化。
  // 需要目视的图请用 scripts/shots.cjs 单独截。
  const shot = async () => {
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    return crypto.createHash('md5').update(Buffer.from(s.result.data, 'base64')).digest('hex').slice(0, 8)
  }
  const drag = async (x0, y0, x1, y1, button = 'left', steps = 16) => {
    const buttons = button === 'left' ? 1 : button === 'right' ? 2 : 0
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0, y: y0, button: 'none', clickCount: 0 })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y: y0, button, clickCount: 1 })
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(x0 + (x1 - x0) * i / steps),
        y: Math.round(y0 + (y1 - y0) * i / steps),
        button, buttons
      })
      await sleep(24)
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y: y1, button, clickCount: 1 })
    await sleep(1600)
  }
  const wheel = async (x, y, dy, times = 1) => {
    for (let i = 0; i < times; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy, button: 'none', clickCount: 0 })
      await sleep(130)
    }
    await sleep(900)
  }
  const clickAt = async (x, y) => {
    // buttons 位掩码必须显式给：只发 button 而不发 buttons 时，
    // 部分场景下 Chrome 不会合成 click 事件（导航链接看不出问题，是因为 <a> 靠默认行为改 hash）
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, clickCount: 0 })
    await sleep(80)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
    await sleep(70)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
    await sleep(3000)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: BASE + '#/types' })
  await sleep(9000)

  console.log('=== 探针 ===')
  console.log(await ev(`(function(){
    var c=document.querySelector('.three-box canvas');
    var b=document.querySelector('.three-box');
    var r=b.getBoundingClientRect();
    return JSON.stringify({
      canvas: !!c,
      touchAction: c ? c.style.touchAction : null,
      cursor: getComputedStyle(b).cursor,
      stageBox: [Math.round(r.width), Math.round(r.height)],
      hasResetBtn: !!document.querySelector('.view-reset'),
      hint: (document.querySelector('.view-hint')||{}).textContent || null,
      teardownMovedOut: !document.querySelector('.stage .teardown'),
      teardownVisible: !!document.querySelector('.showcase .teardown')
    });
  })()`))

  const c = JSON.parse(await ev(`(function(){
    var r=document.querySelector('.three-box').getBoundingClientRect();
    return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)});
  })()`))
  const rb = JSON.parse(await ev(`(function(){
    var b=document.querySelector('.view-reset'); var r=b.getBoundingClientRect();
    return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)});
  })()`))

  // 直接从 Vue 组件实例读相机真实数值（dev 模式下 setupState 可访问），
  // 比只比 md5 可靠得多
  const readCam = async () => await ev(`(function(){
    try{
      var el=document.querySelector('.three-box');
      var inst=el && el.__vueParentComponent;
      var s=inst && inst.setupState && inst.setupState.scene;
      if(!s) return 'NO_SCENE';
      return JSON.stringify({
        pos: s.camera.position.toArray().map(function(v){return +v.toFixed(3)}),
        target: s.controls.target.toArray().map(function(v){return +v.toFixed(3)}),
        dist: +s.camera.position.distanceTo(s.controls.target).toFixed(3),
        zoom: +s.camera.zoom.toFixed(3)
      });
    }catch(e){ return 'ERR:'+e.message }
  })()`)

  const hBase = await shot('base')
  console.log('\nbaseline (md5)     =', hBase)
  console.log('baseline 相机      =', await readCam())

  console.log('\n=== ① 滚轮缩放 ===')
  await wheel(c.x, c.y, -120, 3)
  const hZoom = await shot('zoom-in')
  console.log('放大 3 格          =', hZoom, hZoom === hBase ? '✗ 画面未变' : '✓ 已变化')
  console.log('页面 scrollY       =', await ev('Math.round(scrollY)'), '（应为 0：滚轮被 3D 接住，不带动页面滚动）')
  await wheel(c.x, c.y, 120, 6)
  const hZoomOut = await shot('zoom-out')
  console.log('缩小 6 格          =', hZoomOut, hZoomOut === hZoom ? '✗ 画面未变' : '✓ 已变化')

  console.log('\n=== ② 重置视角按钮 ===')
  console.log('按钮命中测试       =', await ev(`(function(){
    var b=document.querySelector('.view-reset');
    if(!b) return 'NO_BUTTON';
    var r=b.getBoundingClientRect();
    var el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    return JSON.stringify({
      rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
      hit: el ? el.tagName+'.'+String(el.className).slice(0,36) : 'null',
      inside: !!(el && (el===b || b.contains(el)))
    });
  })()`))
  await clickAt(rb.x, rb.y)
  const hReset = await shot('reset')
  console.log('真实点击后         =', hReset, hReset === hBase ? '✓ 回到基线' : '△ 未回到基线')
  console.log('真实点击后相机     =', await readCam())
  await sleep(2200)
  console.log('再等 2.2s 后相机   =', await readCam())
  await ev(`document.querySelector('.view-reset').click()`)
  await sleep(1100)
  const hReset2 = await shot('reset2')
  console.log('JS 直接触发后      =', hReset2, hReset2 === hBase ? '✓ 回到基线' : '△ 未回到基线')
  console.log('JS 触发后相机      =', await readCam())

  console.log('\n=== ③ 右键拖动 = 平移 ===')
  await drag(c.x, c.y, c.x + 220, c.y + 60, 'right')
  const hPan = await shot('pan')
  console.log('平移后             =', hPan, hPan === hReset ? '✗ 画面未变' : '✓ 已变化')

  console.log('\n=== ④ 左键拖动 = 旋转 ===')
  await clickAt(rb.x, rb.y)
  await drag(c.x, c.y, c.x + 300, c.y)
  const hRot = await shot('rotate')
  console.log('旋转后             =', hRot, hRot === hReset ? '✗ 画面未变' : '✓ 已变化')

  console.log('\n=== ⑤ 拖动松手不应误选部件 ===')
  const afterDrag = await ev(`document.querySelector('.part-card') ? 'SELECTED' : 'idle'`)
  console.log('拖动后抽屉状态     =', afterDrag, afterDrag === 'idle' ? '✓' : '✗ 被误选')

  console.log('\n=== ⑥ 单击模型应能选中部件 ===')
  await clickAt(rb.x, rb.y)
  await clickAt(c.x, c.y)
  const afterClick = await ev(`document.querySelector('.part-card') ? document.querySelector('.part-card h4').textContent : 'idle'`)
  console.log('单击后抽屉         =', afterClick, afterClick === 'idle' ? '✗ 没选中（射线没命中？）' : '✓ 已选中')

  ws.close(); killTree(); process.exit(0)
})().catch((e) => { console.error('ERROR', e.message); killTree(); process.exit(1) })
