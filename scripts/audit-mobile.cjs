// 移动端体检：在真实手机视口下逐页量布局、溢出、触摸目标与 3D 取景，并出图。
//   node scripts/audit-mobile.cjs [name=hash ...]
// 环境变量：MW/MH 视口 CSS 像素（默认 393x852，iPhone 15 一类），MDPR 设备像素比（默认 2），
//           SHOT_BASE 站点地址，SHOT_OUT 输出前缀。
// 为什么要单独一个脚本：桌面 1600x1100 下"通过"不代表手机上没问题 —— 手机竖屏的
// 可用宽度只有 393px，横向排布的控件、固定 px 的舞台高度、以及 Three.js 的
// 垂直 fov（竖屏下水平视野会被压窄）都会暴露桌面看不出的问题。
const { spawn, spawnSync } = require('child_process')
const fs = require('fs')
const http = require('http')
const path = require('path')
const { mkProfile, dropProfile, dropProfileSync, sweepStale } = require('./_profile.cjs')

let child = null
let profile = null
function killTree() {
  if (!child) return
  try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }
  child = null
}

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:5188/'
const OUT = process.env.SHOT_OUT || path.join(__dirname, '..', '.mobile', 'v-')
const VW = Number(process.env.MW || 393)
const VH = Number(process.env.MH || 852)
const DPR = Number(process.env.MDPR || 2)
const WAIT = Number(process.env.SHOT_WAIT || 7000)

const args = process.argv.slice(2)
const PAGES = args.length
  ? args.map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)] })
  : [['home', '#/']]

fs.mkdirSync(path.dirname(OUT), { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
})

// 页面侧探针：一次把布局体检要用的量全取回来
const PROBE = `(function(){
  var de=document.documentElement, out={};
  out.vw=innerWidth; out.vh=innerHeight;
  // 真实横向溢出。html{overflow-x:clip} 会把 scrollWidth 报成"裁剪后"的值，
  // 直接读会得到 0 的假象 —— 必须临时解除再量，量完复原。
  var prev=de.style.overflowX; de.style.overflowX='auto';
  out.scrollW=de.scrollWidth; de.style.overflowX=prev;
  out.overflowX=out.scrollW-de.clientWidth;
  out.docH=de.scrollHeight;
  // 谁比视口宽
  var over=[];
  document.querySelectorAll('body *').forEach(function(n){
    var r=n.getBoundingClientRect();
    if(!r.width&&!r.height) return;
    if(r.right>innerWidth+1||r.left<-1){
      if(over.length<8) over.push((n.tagName.toLowerCase()+(typeof n.className==='string'&&n.className?'.'+n.className.trim().split(/\\s+/)[0]:''))+'['+Math.round(r.left)+'→'+Math.round(r.right)+']');
    }
  });
  out.over=over;
  // 触摸目标：iOS HIG 推荐的可点区域下限是 44x44 CSS px
  var small=[];
  document.querySelectorAll('button,a,[role=button],input,select,label').forEach(function(n){
    var r=n.getBoundingClientRect();
    if(!r.width&&!r.height) return;
    // checkbox / radio 本身很小，真正决定可点范围的是包住它的 label —— 量元素本身没意义
    if(n.tagName==='INPUT'&&(n.type==='checkbox'||n.type==='radio')){
      var lb=n.closest('label');
      if(lb){ var lr=lb.getBoundingClientRect(); if(!lr.width&&!lr.height) return; r=lr }
    }
    if(r.bottom<-100||r.top>innerHeight*8) return;
    if(r.width<44||r.height<44){
      var t=(n.textContent||'').replace(/\\s+/g,' ').trim().slice(0,14)||n.tagName.toLowerCase();
      if(small.length<12) small.push(t+' '+Math.round(r.width)+'x'+Math.round(r.height));
    }
  });
  out.small=small;
  // 过小字号（手机上小于 12px 基本没法读）。
  // 必须滤掉尺寸为 0 的元素 —— display:none 的桌面版顶栏 rect 全是 0，
  // 只按"在视口下方"过滤会把它们当成可见文字报出来（首页曾因此误报 9/10.5px）。
  var tiny=[];
  document.querySelectorAll('body *').forEach(function(n){
    if(!n.firstChild||n.firstChild.nodeType!==3) return;
    var t=(n.textContent||'').trim(); if(!t) return;
    var r=n.getBoundingClientRect();
    if(!r.width&&!r.height) return;
    if(r.bottom<-100||r.top>innerHeight*8) return;
    var f=parseFloat(getComputedStyle(n).fontSize);
    if(f<11&&tiny.length<10) tiny.push((Math.round(f*10)/10)+'px "'+t.slice(0,12)+'"');
  });
  out.tiny=tiny;
  // 3D 画布要指名 .three-box 里的那块。首页另有一张 position:fixed;inset:0 的
  // 背景粒子 canvas（.bg-canvas），尺寸恒等于视口，用 querySelector('canvas')
  // 会先命中它，量出来的"画布尺寸"就成了视口尺寸，纯属误报。
  var c=document.querySelector('.three-box canvas')||document.querySelector('.stage canvas')||document.querySelector('.observation-stage canvas');
  out.canvas=c?[Math.round(c.getBoundingClientRect().width),Math.round(c.getBoundingClientRect().height)]:null;
  var st=document.querySelector('.stage,.observation-stage');
  out.stage=st?[Math.round(st.getBoundingClientRect().width),Math.round(st.getBoundingClientRect().height)]:null;
  var g=document.querySelector('.showcase,.obs,.bench,.labA,.sandbox,.hero,.task');
  out.mainGrid=g?getComputedStyle(g).gridTemplateColumns:'';
  out.hash=location.hash;
  out.h2=(document.querySelector('h2')||{}).textContent||'';
  // 顶栏几何：窄屏下品牌 / 章节 / 计数三段是否互相侵占
  function box(s){ var e=document.querySelector(s); if(!e) return null; var r=e.getBoundingClientRect();
    return { l:Math.round(r.left), r:Math.round(r.right), w:Math.round(r.width) }; }
  out.nav={ row:box('.nav-row'), brand:box('.brand'), links:box('.chapter-links'), status:box('.nav-status') };
  var lk=document.querySelector('.chapter-links');
  if(lk){ out.nav.linksScrollW=lk.scrollWidth; out.nav.linksClientW=lk.clientWidth; }
  // 窄屏翻页式顶栏（<768px 接管）。三段必须依次排开、互不重叠、且都在视口内。
  var cp=document.querySelector('.nav-compact');
  if(cp){
    var cr=cp.getBoundingClientRect();
    out.compact={ w:Math.round(cr.width), h:Math.round(cr.height),
      prev:box('.nav-compact .nc-edge:not(.is-empty)'),
      now:box('.nc-current'),
      edges:[].map.call(cp.querySelectorAll('.nc-edge'), function(e){ var r=e.getBoundingClientRect(); return Math.round(r.left)+'→'+Math.round(r.right); }),
      sheet: !!document.querySelector('.chapter-sheet')
    };
  }
  return JSON.stringify(out);
})()`

async function audit(name, hash, port) {
  // profile 收尾必须删掉（每个约 80—100 MB，且名字带时间戳、不会被复用）。
  // 不删会逐轮往系统盘堆，最终整个工具链因 ENOSPC 瘫痪 —— 详见 scripts/_profile.cjs。
  profile = mkProfile('mob-' + port + '-')
  child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
    `--window-size=${VW},${VH}`, '--hide-scrollbars',
    `${BASE}?m=${name}#` + hash.replace(/^#/, '')
  ], { stdio: 'ignore' })

  let list = null
  for (let i = 0; i < 80; i++) {
    try { list = await get(`http://127.0.0.1:${port}/json/list`); if (list?.some((t) => t.type === 'page')) break } catch (e) { /* retry */ }
    await sleep(400)
  }
  if (!list) { killTree(); dropProfileSync(profile); profile = null; throw new Error('无法连接调试端口 ' + port) }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

  await send('Page.enable')
  await send('Runtime.enable')
  // mobile:true 才会让 viewport meta 按设备语义生效（否则按桌面布局视口算）
  await send('Emulation.setDeviceMetricsOverride', {
    width: VW, height: VH, deviceScaleFactor: DPR, mobile: true
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await sleep(WAIT)

  const r = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true })
  const info = JSON.parse(r.result?.result?.value || '{}')

  // 首屏图
  const shot = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: VW, height: VH - 8, scale: 1 }
  })
  fs.writeFileSync(OUT + name + '.png', Buffer.from(shot.result.data, 'base64'))

  // 整页长图（缩到高度 ≤1500，方便一眼看完整页的排布）
  const docH = info.docH || VH
  const scale = Math.min(1, 1500 / docH)
  const full = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: VW, height: docH, scale }
  })
  fs.writeFileSync(OUT + name + '-full.png', Buffer.from(full.result.data, 'base64'))

  ws.close(); killTree()
  await dropProfile(profile); profile = null
  return info
}

;(async () => {
  sweepStale('mob-')   // 自我修复：顺手清掉历史遗留的 profile 目录
  for (let i = 0; i < PAGES.length; i++) {
    const [name, hash] = PAGES[i]
    const t0 = Date.now()
    const info = await audit(name, hash, 9410 + i)
    console.log(`\n══════ ${name}  (${hash})  ${((Date.now() - t0) / 1000).toFixed(1)}s ══════`)
    console.log(`  视口 ${info.vw}×${info.vh} · 文档高 ${info.docH} · 实际哈希 ${info.hash}`)
    console.log(`  h2 "${(info.h2 || '').slice(0, 26)}"`)
    console.log(`  横向溢出 ${info.overflowX}px ${info.overflowX > 1 ? '✗ 有问题' : '✓'}`)
    if (info.stage) console.log(`  舞台 ${info.stage.join(' × ')}`)
    if (info.canvas) console.log(`  画布 ${info.canvas.join(' × ')} （宽高比 ${(info.canvas[0] / info.canvas[1]).toFixed(2)}）`)
    if (info.mainGrid) console.log(`  主网格列 = ${info.mainGrid}`)
    if (info.nav) {
      const n = info.nav
      const fmt = (b) => (b ? `${b.l}→${b.r} (w${b.w})` : '—')
      console.log(`  顶栏 row    ${fmt(n.row)}`)
      console.log(`       brand   ${fmt(n.brand)}`)
      console.log(`       links   ${fmt(n.links)}   内容宽 ${n.linksScrollW} / 可视宽 ${n.linksClientW}`)
      console.log(`       status  ${fmt(n.status)}`)
      if (n.brand && n.links && n.links.l < n.brand.r) console.log(`       ⚠ 章节导航左边缘(${n.links.l}) 侵入了品牌右边缘(${n.brand.r}) → 视觉重叠`)
    }
    if (info.compact) {
      const c = info.compact
      const now = c.now
      console.log(`  窄屏顶栏 ${c.w}×${c.h}`)
      console.log(`       边界格 ${c.edges.join(' , ')}`)
      console.log(`       当前章 ${now ? `${now.l}→${now.r}` : '—'}`)
      // now 必须夹在两格之间，越界就是又叠上了
      const [l, r] = c.edges
      const bad = l && r && now && (now.l < parseInt(l.split('→')[1]) || now.r > parseInt(r.split('→')[0]))
      console.log(`       ${bad ? '⚠ 当前章与边界格重叠' : '✓ 三格依次排开、无重叠'}`)
    }
    if (info.over?.length) console.log(`  超宽元素:\n      ${info.over.join('\n      ')}`)
    else console.log('  超宽元素: 无 ✓')
    if (info.small?.length) console.log(`  触摸目标 <44px (${info.small.length}):\n      ${info.small.join('\n      ')}`)
    else console.log('  触摸目标: 全部 ≥44px ✓')
    if (info.tiny?.length) console.log(`  过小字号 (${info.tiny.length}):\n      ${info.tiny.join('\n      ')}`)
    else console.log('  过小字号: 无 ✓')
  }
  console.log('\n截图已写入 ' + path.dirname(OUT))
})().catch((e) => { console.error('ERROR', e.message); killTree(); process.exit(1) })
