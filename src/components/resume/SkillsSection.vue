<template>
  <div class="skills-section">
    <!-- 技能得分 -->
    <div v-if="hasScore" class="skills-score">
      <div class="score-circle" :style="scoreStyle">
        <span class="score-number">{{ score }}</span>
        <span class="score-unit">分</span>
      </div>
      <div class="score-info">
        <div class="score-label">技能得分</div>
        <div v-if="scoreComment" class="score-comment">{{ scoreComment }}</div>
      </div>
    </div>

    <!-- 技能标签 -->
    <div v-if="skills.length > 0" class="skills-tags-section">
      <div class="section-label">技能列表</div>
      <div class="skills-tags">
        <el-tag
          v-for="(skill, index) in skills"
          :key="index"
          :type="getTagType(index)"
          effect="light"
          class="skill-tag"
        >
          {{ skill }}
        </el-tag>
      </div>
    </div>

    <!-- 技术栈 -->
    <div v-if="techStack.length > 0" class="tech-stack-section">
      <div class="section-label">技术栈</div>
      <div class="tech-list">
        <div v-for="(tech, index) in techStack" :key="index" class="tech-item">
          <el-icon :size="14" color="#409eff"><Check /></el-icon>
          <span>{{ tech }}</span>
        </div>
      </div>
    </div>

    <!-- 技能描述/建议 -->
    <div v-if="skillDescription" class="skill-description">
      <div class="section-label">技能评价</div>
      <div class="description-content">{{ skillDescription }}</div>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasContent" class="empty-skills">
      <el-icon :size="24" color="#c0c4cc"><InfoFilled /></el-icon>
      <span>暂无技能信息</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Check, InfoFilled, Star } from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

// 技能得分
const score = computed(() => {
  const s = props.data?.score ?? props.data?.skillScore ?? props.data?.totalScore
  return typeof s === 'number' ? s : null
})

const hasScore = computed(() => score.value !== null)

const scoreComment = computed(() => {
  return props.data?.scoreComment ?? props.data?.comment ?? ''
})

// 技能列表
const skills = computed(() => {
  const data = props.data
  if (!data) return []

  // 可能的技能字段
  const possibleKeys = ['skills', 'skillList', 'skillNames', 'items']
  for (const key of possibleKeys) {
    if (Array.isArray(data[key])) {
      return data[key].filter(s => typeof s === 'string')
    }
  }

  // 如果是数组直接返回
  if (Array.isArray(data)) {
    return data.filter(s => typeof s === 'string')
  }

  return []
})

// 技术栈
const techStack = computed(() => {
  const ts = props.data?.techStack ?? props.data?.tech_stack ?? props.data?.stack
  if (Array.isArray(ts)) {
    return ts.filter(t => typeof t === 'string')
  }
  return []
})

// 技能描述
const skillDescription = computed(() => {
  return props.data?.description ?? props.data?.skillDescription ?? props.data?.evaluation ?? ''
})

// 是否有内容
const hasContent = computed(() => {
  return hasScore.value ||
    skills.value.length > 0 ||
    techStack.value.length > 0 ||
    skillDescription.value
})

// 得分圆环样式
const scoreStyle = computed(() => {
  const s = score.value || 0
  const percentage = Math.min(Math.max(s, 0), 100)
  const color = percentage >= 80 ? '#67c23a' : percentage >= 60 ? '#e6a23c' : '#f56c6c'

  return {
    background: `conic-gradient(${color} ${percentage * 3.6}deg, #e4e7ed 0deg)`
  }
})

// 标签类型
const getTagType = (index) => {
  const types = ['primary', 'success', 'warning', 'info']
  return types[index % types.length]
}
</script>

<style scoped>
.skills-section {
  padding: 8px 0;
}

.skills-score {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-divider, #f0f0f0);
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: var(--bg-card, #fff);
}

.score-circle::before {
  content: '';
  position: absolute;
  inset: 6px;
  background: var(--bg-card, #fff);
  border-radius: 50%;
}

.score-number {
  position: relative;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-title, #303133);
  line-height: 1;
}

.score-unit {
  position: relative;
  font-size: 12px;
  color: var(--text-muted, #909399);
  margin-top: 2px;
}

.score-info {
  flex: 1;
}

.score-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-title, #303133);
  margin-bottom: 4px;
}

.score-comment {
  font-size: 13px;
  color: var(--text-body, #606266);
  line-height: 1.6;
}

.skills-tags-section,
.tech-stack-section,
.skill-description {
  margin-bottom: 20px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-title, #303133);
  margin-bottom: 12px;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  font-size: 13px;
}

.tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tech-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-body, #606266);
  padding: 4px 10px;
  background-color: var(--bg-elevated, #f5f7fa);
  border-radius: 4px;
}

.description-content {
  font-size: 14px;
  color: var(--text-body, #606266);
  line-height: 1.8;
  white-space: pre-wrap;
}

.empty-skills {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--text-muted, #909399);
  font-size: 14px;
}
</style>
