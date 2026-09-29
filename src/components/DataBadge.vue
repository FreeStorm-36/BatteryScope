<template>
  <span class="data-badge" :class="type">
    <span class="db-dot"></span>{{ label }}
  </span>
</template>

<script setup>
// 全站统一数据性质徽标：观众一眼知道当前看到的是什么性质的数据
// real = 真实测量（绿） / concept = 概念演示（琥珀） / model = 模型输出（紫）
import { computed } from 'vue'
const props = defineProps({
  type: { type: String, default: 'concept' },
  text: { type: String, default: '' }
})
const label = computed(() => props.text || ({ real: '真实测量数据', concept: '概念演示', model: '模型输出（示例）' }[props.type] || props.type))
</script>

<style scoped lang="scss">
.data-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 999px;
  font-size: 11.5px; letter-spacing: 0.06em;
  border: 1px solid var(--hairline);
  &.real { color: #6ee7a0; border-color: rgba(52, 211, 153, 0.4); background: rgba(52, 211, 153, 0.07);
    .db-dot { background: #34d399; box-shadow: 0 0 8px rgba(52, 211, 153, 0.8); } }
  &.concept { color: #fbd38d; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.07);
    .db-dot { background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.8); } }
  &.model { color: #c4b5fd; border-color: rgba(167, 139, 250, 0.45); background: rgba(167, 139, 250, 0.08);
    .db-dot { background: #a78bfa; box-shadow: 0 0 8px rgba(167, 139, 250, 0.8); } }
}
.db-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); }
</style>
