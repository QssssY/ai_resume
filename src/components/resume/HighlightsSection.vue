<template>
  <div class="highlights-section">
    <div v-if="highlights.length > 0" class="highlights-list">
      <div
        v-for="(item, index) in highlights"
        :key="index"
        class="highlight-item"
      >
        <div class="highlight-icon">
          <el-icon :size="18" color="#67c23a"><StarFilled /></el-icon>
        </div>
        <div class="highlight-content">
          <div v-if="item.title" class="highlight-title">{{ item.title }}</div>
          <div v-if="item.description" class="highlight-desc">{{ item.description }}</div>
          <div v-else-if="typeof item === 'string'" class="highlight-desc">{{ item }}</div>
        </div>
      </div>
    </div>
    <div v-else class="empty-highlights">
      <el-icon :size="24" color="#c0c4cc"><InfoFilled /></el-icon>
      <span>暂无亮点记录</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { StarFilled, InfoFilled, Star } from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: [Array, Object],
    default: () => []
  }
})

// 处理多种可能的数据结构
const highlights = computed(() => {
  const data = props.data
  if (!data) return []

  // 如果是数组，直接使用
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'string') {
        return { title: '', description: item }
      }
      return item
    })
  }

  // 如果是对象，尝试提取亮点字段
  if (typeof data === 'object') {
    // 可能的字段名
    const possibleKeys = ['highlights', 'strengths', 'advantages', 'points', 'items']
    for (const key of possibleKeys) {
      if (Array.isArray(data[key])) {
        return data[key].map(item => {
          if (typeof item === 'string') {
            return { title: '', description: item }
          }
          return item
        })
      }
    }
  }

  return []
})
</script>

<style scoped>
.highlights-section {
  padding: 8px 0;
}

.highlights-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.highlight-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background-color: #f0f9eb;
  border-radius: 4px;
  border-left: 3px solid #67c23a;
}

.highlight-icon {
  flex-shrink: 0;
  padding-top: 2px;
}

.highlight-content {
  flex: 1;
}

.highlight-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.highlight-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.empty-highlights {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}
</style>
