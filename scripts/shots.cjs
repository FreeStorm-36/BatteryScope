// 临时预览截图：node .shots.cjs [name=hash ...]
// 经验：同一浏览器会话内第二次 Page.navigate 会被忽略（headless 下现象稳定复现），
// 因此每个页面都单独启动一次浏览器，只做一次导航。
const { spawn, spawnSync } = require('child_process')
const fs = require('fs')
const http = require('http')

// 收尾必须连子进程一起清。只 child.kill() 主进程会留下十几个 headless 渲染进程，
// 攒够之后后续脚本会被拖到超时（踩过一次，残留 25 个）。
let child = null
function killTree() {
  if (!child) return
  try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }
}

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:5188/'
const OUT = process.env.SHOT_OUT || 'D:/大创电池寿命/BatteryScope_V3.3.0_需求对照优化版(1)/BatteryScope_交付/.shot-'
const W = 1600
const H = 1100
const WAIT = Number(process.env.SHOT_WAIT || 7000)

const args = process.argv.slice(2)
const PAGES = args.length
  ? args.map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)] })
  : [['home', '#/'], ['types', '#/types']]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
})

async function shoot(name, hash, port) {
  child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
    '--remote-debugging-port=' + port, '--user-data-dir=' + (process.env.TEMP || '.') + '/es-' + port + '-' + Date.now(),
    `--window-size=${W},${H}`, '--hide-scrollbars',
    `${BASE}?p=${name}#` + hash.replace(/^#/, '')
  ], { stdio: 'ignore' })

  let list = null
  for (let i = 0; i < 80; i++) {
    try { list = await get(`http://127.0.0.1:${port}/json/list`); if (list?.some((t) => t.type === 'page')) break } catch (e) {}
    await sleep(400)
  }
  if (!list) { killTree(); child = null; throw new Error('无法连接调试端口 ' + port) }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await sleep(WAIT)
  const scrollY = Number(process.env.SHOT_SCROLL || 0)
  if (scrollY) { await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${scrollY})` }); await sleep(1200) }
  if (process.env.SHOT_JS) {
    await send('Runtime.evaluate', { expression: process.env.SHOT_JS })
    await sleep(Number(process.env.SHOT_JS_WAIT || 2200))
  }
  const r = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({hash: location.hash, h2: (document.querySelector("h2")||{}).textContent, scrollY: Math.round(scrollY)})',
    returnByValue: true
  })
  const info = r.result?.result?.value || '(null)'
  // 裁掉最后 8px：headless 渲染器会在视口最底部画一条滚动条浮层（即使传了
  // --hide-scrollbars），它不属于页面内容（该位置 elementFromPoint 命中的是 #app），
  // 但会出现在截图里。交付用的演示图不该带这条灰边。
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { x: 0, y: scrollY, width: W, height: H - 8, scale: 1 }
  })
  fs.writeFileSync(OUT + name + '.png', Buffer.from(shot.result.data, 'base64'))
  ws.close(); killTree(); child = null
  return info
}

;(async () => {
  let bad = 0
  for (let i = 0; i < PAGES.length; i++) {
    const [name, hash] = PAGES[i]
    const info = await shoot(name, hash, 9400 + i)
    const got = JSON.parse(info).hash
    const ok = got === hash || (hash === '#/' && got === '')
    if (!ok) bad++
    console.log((ok ? 'ok  ' : 'BAD ') + name, '| expect=' + hash, '| got=' + got, '|', info)
  }
  process.exit(bad ? 2 : 0)
})().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
