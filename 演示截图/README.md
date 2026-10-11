# 截图说明

本目录 7 张 `final-*.png` 由 `scripts/shots.cjs` 从**当前构建产物**（`dist/`）自动生成，
统一 1600×1100 视口，对应 01 首页 → 07 预测七个章节，供快速查看整体视觉与版式。

重新生成：

```bash
node serve-dist.mjs                     # 另开一个终端，跑 dist，端口 5188
MSYS_NO_PATHCONV=1 SHOT_BASE="http://127.0.0.1:5188/" \
  SHOT_OUT="<本目录绝对路径>/final-" \
  node scripts/shots.cjs home="#/" types="#/types" principle="#/principle" \
  aging="#/aging" datalab="#/datalab" prediction="#/prediction" ending="#/ending"
```

> 每次视觉或文案改版后都请重出这批图，否则截图会与新交付版不一致。

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

## 手机端对照图（`手机端/`）

`手机端/m-*.png` 为各章的**手机首屏**（393×852，DPR 2），`手机端/m-*-full.png`
为对应的**整页长图**，由 `scripts/audit-mobile.cjs` 从同一份 `dist/` 生成：

```bash
MSYS_NO_PATHCONV=1 SHOT_BASE="http://127.0.0.1:5188/" \
  SHOT_OUT="<本目录绝对路径>/手机端/m-" \
  node scripts/audit-mobile.cjs home="#/" types="#/types" principle="#/principle" \
  aging="#/aging" datalab="#/datalab" prediction="#/prediction" ending="#/ending"
```

该脚本同时输出体检结论，**7 页必须全部达标**：横向溢出 0、无超宽元素、
触摸目标全 ≥44px、无 <12px 字号、窄屏顶栏三格（上一章 / 当前章 / 下一章）互不重叠。
可用 `MW=360 MH=780 node scripts/audit-mobile.cjs …` 复验小屏安卓。

> 移动端样式集中在各文件的 `@media (max-width: 767px)` 里，平板档为 `max-width: 1080px`
> （只做双栏塌单栏）。**全站只用 1080 / 767 两档断点**，桌面（≥768px）观感不受影响。
