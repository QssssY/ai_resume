<template>
  <div class="basic-info-section">
    <!-- 完整度得分 -->
    <div v-if="hasCompletenessScore" class="completeness-score">
      <div class="completeness-display">
        <div class="completeness-bar">
          <div
            class="completeness-fill"
            :style="{ width: completenessPercentage + '%' }"
            :class="completenessClass"
          />
        </div>
        <div class="completeness-value">{{ completenessScore }}%</div>
      </div>
      <div class="completeness-label">基础信息完整度</div>
    </div>

    <!-- 信息项列表 -->
    <div class="info-items">
      <div
        v-for="(item, index) in infoItems"
        :key="index"
        class="info-item"
        :class="{ 'is-missing': !item.hasValue }"
      >
        <div class="item-icon">
          <el-icon :size="16" :color="item.hasValue ? '#409eff' : '#c0c4cc'">
            <component :is="item.icon" />
          </el-icon>
        </div>
        <div class="item-content">
          <div class="item-label">{{ item.label }}</div>
          <div class="item-value" :class="{ 'is-empty': !item.hasValue }">
            {{ item.displayValue }}
          </div>
        </div>
        <div class="item-status">
          <el-icon v-if="item.hasValue" :size="16" color="#67c23a"><CircleCheck /></el-icon>
          <el-icon v-else :size="16" color="#c0c4cc"><CircleClose /></el-icon>
        </div>
      </div>
    </div>

    <!-- 评价 -->
    <div v-if="comment" class="basic-info-comment">
      <div class="comment-label">完整性评价</div>
      <div class="comment-content">{{ comment }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  User,
  Message,
  Phone,
  OfficeBuilding,
  Link,
  Location,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

// 完整度得分
const completenessScore = computed(() => {
  const s = props.data?.completenessScore ?? props.data?.completeness_score ?? props.data?.score
  return typeof s === 'number' ? s : null
})

const hasCompletenessScore = computed(() => completenessScore.value !== null)

const completenessPercentage = computed(() => {
  return Math.min(Math.max(completenessScore.value || 0, 0), 100)
})

const completenessClass = computed(() => {
  const p = completenessPercentage.value
  if (p >= 80) return 'completeness-high'
  if (p >= 60) return 'completeness-medium'
  return 'completeness-low'
})

// 信息项配置
const infoConfig = [
  { key: 'name', label: '姓名', icon: User },
  { key: 'email', label: '邮箱', icon: Message },
  { key: 'phone', label: '电话', icon: Phone },
  { key: 'company', label: '当前公司', icon: OfficeBuilding },
  { key: 'github', label: 'GitHub', icon: Link },
  { key: 'blog', label: '博客/网站', icon: Link },
  { key: 'location', label: '所在地', icon: Location }
]

// 信息项数据
const infoItems = computed(() => {
  const items = props.data?.items ?? props.data?.infoItems ?? props.data

  return infoConfig.map(config => {
    const value = items?.[config.key]
    const hasValue = value && String(value).trim() !== ''

    return {
      ...config,
      hasValue,
      displayValue: hasValue ? value : '未填写'
    }
  })
})

// 评价
const comment = computed(() => {
  return props.data?.comment ?? props.data?.completenessComment ?? props.data?.evaluation ?? ''
})
</script>

<style scoped>
.basic-info-section {
  padding: 8px 0;
}

.completeness-score {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.completeness-display {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.completeness-bar {
  flex: 1;
  height: 12px;
  background-color: #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.completeness-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.completeness-high {
  background-color: #67c23a;
}

.completeness-medium {
  background-color: #e6a23c;
}

.completeness-low {
  background-color: #f56c6c;
}

.completeness-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  min-width: 60px;
  text-align: right;
}

.completeness-label {
  font-size: 13px;
  color: #909399;
}

.info-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.info-item:hover {
  background-color: #e8ecf1;
}

.info-item.is-missing {
  opacity: 0.7;
}

.item-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 4px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.item-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-value.is-empty {
  color: #c0c4cc;
  font-weight: normal;
}

.item-status {
  flex-shrink: 0;
}

.basic-info-comment {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.comment-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.comment-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}

.empty-basic-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}
</style>
