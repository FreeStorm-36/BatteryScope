/**
 * 微动画注册表 —— 把"页内科普视频位"改由**本站自制动画**实现的清单
 * ---------------------------------------------------------------
 * 背景：8 个视频位原本都指向"找素材 / 自己录"。但其中有 7 条讲的是**机理**，
 * 机理恰恰是动画比实拍讲得更清楚的（可控、可反复回看、能标注）。
 * 于是这 7 条直接做成页内微动画：
 *   · 版权零风险（完全自制，不涉及第三方素材授权）
 *   · 断网可用（纯前端 Canvas，不依赖任何外部资源）
 *   · 口径可控（关键数字全部来自仓库内的实测数据或已在页面声明的概念设定）
 *
 * ⚠️ 唯一留给"真实影像"的那一条是 `ch02-teardown`：
 *   它要回答的是"实物长什么样"，这正是动画给不了的一层，
 *   因此继续留作实拍位（未就绪时不渲染，页面上不会出现空框）。
 *
 * ⚠️ 若日后拿到了真实视频（例如 NASA/NREL 的同步辐射 X 射线影像），
 *   把它放进 public/media/ 并把 videos.js 里那条改成 status:'ready' + src，
 *   `VideoSlot` 会**优先播放真实视频**，本动画自动让位。二者是互补关系。
 *
 * 新增一条微动画时必须同步：
 *   ① 在 `src/data/learning.js` 的 `provenance` 表里登记依据与口径；
 *   ② 在 `docs/教学视频需求清单.md` 里更新对应条目的状态。
 */

/**
 * 视频位 id → **场景加载函数**（不是场景本身）。
 * 写成 `() => import(...)` 是为了让每个场景单独成 chunk：
 * 打开第 02 章时不该把第 07 章那条动画也下载下来。
 */
export const animations = {
  'ch03-ion-path': () => import('../components/anim/scenes/ionPath.js'),
  'ch03-cccv': () => import('../components/anim/scenes/cccv.js'),
  'ch04-sei': () => import('../components/anim/scenes/sei.js'),
  'ch04-plating': () => import('../components/anim/scenes/plating.js'),
  'ch05-nasa': () => import('../components/anim/scenes/nasaProtocol.js'),
  'ch06-methods': () => import('../components/anim/scenes/methods.js'),
  'ch07-holdout': () => import('../components/anim/scenes/holdout.js')
}

export const animOf = (id) => animations[id] || null

/** 已由自制动画实现的视频位数量（第 08 章与文档引用，避免各处手写数字）。 */
export const animCount = Object.keys(animations).length
