/**
 * 页内科普素材位配置（全站唯一清单）
 * ---------------------------------------------------------------
 * 设计原则：
 *   1. **未就绪的在正式构建里完全不渲染** —— 不让评审看到"待接入"这类字样。
 *      开发态（npm run dev）会显示占位卡片，方便对照位置。
 *   2. 优先**本地自托管**（把 mp4 放进 `public/media/`，构建时自动复制进 dist）。
 *      原因：答辩现场可能断网；外部嵌入还会带来版权与原创性问题。
 *   3. 每个条目都必须写明"必须讲到什么"，避免素材讲得漂亮但知识点没覆盖。
 *
 * ── 2026-10-15 变更：7 条改为「本站自制微动画」 ─────────────────────
 * 原方案是"8 条全部去找素材或自录"。实际过一遍发现，其中 7 条讲的是**机理**，
 * 而机理恰恰是动画比实拍讲得更清楚（可控、可反复回看、能逐帧标注）。
 * 于是这 7 条直接做成本站自制的页内微动画，好处是版权零风险、断网可用、口径可控。
 *   → 见 `src/data/animations.js` 注册表与 `src/components/anim/scenes/`。
 *
 * ⚠️ 唯一保留 **真实影像** 的是 `ch02-teardown`：
 *   它要回答的是"实物长什么样"（钢壳、卷芯、极耳、防爆阀），这是动画给不了的一层，
 *   因此继续留作实拍位。未就绪时不渲染，页面上不会出现空框。
 *
 * ⚠️ 拿到真实视频时怎么办：放进 `public/media/`，把该条改成 status:'ready' 并填 src，
 *   `VideoSlot` 会**优先播放真实视频**，对应的微动画自动让位（例如日后拿到
 *   NASA/NREL 的同步辐射 X 射线影像，可以直接覆盖 `ch04-plating`）。
 *
 * 字段说明：
 *   priority   must / nice / optional —— 参赛取舍用。
 *   produced   'anim' = 已由本站自制微动画实现；'video' = 仍待真实视频素材。
 *   mustCover  对 produced='anim' 的条目而言，这是**动画的验收清单**：
 *              动画里必须把这几点讲全，缺一条就算没做到。
 *
 * 接入真实视频的步骤：① 文件放进 `public/media/`（文件名 = `file` 字段）；
 *   ② `status` 改 `'ready'`；③ 填 `src` / `poster` / `source` / `license`；④ 重新构建。
 *   只改 status 不填 src 也不会渲染 —— 防止交付版里出现空白播放器。
 */

export const videoSlots = [
  // ── 第 02 章 · 电芯展柜 ──────────────────────────────────
  {
    id: 'ch02-teardown',
    chapter: 2,
    page: '/types',
    priority: 'must',
    produced: 'video',
    where: '与"三维展台拆解"配套',
    title: '圆柱电芯拆开看：钢壳、卷芯、极耳与防爆阀',
    duration: '60—90 秒',
    style: '实拍（剖切或拆解）优先，其次高质量三维动画',
    mustCover: [
      '外壳为钢壳，顶部有正极帽与防爆阀（安全阀）结构',
      '内部是正负极与隔膜叠合后卷绕而成的"卷芯"',
      '卷芯叠层顺序：正极 — 隔膜 — 负极 — 隔膜',
      '极耳把卷芯两端引出到外壳与顶盖，隔膜只允许离子通过、阻挡电子'
    ],
    avoid: '不要出现"电池内部是液态锂"这类错误表述；不要展示破坏满电电芯的危险操作。',
    note: '本作品的三维模型是"程序化重建"，真实剖切实拍能补上"实物长什么样"这一层——这是动画给不了的。因此这是 8 条里**唯一保留实拍**的一条。',
    candidates: [
      { label: '自拍 / 自录优先：18650 剖切件或拆解实拍（用放完电的电芯；注意给品牌商标打码；不做穿孔、挤压等危险操作）', url: '', license: '自制 · 完全自有' }
    ],
    status: 'planned',
    file: 'ch02-teardown.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },

  // ── 第 03 章 · 充放电实验台 ──────────────────────────────
  {
    id: 'ch03-ion-path',
    chapter: 3,
    page: '/principle',
    priority: 'optional',
    produced: 'anim',
    where: '与"Li⁺ 与电子双路径"配套',
    title: '锂离子迁移的双路径：离子走内部，电子走外部',
    duration: '约 12 秒 · 充放各一遍',
    style: '本站自制微动画（Canvas）',
    mustCover: [
      '充电：Li⁺ 从正极脱出 → 穿过电解液 → 透过隔膜 → 嵌入负极',
      '同一时刻电子从正极经外电路流向负极',
      '放电：方向反过来，Li⁺ 回正极，电子经外电路回正极',
      '强调"离子走内部、电子走外部"两条并行的路径'
    ],
    avoid: '不要出现"电子穿过隔膜"或"电子在电解液里游动"这类错误表述（电解液与隔膜是电子绝缘体）。',
    note: '第 03 章的三维场景本身能交互，但两条路径在三维里不易同框。这条 2D 剖面把两条路径并排画出来，并在底部常驻写出"电子不穿过隔膜"——正是网上最常见的错处。',
    status: 'planned',
    file: 'ch03-ion-path.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },
  {
    id: 'ch03-cccv',
    chapter: 3,
    page: '/principle',
    priority: 'nice',
    produced: 'anim',
    where: '与"倍率—电压—功率读数"配套',
    title: 'CC-CV 充电：为什么最后要转恒压',
    duration: '约 13 秒 · 单遍',
    style: '本站自制微动画（Canvas）',
    mustCover: [
      '恒流（CC）段：电流恒定，电压随充电推进逐渐上升',
      '到达截止电压（本例 4.2 V）后转恒压（CV）段',
      'CV 段电流逐步衰减，降到设定值时结束充电',
      '恒压段存在的必要性：避免过充，同时尽可能把容量充饱'
    ],
    avoid: '不要出现"恒压段电流还会变大"这类与物理过程矛盾的描述。',
    note: '页面上只有倍率读数、没有"充电随时间推进"的可视化，这条补的正是那段时序：电压曲线 + 电流曲线 + SOC 液位三者同步推进。',
    status: 'planned',
    file: 'ch03-cccv.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },

  // ── 第 04 章 · 老化观测舱 ────────────────────────────────
  {
    id: 'ch04-sei',
    chapter: 4,
    page: '/aging',
    priority: 'optional',
    produced: 'anim',
    where: '与"SEI 增厚"机制卡配套',
    title: 'SEI 膜：既是保护层，也在持续消耗可循环锂',
    duration: '约 14 秒 · 单遍 300 循环',
    style: '本站自制微动画（Canvas）',
    mustCover: [
      'SEI 在首次充电时由电解液在负极表面分解形成',
      '它既是保护层（阻止电解液继续大量分解），也会持续缓慢增厚',
      '增厚的代价：永久消耗可循环锂，容量随之下降',
      '生长速率先快后慢（扩散受限）'
    ],
    avoid: '不要把 SEI 描述成"纯有害"或"纯有益"——它同时具备保护作用与副作用。',
    note: '机制卡给的是方程 dL/dt ∝ 1/L，动画把这条关系画出来（L ∝ √t），并把"锂被锁进膜里"这一代价显性化。',
    status: 'planned',
    file: 'ch04-sei.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },
  {
    id: 'ch04-plating',
    chapter: 4,
    page: '/aging',
    priority: 'must',
    produced: 'anim',
    where: '与"析锂"机制卡配套',
    title: '析锂与枝晶：低温或大倍率充电时，锂为什么进不去负极',
    duration: '约 14 秒 · 单遍',
    style: '本站自制微动画（Canvas）；如有条件，可用 NASA/NREL 实拍影像覆盖',
    mustCover: [
      '低温或大倍率充电时，锂来不及嵌入负极',
      '锂在负极表面直接以金属形式析出，形成枝晶',
      '后果一：析出的锂失去活性，容量直接损失',
      '后果二：枝晶可能刺穿隔膜，造成内短路的安全隐患'
    ],
    avoid: '不要演示或鼓励拆解、穿刺、短路等危险操作。',
    note: '先用机理动画把四件事讲全（左右两栏同一界面、两种工况对照）。NASA/NREL 的同步辐射 X 射线实拍仍是**更强的现实证据**，拿到后可直接覆盖本视频位；动画里已写明"真实影像见资料来源"，两者是示意与实证的互补。',
    candidates: [
      { label: 'NREL · Battery Failure Databank 数据页（内含 X 射线视频库入口）', url: 'https://www.nrel.gov/transportation/battery-failure', license: '美国能源部开放数据 · 公有领域' },
      { label: 'ORNL · 锂枝晶生长实时纳米影像（美国能源部橡树岭国家实验室）', url: 'https://www.youtube.com/watch?v=rpPUTM_u_PM', license: '美国能源部国家实验室作品' },
      { label: 'PNNL · 枝晶 / 晶须生长影像（备选）', url: 'https://www.pnnl.gov/news-media/scientists-pinpoint-cause-harmful-dendrites-and-whiskers-lithium-batteries', license: '同上' },
      { label: 'Wikimedia Commons · 硅负极充放电原位 SEM（备选）', url: 'https://commons.wikimedia.org/wiki/File:In-situ-Scanning-Electron-Microscopy-of-Silicon-Anode-Reactions-in-Lithium-Ion-Batteries-during-srep36153-s4.ogv', license: 'CC BY 4.0 · 署名即可用' }
    ],
    status: 'planned',
    file: 'ch04-plating.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },

  // ── 第 05 章 · 真实数据实验室 ────────────────────────────
  {
    id: 'ch05-nasa',
    chapter: 5,
    page: '/datalab',
    priority: 'nice',
    produced: 'anim',
    where: '与"数据显示与可信度"配套',
    title: '这些曲线是怎么测出来的：认识 NASA 电池数据集',
    duration: '约 14 秒 · 单遍',
    style: '本站自制微动画（Canvas）',
    mustCover: [
      '数据集出自 NASA PCoE（Prognostics Center of Excellence）',
      '四颗 18650 电芯，额定 2.0 Ah，室温 24 ℃',
      '充电：1.5 A 恒流至 4.2 V 后恒压至 20 mA',
      '放电：2.0 A 恒流至各电芯截止电压，逐循环记录放电容量',
      'SOH 由容量比得出，EOL 采用 80% 教学参考线'
    ],
    avoid: '不要把数据集参数与本作品的 BS-01 概念标本混为一谈——两者是不同对象。',
    note: '参数细节网上找不到对得上的现成视频。动画把一个测试循环的五步走一遍，下半段直接把 B0005 的 168 次真实容量逐点画出来——这是"数据可信度"最直接的说明。',
    candidates: [
      { label: '原始数据源（背景资料，非视频）', url: 'https://catalog.data.gov/dataset/li-ion-battery-aging-datasets', license: 'Public Domain · 美国政府作品' }
    ],
    status: 'planned',
    file: 'ch05-nasa.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },

  // ── 第 06 章 · 预测方法实验室 ────────────────────────────
  {
    id: 'ch06-methods',
    chapter: 6,
    page: '/prediction',
    priority: 'nice',
    produced: 'anim',
    where: '与"三条预测路线"对比配套',
    title: '物理模型、数据驱动、融合方法：三条路各自在做什么',
    duration: '约 13 秒 · 单遍',
    style: '本站自制微动画（Canvas）',
    mustCover: [
      '物理模型：从电化学方程出发，可解释性强但参数难标定、算得慢',
      '数据驱动：直接从历史数据学规律，拟合能力强但需要大量数据、可解释性弱',
      '融合方法（如 PINN）：用物理约束神经网络，兼顾两边，但训练与验证成本高',
      '三者的适用边界：数据量、算力、对可解释性的要求'
    ],
    avoid: '不要宣称某一种方法"最优"——本作品的立场是各有边界，按场景选择。',
    note: '页面上的三条路线是静态对比图 + 切换，缺少"三种方法处理同一批数据时各自在做什么"的动感。三栏并列后，输入形态的差别一眼可见。',
    status: 'planned',
    file: 'ch06-methods.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },

  // ── 第 07 章 · 预测任务 ──────────────────────────────────
  {
    id: 'ch07-holdout',
    chapter: 7,
    page: '/ending',
    priority: 'must',
    produced: 'anim',
    where: '与"留出法回测结果"配套',
    title: '留出法回测：怎么知道预测靠不靠谱',
    duration: '约 15 秒 · 单遍',
    style: '本站自制微动画（Canvas）',
    mustCover: [
      '把前 80 次实测记录交给模型，后面的记录藏起来',
      '模型外推出未来 SOH 曲线，并与藏起来的实测曲线比对',
      '绝对误差 = 预测交点循环数与实测交点循环数之差',
      '预测区间由历史拟合残差传播得到，会随预测距离展宽'
    ],
    avoid: '不要把预测区间说成"置信区间"或"概率保证"——它只是这条基线离散程度的表达。',
    note: '讲的是本团队自己的算法与结果。动画与页面结果面板共用 `src/data/holdoutCase.js` 同一个数据入口，EOL 97 / RUL 17 / 实测 101 / 误差 4 / 区间 89—106 逐项一致，不可能出现"动画一个数、面板另一个数"。',
    candidates: [
      { label: '自录可选：本作品第 07 章页面录屏 + 口播（网上无对应内容）', url: '', license: '自制 · 完全自有' }
    ],
    status: 'planned',
    file: 'ch07-holdout.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  }
]

/** 优先级中文标签（供开发态占位卡显示）。 */
export const priorityLabel = {
  must: '必做',
  nice: '建议',
  optional: '可选'
}

/** 素材形式中文标签。 */
export const producedLabel = {
  anim: '本站自制微动画',
  video: '待接入真实视频'
}

/**
 * 取某一章的视频位。
 * @param {string} path 路由路径，如 '/principle'
 */
export const slotsOf = (path) => videoSlots.filter((s) => s.page === path)

/**
 * 某个视频位是否应当在页面上渲染真实视频。
 * 必须是 status === 'ready' 且已填写 src —— 二者缺一就不渲染，
 * 这样即使误改了 status 也不会在交付版里出现空白播放器。
 * @param {object} slot
 */
export const slotReady = (slot) => slot?.status === 'ready' && !!slot?.src

/**
 * 是否显示"开发态占位"。
 * 只在 npm run dev 下显示，用于对照位置；生产构建（dist）里一律不显示。
 */
export const showPlaceholder = () => import.meta.env.DEV
