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
