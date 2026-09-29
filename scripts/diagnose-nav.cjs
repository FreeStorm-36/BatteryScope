/* 导航诊断：真实鼠标点击顶部导航，同时监控 network 失败 / HTTP>=400 / console 异常 */
const { spawn } = require('child_process')
const http = require('http')

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9340
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:5188/'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
})

const child = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '/edgenavdiag',
  '--window-size=1600,1100', '--hide-scrollbars', 'about:blank'
], { stdio: 'ignore' })

const netFail = []
const httpErr = []
const jsErr = []
const conErr = []

;(async () => {
  let list = null
  for (let i = 0; i < 60; i++) {
    try { list = await get(`http://127.0.0.1:${PORT}/json/list`); if (list?.some((t) => t.type === 'page')) break } catch {}
    await sleep(500)
  }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0; const pending = new Map()
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return }
    if (m.method === 'Network.loadingFailed') {
      netFail.push(`${m.params.type} ${m.params.errorText} ${m.params.blockedReason || ''}`)
    } else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      httpErr.push(`${m.params.response.status} ${m.params.response.url}`)
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      jsErr.push(d.exception?.description || d.text)
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      conErr.push(m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '))
    }
  }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    return r.result?.result?.value
  }

  await send('Network.enable')
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })

  console.log('BASE =', BASE)
  await send('Page.navigate', { url: BASE + '#/' })
  await sleep(8000)

  const boot = await ev(`JSON.stringify({
    hash: location.hash,
    h2: (document.querySelector('h2')||{}).textContent || null,
    appHTML: (document.getElementById('app')||{}).childElementCount,
    canvas: !!document.querySelector('.three-box canvas'),
    navLinks: [...document.querySelectorAll('a[href^="#/"]')].map(a=>a.getAttribute('href'))
  })`)
  console.log('启动状态 =', boot)
  console.log('主包加载期 network 失败 =', netFail.length, netFail.slice(0, 5))
  console.log('主包加载期 HTTP>=400 =', httpErr.length, httpErr.slice(0, 5))
  console.log('主包加载期 JS 异常 =', jsErr.length, jsErr.slice(0, 3))
  console.log('主包加载期 console.error =', conErr.length, conErr.slice(0, 3))

  console.log('\n=== 真实鼠标点击顶部导航 ===')
  const pages = [['#/types', '02'], ['#/principle', '03'], ['#/aging', '04'], ['#/datalab', '05'], ['#/prediction', '06'], ['#/ending', '07'], ['#/', '01']]
  let bad = 0
  for (const [hash] of pages) {
    const pos = JSON.parse(await ev(`(function(){
      var a=[...document.querySelectorAll("a[href='${hash}']")][0];
      if(!a) return 'null';
      var r=a.getBoundingClientRect();
      return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), w:Math.round(r.width), h:Math.round(r.height)});
    })()`))
    if (!pos) { console.log(`MISS  ${hash}  导航项不存在`); bad++; continue }
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pos.x, y: pos.y, button: 'none', clickCount: 0 })
    await sleep(60)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 })
    await sleep(60)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 })
    await sleep(3200)
    const got = await ev('location.hash')
    const h2t = await ev(`(document.querySelector('h2')||{}).textContent || null`)
    const ok = got === hash
    if (!ok) bad++
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${hash.padEnd(12)} -> ${String(got).padEnd(12)} h2=${h2t}  (点击坐标 ${pos.x},${pos.y} ${pos.w}x${pos.h})`)
  }

  console.log('\n=== 全程累计 ===')
  console.log('network 失败 =', netFail.length, netFail.slice(0, 10))
  console.log('HTTP>=400   =', httpErr.length, httpErr.slice(0, 10))
  console.log('JS 异常      =', jsErr.length, jsErr.slice(0, 5))
  console.log('console.err  =', conErr.length, conErr.slice(0, 5))
  console.log(bad === 0 ? '\n>>> 导航全部正常' : `\n>>> 有 ${bad} 页跳转失败`)

  ws.close(); child.kill(); process.exit(0)
})().catch((e) => { console.error('ERROR', e.message); child.kill(); process.exit(1) })
