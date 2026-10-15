# 截图说明

本目录 8 张 `final-*.png` 由 `scripts/shots.cjs` 从**当前构建产物**（`dist/`）自动生成，
统一 1600×1100 视口，对应 01 首页 → 08 学习八个章节，供快速查看整体视觉与版式。

重新生成：

```bash
node serve-dist.mjs                     # 另开一个终端，跑 dist，端口 5188
MSYS_NO_PATHCONV=1 SHOT_BASE="http://127.0.0.1:5188/" \
  SHOT_OUT="<本目录绝对路径>/final-" \
  node scripts/shots.cjs home="#/" types="#/types" principle="#/principle" \
  aging="#/aging" datalab="#/datalab" prediction="#/prediction" ending="#/ending" \
  learn="#/learn"
```

> 每次视觉或文案改版后都请重出这批图，否则截图会与新交付版不一致。

`dev-视频位占位示例.png` 是**开发态参照图，不属于交付材料**：
它截的是 `npm run dev` 下第 02 章的视频位占位卡（含"开发态占位 · 正式构建自动隐藏"字样
与优先级徽标），用于团队内部核对视频位的位置与内容要求。正式构建里这一整块不会渲染。

第 7 页的基线预测结果（`scripts` 之外也可用 node 直接复算，数值与页面一致）：

| 项 | 值 |
|---|---|
| 输入 | NASA PCoE B0005 前 80 次有效放电记录 |
| 教学参考线 | SOH 80% |
| 预测 EOL | 第 97 次 |
| RUL | 17 次 |
| 留出实测 EOL | 第 101 次 |
| 绝对误差 | 4 次 |
| 预测区间 | 第 89–106 次 |
| 方法 | Theil–Sen 稳健斜率 + 单调指数外推 + 残差区间（可回测基线，不是 PINN） |

> 上表为可回测的基线输出，不是训练过的神经网络预测；页面与文档口径保持一致。

## 页内微动画图（`微动画/` 与 `微动画_窄屏/`）

第 03—07 章页内的 **7 条自制机理微动画**（Canvas 2D）各出一张裁剪到动画卡片的图，
由 `scripts/check-anim.cjs` 从同一份 `dist/` 生成：

```bash
MSYS_NO_PATHCONV=1 node scripts/check-anim.cjs                  # 桌面 1186×430，逐页裁图
ANIM_W=390 ANIM_H=844 ANIM_SEEK=1 \
  ANIM_OUT=演示截图/微动画_窄屏/ node scripts/check-anim.cjs     # 窄屏 320×280
```

- `微动画/anim-<视频位id>.png` —— 桌面尺寸 7 张
- `微动画_窄屏/anim-<视频位id>.png` —— 窄屏尺寸 7 张（另一轮生成，两组不要混用）

该脚本除了出图，还会**采样画布像素覆盖率**（防止"白板上线"）并监控控制台异常，
判定标准是"像素覆盖率 > 0.02 且无异常"。

> 常用开关：`ANIM_ONLY=aging,prediction` 只跑指定页（改动画时快速复检，不必等全量 8 分钟）；
> `ANIM_SEEK=1` 让每条动画先跳到末帧再截图 —— 有些元素（如回测页的"预测 / 实测"标记）
> 只在后半程才出现，只看默认时刻会漏掉叠字问题。

> ⚠️ 与其它 CDP 脚本一样**必须串行跑**，不要和 `shots` / `audit-mobile` 同时开。

## 手机端对照图（`手机端/`）

`手机端/m-*.png` 为各章的**手机首屏**（393×852，DPR 2），`手机端/m-*-full.png`
为对应的**整页长图**，由 `scripts/audit-mobile.cjs` 从同一份 `dist/` 生成：

```bash
MSYS_NO_PATHCONV=1 SHOT_BASE="http://127.0.0.1:5188/" \
  SHOT_OUT="<本目录绝对路径>/手机端/m-" \
  node scripts/audit-mobile.cjs home="#/" types="#/types" principle="#/principle" \
  aging="#/aging" datalab="#/datalab" prediction="#/prediction" ending="#/ending" \
  learn="#/learn"
```

该脚本同时输出体检结论，**8 页必须全部达标**：横向溢出 0、无超宽元素、
触摸目标全 ≥44px、无 <12px 字号、窄屏顶栏三格（上一章 / 当前章 / 下一章）互不重叠。
可用 `MW=360 MH=780 node scripts/audit-mobile.cjs …` 复验小屏安卓。

> ⚠️ `audit-mobile.cjs` 单页就要 10 秒上下（第 08 章长图更久），
> **不要与 `verify-app.cjs` / `diagnose-nav.cjs` / `verify-look-views.cjs` 并行跑** ——
> 多个 headless 浏览器同时开会把机器拖满，脚本按固定毫秒等待就会误报失败。

> 移动端样式集中在各文件的 `@media (max-width: 767px)` 里，平板档为 `max-width: 1080px`
> （只做双栏塌单栏）。**全站只用 1080 / 767 两档断点**，桌面（≥768px）观感不受影响。
