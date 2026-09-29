import { init, use } from 'echarts/core'
import { LineChart, RadarChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 只注册项目实际使用的图表，避免把完整 ECharts（约 1 MB）打进首屏资源。
use([
  LineChart,
  RadarChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  TooltipComponent,
  CanvasRenderer
])

export function initChart(element) {
  return init(element, null, { renderer: 'canvas' })
}
