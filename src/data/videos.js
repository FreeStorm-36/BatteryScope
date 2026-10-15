/**
 * 科普视频位配置（全站唯一视频清单）
 * ---------------------------------------------------------------
 * 设计原则：
 *   1. **未就绪的视频位在正式构建里完全不渲染** —— 不让评审看到"待接入"这类字样。
 *      开发态（npm run dev）会显示占位卡片，方便对照位置。
 *   2. 优先**本地自托管**（把 mp4 放进 `public/media/`，构建时自动复制进 dist）。
 *      原因：答辩现场可能断网；外部嵌入还会带来版权与原创性问题。
 *   3. 每个视频位都必须写明"必须讲到什么"，避免素材讲得漂亮但知识点没覆盖。
 *
 * 接入步骤（拿到视频后）：
 *   ① 把文件放进 `public/media/`，文件名与下面的 `file` 字段一致；
 *   ② 把该条的 `status` 改成 `'ready'`；
 *   ③ 填 `src`（相对路径，不带前导斜杠）、`poster`（封面帧，可选）、
 *      `source`（来源标注：自制 / 素材出处与作者）、`license`（授权方式）。
 *   ④ 重新构建。未填 src 的条目即使 status 为 ready 也不会渲染。
 *
 * ⚠️ 只有 status === 'ready' 且 src 非空的条目会出现在页面上。
 */

export const videoSlots = [
  // ── 第 02 章 · 电芯展柜 ──────────────────────────────────
  {
    id: 'ch02-teardown',
    chapter: 2,
    page: '/types',
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
    where: '与"Li⁺ 与电子双路径"配套',
    title: '锂离子在充放电中的迁移路径',
    duration: '30—60 秒',
    style: '微观动画（示意即可，但要准确）',
    mustCover: [
      '充电：Li⁺ 从正极脱出 → 穿过电解液 → 透过隔膜 → 嵌入负极',
      '同一时刻电子从正极经外电路流向负极',
      '放电：方向反过来，Li⁺ 回正极，电子经外电路回正极',
      '强调"离子走内部、电子走外部"两条并行的路径'
    ],
    avoid: '不要出现"电子穿过隔膜"或"电子在电解液里游动"这类错误表述（电解液与隔膜是电子绝缘体）。',
    status: 'planned',
    file: 'ch03-ion-path.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  },
  {
    id: 'ch03-occv',
    chapter: 3,
    page: '/principle',
    where: '与"倍率—电压—功率读数"配套',
    title: 'CC-CV 充电：为什么最后要转恒压',
    duration: '45—90 秒',
    style: '口播 + 曲线演示',
    mustCover: [
      '恒流（CC）段：电流恒定，电压随充电推进逐渐上升',
      '到达截止电压（本例 4.2 V）后转恒压（CV）段',
      'CV 段电流逐步衰减，降到设定值时结束充电',
      '恒压段存在的必要性：避免过充，同时尽可能把容量充饱'
    ],
    avoid: '不要出现"恒压段电流还会变大"这类与物理过程矛盾的描述。',
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
    where: '与"SEI 增厚"机制卡配套',
    title: 'SEI 膜：电池"生来就有"的一层膜',
    duration: '45—75 秒',
    style: '动画示意 + 讲解',
    mustCover: [
      'SEI 在首次充电时由电解液在负极表面分解形成',
      '它既是保护层（阻止电解液继续大量分解），也会持续缓慢增厚',
      '增厚的代价：永久消耗可循环锂，容量随之下降',
      '生长速率先快后慢（扩散受限）'
    ],
    avoid: '不要把 SEI 描述成"纯有害"或"纯有益"——它同时具备保护作用与副作用。',
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
    where: '与"析锂"机制卡配套',
    title: '析锂与枝晶：快充和低温下最危险的那件事',
    duration: '45—75 秒',
    style: '动画示意 + 讲解',
    mustCover: [
      '低温或大倍率充电时，锂来不及嵌入负极',
      '锂在负极表面直接以金属形式析出，形成枝晶',
      '后果一：析出的锂失去活性，容量直接损失',
      '后果二：枝晶可能刺穿隔膜，造成内短路的安全隐患'
    ],
    avoid: '不要演示或鼓励拆解、穿刺、短路等危险操作。',
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
    where: '与"数据显示与可信度"配套',
    title: '这些曲线是怎么测出来的：认识 NASA 电池数据集',
    duration: '60—90 秒',
    style: '口播 + 图表（可用本作品页面录屏）',
    mustCover: [
      '数据集出自 NASA PCoE（Prognostics Center of Excellence）',
      '四颗 18650 电芯，额定 2.0 Ah，室温 24 ℃',
      '充电：1.5 A 恒流至 4.2 V 后恒压至 20 mA',
      '放电：2.0 A 恒流至各电芯截止电压，逐循环记录放电容量',
      'SOH 由容量比得出，EOL 采用 80% 教学参考线'
    ],
    avoid: '不要把数据集参数与本作品的 BS-01 概念标本混为一谈——两者是不同对象。',
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
    where: '与"三条预测路线"对比配套',
    title: '物理模型、数据驱动、融合方法：三条路各自在做什么',
    duration: '60—120 秒',
    style: '口播 + 图示',
    mustCover: [
      '物理模型：从电化学方程出发，可解释性强但参数难标定、算得慢',
      '数据驱动：直接从历史数据学规律，拟合能力强但需要大量数据、可解释性弱',
      '融合方法（如 PINN）：用物理约束神经网络，兼顾两边，但训练与验证成本高',
      '三者的适用边界：数据量、算力、对可解释性的要求'
    ],
    avoid: '不要宣称某一种方法"最优"——本作品的立场是各有边界，按场景选择。',
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
    where: '与"留出法回测结果"配套',
    title: '留出法回测：怎么知道预测靠不靠谱',
    duration: '60—90 秒',
    style: '口播 + 本作品页面录屏',
    mustCover: [
      '把前 80 次实测记录交给模型，后面的记录藏起来',
      '模型外推出未来 SOH 曲线，并与藏起来的实测曲线比对',
      '绝对误差 = 预测交点循环数与实测交点循环数之差',
      '预测区间由历史拟合残差传播得到，会随预测距离展宽'
    ],
    avoid: '不要把预测区间说成"置信区间"或"概率保证"——它只是这条基线的离散程度表达。',
    status: 'planned',
    file: 'ch07-holdout.mp4',
    src: '',
    poster: '',
    source: '',
    license: ''
  }
]

/**
 * 取某一章的视频位。
 * @param {string} path 路由路径，如 '/principle'
 */
export const slotsOf = (path) => videoSlots.filter((s) => s.page === path)

/**
 * 某个视频位是否应当在页面上渲染。
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
