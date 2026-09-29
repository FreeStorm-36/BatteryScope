import * as THREE from 'three'

/* 相机飞行：手写 rAF 插值，刻意不用 gsap。两个原因：
   ① gsap 的 ticker 靠 rAF 驱动，页面被节流（切到后台、headless 截图、主线程忙）时
      会触发 lagSmoothing，把每帧时间增量钳到 33ms，动画于是推进得极慢，
      看上去就是"点了没反应"或"卡在半路"。这里直接用渲染循环自己的 dt，与 3D 同源。
   ② 直接 gsap.to(camera.position) 会与 OrbitControls 打架 —— 它每帧 update() 都用球坐标
      加上未消化的阻尼残留重算相机位置，把刚写进去的值推回去，于是"重置视角回不到原位"。
      所以这里逐帧 lerp 之后紧接着 update()，让两边始终一致。

   三个细看类页面（结构 / 原理 / 老化）共用这一份，避免同一段坑被抄三遍。

   用法：
     const fly = createCameraFly(() => scene)   // scene 由 createLabScene 返回
     fly.flyTo([0, 0.9, 7.2], [0, 0, 0], 0.7)   // 触发一段飞行
     fly.step(dt)                               // 放进渲染循环，每帧调用
*/
export function createCameraFly(getScene) {
  let state = null
  let hooked = null

  /* 用户一上手拖动/滚轮，就立刻放弃程序化的镜头飞行，
     否则控制器和飞行会每帧互抢相机位置，表现为"拖了又被拽回去"。 */
  function ensureHook(c) {
    if (hooked === c) return
    hooked = c
    c.addEventListener('start', () => { state = null })
  }

  function flyTo(pos, target, duration = 0.6) {
    const s = getScene()
    const c = s && s.controls
    if (!c) return
    ensureHook(c)
    // 先清掉未消化的阻尼残留，否则它会在随后每帧继续改变相机
    c.enableDamping = false
    c.update()
    c.enableDamping = true
    state = {
      fromP: s.camera.position.clone(),
      fromT: c.target.clone(),
      toP: new THREE.Vector3(...pos),
      toT: new THREE.Vector3(...target),
      t: 0,
      duration: Math.max(0.001, duration)
    }
  }

  function step(dt) {
    if (!state) return
    const s = getScene()
    const c = s && s.controls
    if (!c) { state = null; return }
    state.t = Math.min(1, state.t + dt / state.duration)
    const t = state.t
    const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // easeInOutQuad
    s.camera.position.lerpVectors(state.fromP, state.toP, k)
    c.target.lerpVectors(state.fromT, state.toT, k)
    c.update()
    if (t >= 1) state = null
  }

  function cancel() { state = null }

  return { flyTo, step, cancel, get flying() { return !!state } }
}
