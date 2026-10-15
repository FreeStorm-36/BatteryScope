/* 细看类页面（结构 / 原理 / 老化）的视角操作验证。
 *
 * 三页共用同一套交互口径：拖拽旋转 · 滚轮缩放 · 右键平移 · 一键重置视角。
 * 本脚本对每个页面都跑一遍真实 CDP 鼠标/滚轮事件，并从 Vue 组件实例直读相机数值，
 * 判断"到底有没有真的动"——只比截图 md5 会把"画面变了"当成"操作生效"，
 * 而相机停在半路、被 OrbitControls 推回原位这类问题，md5 是分辨不出来的。
 *
 * ⚠️ 读相机数值依赖 el.__vueParentComponent，这是 Vue 的 **开发构建** 才挂的钩子，
 *    所以本脚本必须跑在 dev server（默认 http://127.0.0.1:5173/）上，不能跑构建产物。
 *    目视用的截图请用 scripts/shots.cjs 对着 dist 截。
 *
 * 用法：
 *   MSYS_NO_PATHCONV=1 node scripts/verify-look-views.cjs            # 三页全跑
 *   MSYS_NO_PATHCONV=1 node scripts/verify-look-views.cjs types      # 只跑结构页
 */
const { spawn, spawnSync } = require('child_process')
const http = require('http')
const { dropProfileSync } = require('./_profile.cjs')

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:5173/'

const PAGES = {
  types: {
    hash: '#/types',
    label: '结构页 TypesView',
    // 结构页另有点选部件的行为，一并验证
    selectable: true
  },
  principle: { hash: '#/principle', label: '原理页 PrincipleView' },
  aging: { hash: '#/aging', label: '老化页 AgingView' }
}

let child = null
// 结束后必须连子进程一起清掉：只 kill 主进程会留下十几个 headless 渲染进程，
// 攒够之后后续脚本会被拖到超时（这个坑踩过一次，25 个残留进程）
function killTree() {
  if (!child) return
  try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
})

async function runPage(key, port) {
  const cfg = PAGES[key]
  console.log(`\n${'='.repeat(64)}\n=== ${cfg.label} ===\n${'='.repeat(64)}`)

  // 固定名 profile，先删上一轮那份再启动（详见 scripts/_profile.cjs）
  dropProfileSync(process.env.TEMP + '/edge-look-' + key)
  child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
    '--remote-debugging-port=' + port, '--user-data-dir=' + process.env.TEMP + '/edge-look-' + key,
    '--window-size=1600,1100', '--hide-scrollbars', 'about:blank'
  ], { stdio: 'ignore' })

  let list = null
  for (let i = 0; i < 60; i++) {
    try { list = await get(`http://127.0.0.1:${port}/json/list`); if (list?.some((t) => t.type === 'page')) break } catch {}
    await sleep(500)
  }
  if (!list) throw new Error('无法连接调试端口 ' + port)

  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    return r.result?.result?.value
  }

  const clickAt = async (x, y) => {
    // buttons 位掩码必须显式给：只发 button 不发 buttons 时，部分场景下 Chrome 不合成 click
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, clickCount: 0 })
    await sleep(80)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
    await sleep(70)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
    await sleep(1500)
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
        button, buttons, clickCount: 1
      })
      await sleep(24)
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y: y1, button, buttons: 0, clickCount: 1 })
    await sleep(1400)
  }
  const wheel = async (x, y, dy, times = 1) => {
    for (let i = 0; i < times; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy, button: 'none', clickCount: 0 })
      await sleep(140)
    }
    await sleep(1000)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: BASE + cfg.hash })
  await sleep(9000)

  const readCam = async () => {
    const v = await ev(`(function(){
      try{
        var el=document.querySelector('.three-box');
        var inst=el && el.__vueParentComponent;
        var s=inst && inst.setupState && inst.setupState.scene;
        if(!s) return JSON.stringify({err:'NO_SCENE'});
        return JSON.stringify({
          pos: s.camera.position.toArray().map(function(v){return +v.toFixed(3)}),
          target: s.controls.target.toArray().map(function(v){return +v.toFixed(3)}),
          dist: +s.camera.position.distanceTo(s.controls.target).toFixed(3)
        });
      }catch(e){ return JSON.stringify({err:'ERR:'+e.message}) }
    })()`)
    return JSON.parse(v)
  }

  /* 等镜头停稳，而不是"睡固定毫秒"。
     ⚠️ 这是个必须用的helper：渲染循环里 dt = min(clock.getDelta(), 0.05)，
     headless 软件渲染只有几帧/秒时，每帧只推进 50ms 动画时间，
     一段 0.6s 的飞行会被拉长到 3s 以上。按固定时长等待会把
     "动画还没跑完"误判成"重置失败"。 */
  const same = (a, b, eps = 0.02) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps && Math.abs(a[2] - b[2]) < eps
  const waitSettle = async (label = '') => {
    const t0 = Date.now()
    let prev = await readCam()
    for (let i = 0; i < 60; i++) {
      await sleep(350)
      const cur = await readCam()
      // 阈值放宽到 0.02：阻尼尾巴很长（dampingFactor 0.055），低帧率下
      // 最后那点惯性会拖很久；卡到 0.005 会让脚本白等几十秒
      if (same(prev.pos, cur.pos, 0.02) && same(prev.target, cur.target, 0.02)) {
        if (label) console.log(`   （${label} 停稳，用时 ${Date.now() - t0} ms）`)
        return cur
      }
      prev = cur
    }
    if (label) console.log(`   （${label} 等了 ${Date.now() - t0} ms 仍未停稳）`)
    return prev
  }

  const geo = JSON.parse(await ev(`(function(){
    var b=document.querySelector('.three-box'); var r=b.getBoundingClientRect();
    var rb=document.querySelector('.view-reset'); var rr=rb?rb.getBoundingClientRect():null;
    var desc=function(n){
      var cn = typeof n.className==='string' ? (n.className||'') : '(svg)';
      var q=n.getBoundingClientRect();
      var cs=getComputedStyle(n);
      return n.tagName.toLowerCase()+(cn?'.'+cn.split(' ')[0]:'')
        +' @'+Math.round(q.left)+','+Math.round(q.top)+' '+Math.round(q.width)+'x'+Math.round(q.height)
        +' ['+cs.position+(cs.pointerEvents!=='auto'?' pe:'+cs.pointerEvents:'')+']';
    };
    var ov=[]; document.querySelectorAll('.stage > *').forEach(function(n){
      if(n.classList.contains('three-box')) return;
      ov.push(desc(n));
    });
    var cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
    var hit=document.elementFromPoint(cx, cy); var chain=[];
    for(var n=hit; n && chain.length<4; n=n.parentElement){
      chain.push(n.tagName.toLowerCase()+(typeof n.className==='string'&&n.className?'.'+n.className.split(' ')[0]:''));
    }
    return JSON.stringify({
      cx: cx, cy: cy,
      stage: [Math.round(r.width), Math.round(r.height)],
      rb: rr ? {x:Math.round(rr.left+rr.width/2), y:Math.round(rr.top+rr.height/2)} : null,
      hint: (document.querySelector('.view-hint')||{}).textContent||null,
      overlays: ov,
      centerHit: chain.join(' < ')
    });
  })()`))

  console.log('舞台尺寸           =', geo.stage.join(' × '))
  console.log('操作提示           =', geo.hint)
  console.log('重置按钮           =', geo.rb ? `位于 (${geo.rb.x}, ${geo.rb.y})` : '✗ 找不到 .view-reset')
  console.log('舞台内浮层         =', geo.overlays.join('\n                      ') || '（无）')
  console.log('舞台中心的命中链   =', geo.centerHit)

  const base = await waitSettle('基线')
  console.log('\n--- 基线相机 ---\n', JSON.stringify(base))

  const results = []
  const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`) }

  console.log('\n=== ① 滚轮缩放（必须真的改到相机距离）===')
  await wheel(geo.cx, geo.cy, -120, 4)
  const zoomed = await waitSettle('缩放')
  check('滚轮向上 → 拉近', zoomed.dist < base.dist - 0.3, `dist ${base.dist} → ${zoomed.dist}`)
  console.log('   页面 scrollY =', await ev('Math.round(scrollY)'), '（应为 0：滚轮被 3D 接住，不带动页面滚动）')
  await wheel(geo.cx, geo.cy, 120, 10)
  const zoomedOut = await waitSettle('回退')
  check('滚轮向下 → 推远', zoomedOut.dist > zoomed.dist + 0.3, `dist ${zoomed.dist} → ${zoomedOut.dist}`)

  console.log('\n=== ② 重置视角（必须回到基线，且不能半路停住）===')
  await clickAt(geo.rb.x, geo.rb.y)
  const reset1 = await readCam()
  const reset2 = await waitSettle('重置')
  check('重置后位置回到基线', same(reset2.pos, base.pos) && same(reset2.target, base.target), JSON.stringify(reset2.pos))
  check('重置动画最终停下（未卡在中途）', same(reset2.pos, base.pos, 0.05), `${JSON.stringify(reset1.pos)} → ${JSON.stringify(reset2.pos)}`)

  console.log('\n=== ③ 右键拖动 = 平移（只动 target）===')
  const beforePan = await readCam()
  await drag(geo.cx, geo.cy, geo.cx + 200, geo.cy + 50, 'right')
  const panned = await waitSettle('平移')
  check('平移改变了 target', !same(panned.target, beforePan.target, 0.05), `target ${JSON.stringify(beforePan.target)} → ${JSON.stringify(panned.target)}`)
  await clickAt(geo.rb.x, geo.rb.y)
  await waitSettle('回正')

  console.log('\n=== ④ 左键拖动 = 旋转（动位置、不动 target）===')
  const beforeRot = await readCam()
  await drag(geo.cx, geo.cy, geo.cx + 260, geo.cy - 40)
  const rotated = await waitSettle('旋转')
  check('旋转改变了相机位置', !same(rotated.pos, beforeRot.pos, 0.05), `pos ${JSON.stringify(beforeRot.pos)} → ${JSON.stringify(rotated.pos)}`)
  check('旋转只动位置、不动 target', same(rotated.target, beforeRot.target, 0.08), `target ${JSON.stringify(beforeRot.target)} → ${JSON.stringify(rotated.target)}`)
  await clickAt(geo.rb.x, geo.rb.y)
  const back = await waitSettle('回正')
  check('旋转后仍能一键回正', same(back.pos, base.pos) && same(back.target, base.target), JSON.stringify(back.pos))

  if (cfg.selectable) {
    console.log('\n=== ⑤ 结构页专有：拖动不误选 / 单击能选中 ===')
    console.log('   拖动后抽屉 =', await ev(`document.querySelector('.part-card') ? 'SELECTED' : 'idle'`), '（应为 idle）')
    await clickAt(geo.cx, geo.cy)
    const picked = await ev(`document.querySelector('.part-card') ? document.querySelector('.part-card h4').textContent : 'idle'`)
    check('单击模型选中部件', picked !== 'idle', `抽屉显示「${picked}」`)

    /* 引导线 SVG 的视口必须撑满舞台。
       踩过的坑：<svg> 是替换元素，只写 position:absolute + inset:0 不会把它撑开，
       它会退回 300×150 的固有尺寸；而 updateGuide() 写入的坐标是按舞台像素算的，
       于是整条线落到视口外被裁掉 —— 表现是"选中了部件但看不到引导线"。 */
    const guide = JSON.parse(await ev(`(function(){
      var svg=document.querySelector('.guide-svg');
      var st=document.querySelector('.stage');
      if(!svg||!st) return JSON.stringify({err:'NO_SVG'});
      var s=svg.getBoundingClientRect(), t=st.getBoundingClientRect();
      var ln=svg.querySelector('.guide-line');
      return JSON.stringify({
        svg:[Math.round(s.width),Math.round(s.height)],
        stage:[Math.round(t.width),Math.round(t.height)],
        x2:+ln.getAttribute('x2'), y2:+ln.getAttribute('y2'),
        opacity:getComputedStyle(ln).opacity
      });
    })()`))
    const fits = guide.svg && Math.abs(guide.svg[0] - guide.stage[0]) <= 2 && Math.abs(guide.svg[1] - guide.stage[1]) <= 2
    check('引导线 SVG 视口撑满舞台', fits, `svg ${guide.svg} vs stage ${guide.stage}`)
    check('引导线终点落在视口内（不会被裁）', guide.x2 <= guide.svg[0] && guide.y2 <= guide.svg[1], `终点 (${guide.x2}, ${guide.y2})`)

    await clickAt(geo.rb.x, geo.rb.y)
    const afterDeselect = await waitSettle('取消选中')
    check('返回整体后相机回正', same(afterDeselect.pos, base.pos), JSON.stringify(afterDeselect.pos))
  }

  ws.close()
  killTree()
  child = null

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${cfg.label} 小结：${results.length - failed.length}/${results.length} 通过`)
  return failed
}

;(async () => {
  const only = process.argv[2]
  const keys = only ? [only] : Object.keys(PAGES)
  let port = 9350
  const allFailed = []
  for (const k of keys) {
    if (!PAGES[k]) { console.error('未知页面：' + k); process.exit(2) }
    const f = await runPage(k, port++)
    for (const x of f) allFailed.push(`${k}: ${x.name}`)
  }
  console.log(`\n${'='.repeat(64)}`)
  if (allFailed.length) {
    console.log(`✗ 共 ${allFailed.length} 项未通过：`)
    for (const x of allFailed) console.log('   - ' + x)
    process.exit(1)
  }
  console.log('✓ 三页视角交互全部通过')
  process.exit(0)
})().catch((e) => { console.error('ERROR', e.message); killTree(); process.exit(1) })
