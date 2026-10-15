/**
 * 小锂的"主动开口"通道（极简事件总线）
 * ---------------------------------------------------------------
 * 自测答错、小游戏失误这类场景，页面需要**主动**让小锂出来讲知识点，
 * 而不是等学习者点开对话框。各页面只要 notifyAssistant({ text, mood })，
 * RobotAssistant 监听这条队列并弹出讲解气泡。
 * 可选 path / ch：带上章节链接，讲解末尾会多一条"去第 X 章看看"入口。
 * 队列上限 6 条，超出丢弃最旧的——气泡只承担"提醒"，不承担历史。
 */
import { reactive } from 'vue'

const state = reactive({ pending: [] })
let seq = 0

export function notifyAssistant({ text, mood = 'concern', path = '', ch = '' }) {
  state.pending.push({ id: ++seq, text, mood, path, ch })
  if (state.pending.length > 6) state.pending.shift()
  return seq
}

export function takeAssistant(id) {
  const i = state.pending.findIndex((m) => m.id === id)
  if (i >= 0) state.pending.splice(i, 1)
}

export const assistantQueue = state
