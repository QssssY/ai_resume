<template>
  <div class="overall-evaluation">
    <div class="score-section">
      <div class="score-left">
        <div class="score-display">
          <div class="score-value">{{ score }}</div>
          <div class="score-label">综合得分</div>
        </div>
        <div class="grade-section">
          <div class="grade-badge" :class="gradeClass">{{ grade }}</div>
          <div class="grade-label">综合等级</div>
        </div>
      </div>
    </div>
    <div v-if="summary" class="summary-section">
      <div class="summary-label">总体评价</div>
      <div class="summary-content">{{ summary }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

// 提取数据，处理多种可能的字段名
const score = computed(() => {
  const s = props.data?.score ?? props.data?.totalScore ?? props.data?.total_score
  return typeof s === 'number' ? s : '-'
})

const grade = computed(() => {
  const g = props.data?.grade ?? props.data?.level ?? props.data?.rating
  return g || '-'
})

const summary = computed(() => {
  return props.data?.summary ?? props.data?.overallComment ?? props.data?.comment ?? ''
})

// 等级样式类
const gradeClass = computed(() => {
  const g = grade.value?.toLowerCase()
  if (g.includes('a') || g.includes('优') || g.includes('excellent')) return 'grade-excellent'
  if (g.includes('b') || g.includes('良') || g.includes('good')) return 'grade-good'
  if (g.includes('c') || g.includes('中') || g.includes('average')) return 'grade-average'
  if (g.includes('d') || g.includes('差') || g.includes('poor')) return 'grade-poor'
  return 'grade-default'
})
</script>

<style scoped>
.overall-evaluation {
  padding: 8px 0;
}

.score-section {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-divider, #f0f0f0);
}

.score-left {
  display: flex;
  gap: 40px;
  flex-shrink: 0;
}

.score-display {
  text-align: center;
  min-width: 100px;
}

.score-value {
  font-size: 48px;
  font-weight: 600;
  color: var(--color-info, #409eff);
  line-height: 1;
  margin-bottom: 8px;
}

.score-label {
  font-size: 13px;
  color: var(--text-muted, #909399);
}

.grade-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.grade-badge {
  padding: 8px 24px;
  border-radius: 4px;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.grade-excellent {
  background-color: #f0f9eb;
  color: var(--color-success, #67c23a);
}

.grade-good {
  background-color: #ecf5ff;
  color: var(--color-info, #409eff);
}

.grade-average {
  background-color: #fdf6ec;
  color: var(--color-warning, #e6a23c);
}

.grade-poor {
  background-color: #fef0f0;
  color: var(--color-danger, #f56c6c);
}

.grade-default {
  background-color: var(--bg-elevated, #f5f7fa);
  color: var(--text-body, #606266);
}

.grade-label {
  font-size: 13px;
  color: var(--text-muted, #909399);
}

.summary-section {
  padding-top: 8px;
}

.summary-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-title, #303133);
  margin-bottom: 10px;
}

.summary-content {
  font-size: 14px;
  color: var(--text-body, #606266);
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
