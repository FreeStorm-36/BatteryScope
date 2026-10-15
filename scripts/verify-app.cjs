/* 全站逐页体检（对着构建产物跑，验证交付版本本身）。
 *
 * 每个页面检查四件事：
 *   ① 路由真的跳过去了，且标题不为空；
 *   ② 没有横向溢出（README 人工验收第 9 条要求 1440×900 / 1920×1080 都无横向滚动）；
 *   ③ 页面关键元素都在（3D 画布、图表容器、主要控件）；
 *   ④ 该页停留期间没有 JS 异常、没有 404（favicon 除外）、没有 console.error。
 *
 * 用法：MSYS_NO_PATHCONV=1 SHOT_BASE="http://127.0.0.1:5188/" node scripts/verify-app.cjs
 *      再加 VIEWPORT=1440x900 可换分辨率复查。
 */
const { spawn, spawnSync } = require('child_process')
const fs = require('fs')
const http = require('http')

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = Number(process.env.CDP_PORT || 9338)
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:5188/'
// 可选：设了 SHOT_OUT 就顺带把每页存一张图，便于数值之外再目视复核
const OUT = process.env.SHOT_OUT || ''
const [VW, VH] = (process.env.VIEWPORT || '1600x1100').split('x').map(Number)

const PAGES = [
  { hash: '#/', label: '01 首页', need: ['.home', 'canvas'] },
  { hash: '#/types', label: '02 结构', need: ['.showcase', '.three-box canvas', '.teardown', '.view-reset'] },
  { hash: '#/principle', label: '03 工作', need: ['.bench', '.three-box canvas', '.timeline', '.view-reset'] },
  { hash: '#/aging', label: '04 老化', need: ['.obs', '.three-box canvas', '.ctrl-tower', '.view-reset'] },
  { hash: '#/datalab', label: '05 数据', need: ['.datalab', 'canvas'] },
  { hash: '#/prediction', label: '06 模型', need: ['.quiz', '.route-tabs', 'canvas'] },
  { hash: '#/ending', label: '07 预测', need: ['.task', '.step', '.run-btn'] },
  // 08 是 2026-10-15 新增的「学习地图与资料来源」章：
  // 知识图谱 / 学习目标 / 自测 / 资料来源 / 可视化溯源 五个区块都要在。
  { hash: '#/learn', label: '08 学习', need: ['.learning', '.kmap', '.goals', '.quizbox', '.dataset', '.prov'] }
]

let child = null
function killTree() {
  if (!child) return
  try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
})

;(async () => {
  child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '/edge-verify-app',
    `--window-size=${VW},${VH}`, '--hide-scrollbars', 'about:blank'
  ], { stdio: 'ignore' })

  let list = null
  for (let i = 0; i < 60; i++) {
    try { list = await get(`http://127.0.0.1:${PORT}/json/list`); if (list?.some((t) => t.type === 'page')) break } catch {}
    await sleep(500)
  }
  if (!list) throw new Error('无法连接调试端口 ' + PORT)

  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  let problems = []
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return }
    if (m.method === 'Runtime.exceptionThrown') problems.push('JS 异常: ' + (m.params?.exceptionDetails?.exception?.description || '').split('\n')[0])
    if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') {
      const e = m.params.entry
      // favicon 的 404 在 Log 里文本是通用的 "Failed to load resource"，URL 在 entry.url 上，
      // 两个字段都要看，否则过滤不掉
      const t = (e.text || '') + ' ' + (e.url || '')
      if (!/favicon\.ico|favicon/i.test(t)) problems.push('console.error: ' + (e.text || '').slice(0, 120) + (e.url ? ' @' + e.url : ''))
    }
    if (m.method === 'Network.responseReceived' && m.params?.response?.status >= 400 && !/favicon/.test(m.params.response.url)) {
      problems.push(`HTTP ${m.params.response.status} ${m.params.response.url}`)
    }
  }
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    return r.result?.result?.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false })

  console.log(`基线地址 = ${BASE}`)
  console.log(`视口     = ${VW} × ${VH}\n`)

  let failed = 0
  for (const p of PAGES) {
    problems = []
    // 每次都用 Page.navigate 做整页加载：headless 下同会话第二次导航偶发被忽略，
    // 所以这里显式等 hash 落到目标值再判定
    await send('Page.navigate', { url: BASE + p.hash })
    await sleep(7000)

    const info = JSON.parse(await ev(`(function(){
      var de=document.documentElement;
      var miss=[]; ${JSON.stringify(p.need)}.forEach(function(s){ if(!document.querySelector(s)) miss.push(s); });
      // html 上写着 overflow-x: clip，它会把 scrollWidth 报成"裁剪后"的值，
      // 于是真实的横向溢出量会被掩盖成 0。这里临时解除 clip 量一次真实值，再复原。
      var keep = de.style.overflowX;
      de.style.overflowX = 'auto';
      var rawOverflow = de.scrollWidth - de.clientWidth;
      de.style.overflowX = keep;
      // 底部 6px 处命中的元素：用来判断页面底部那条横条是内容还是浏览器滚动条
      var b=document.elementFromPoint(Math.round(innerWidth/2), innerHeight-6);
      // 超宽元素点名，便于定位
      var over=[]; document.querySelectorAll('body *').forEach(function(n){
        var r=n.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.right > innerWidth + 1 || r.left < -1) {
          if (over.length < 6) over.push((n.tagName.toLowerCase()+(typeof n.className==='string'&&n.className?'.'+n.className.split(' ')[0]:''))
            + '[' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
        }
      });
      return JSON.stringify({
        hash: location.hash,
        h2: (document.querySelector('h2')||{}).textContent || '',
        overflowX: de.scrollWidth - de.clientWidth,
        rawOverflow: rawOverflow,
        // 命名按"被挤掉的是哪一边"来定：横向滚动条会吃掉高度，竖向滚动条会吃掉宽度
        hbar: innerHeight - de.clientHeight,
        vbar: innerWidth - de.clientWidth,
        scrollH: de.scrollHeight,
        miss: miss,
        canvas: document.querySelectorAll('canvas').length,
        bottomEl: b ? (b.tagName.toLowerCase() + (typeof b.className==='string'&&b.className?'.'+b.className.split(' ')[0]:'')) : 'null',
        over: over
      });
    })()`))

    const hashOk = info.hash === p.hash
    const titleOk = (info.h2 || '').length > 2
    // 注意 overflowX 会被 html{overflow-x:clip} 掩盖（clip 下 scrollWidth 报的是裁剪后的值），
    // 所以以 rawOverflow（临时解除 clip 量到的真实值）为准，横条存在与否作为旁证
    const overflowOk = info.rawOverflow <= 1 && info.hbar <= 0
    const needOk = info.miss.length === 0
    const clean = problems.length === 0
    const ok = hashOk && titleOk && overflowOk && needOk && clean
    if (!ok) failed++

    console.log(`${ok ? '✓' : '✗'} ${p.label.padEnd(8)} ${p.hash.padEnd(12)} h2="${info.h2.slice(0, 22)}"`)
    console.log(`     内容高 ${info.scrollH} · 真实横向溢出 ${info.rawOverflow} · 横向滚动条 ${info.hbar} · 竖向滚动条 ${info.vbar} · 底部元素 ${info.bottomEl}`)
    if (info.over && info.over.length) console.log('     超宽元素：' + info.over.join('  '))

    if (OUT) {
      const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      const name = p.hash === '#/' ? 'home' : p.hash.replace('#/', '')
      fs.writeFileSync(`${OUT}${name}.png`, Buffer.from(s.result.data, 'base64'))
    }
    if (!hashOk) console.log(`     路由未跳转：期望 ${p.hash}，实际 ${info.hash}`)
    if (!titleOk) console.log('     标题为空')
    if (!overflowOk) console.log(`     横向溢出 ${info.overflowX}px`)
    if (!needOk) console.log('     缺元素：' + info.miss.join(', '))
    if (!clean) console.log('     ' + problems.join('\n     '))
  }

  console.log(`\n${failed === 0 ? `✓ ${PAGES.length} 页全部通过` : `✗ ${failed} 页存在问题`}`)
  ws.close(); killTree(); process.exit(failed ? 1 : 0)
})().catch((e) => { console.error('ERROR', e.message); killTree(); process.exit(1) })
