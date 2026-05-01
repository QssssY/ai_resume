<template>
  <div class="work-experience-section">
    <!-- 得分概览 -->
    <div v-if="hasScores" class="scores-overview">
      <div v-if="workScore !== null" class="score-item">
        <div class="score-value" :class="getScoreClass(workScore)">{{ workScore }}</div>
        <div class="score-label">工作经验</div>
      </div>
      <div v-if="projectScore !== null" class="score-item">
        <div class="score-value" :class="getScoreClass(projectScore)">{{ projectScore }}</div>
        <div class="score-label">项目经验</div>
      </div>
    </div>

    <!-- 工作经验详情 -->
    <div v-if="workExperiences.length > 0" class="experience-list">
      <div class="section-title">工作经历</div>
      <div
        v-for="(exp, index) in workExperiences"
        :key="index"
        class="experience-item"
      >
        <div class="exp-header">
          <div class="exp-title">{{ exp.company || '未知公司' }}</div>
          <div class="exp-period">{{ exp.period || exp.duration || '' }}</div>
        </div>
        <div class="exp-position">{{ exp.position || exp.title || '' }}</div>
        <div v-if="exp.description || exp.summary" class="exp-desc">
          {{ exp.description || exp.summary }}
        </div>
      </div>
    </div>

    <!-- 项目经验详情 -->
    <div v-if="projectExperiences.length > 0" class="experience-list">
      <div class="section-title">项目经历</div>
      <div
        v-for="(proj, index) in projectExperiences"
        :key="index"
        class="experience-item"
      >
        <div class="exp-header">
          <div class="exp-title">{{ proj.name || proj.projectName || '未知项目' }}</div>
          <div class="exp-period">{{ proj.period || proj.duration || '' }}</div>
        </div>
        <div class="exp-position">{{ proj.role || proj.position || '' }}</div>
        <div v-if="proj.description || proj.summary" class="exp-desc">
          {{ proj.description || proj.summary }}
        </div>
        <div v-if="proj.technologies && proj.technologies.length" class="exp-tech">
          <el-tag
            v-for="(tech, idx) in proj.technologies"
            :key="idx"
            size="small"
            effect="plain"
            class="tech-tag"
          >
            {{ tech }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 问题与建议 -->
    <div v-if="issues.length > 0 || suggestions.length > 0" class="issues-section">
      <div class="section-title">改进建议</div>
      <div v-if="issues.length > 0" class="issues-list">
        <div
          v-for="(issue, index) in issues"
          :key="index"
          class="issue-item"
        >
          <el-icon :size="16" color="#f56c6c"><Warning /></el-icon>
          <span>{{ typeof issue === 'string' ? issue : issue.description || issue.text }}</span>
        </div>
      </div>
      <div v-if="suggestions.length > 0" class="suggestions-list">
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          class="suggestion-item"
        >
          <el-icon :size="16" color="#409eff"><InfoFilled /></el-icon>
          <span>{{ typeof suggestion === 'string' ? suggestion : suggestion.description || suggestion.text }}</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasContent" class="empty-experience">
      <el-icon :size="24" color="#c0c4cc"><InfoFilled /></el-icon>
      <span>暂无经验信息</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Warning,
  InfoFilled,
  Check,
  Calendar,
  OfficeBuilding,
  CircleCheck as CircleCheckIcon
} from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

// 得分
const workScore = computed(() => {
  const s = props.data?.workScore ?? props.data?.work_score ?? props.data?.experienceScore
  return typeof s === 'number' ? s : null
})

const projectScore = computed(() => {
  const s = props.data?.projectScore ?? props.data?.project_score ?? props.data?.projectExperienceScore
  return typeof s === 'number' ? s : null
})

const hasScores = computed(() => workScore.value !== null || projectScore.value !== null)

// 工作经验
const workExperiences = computed(() => {
  const experiences = props.data?.workExperiences ??
    props.data?.work_experiences ??
    props.data?.experiences ??
    props.data?.workExperience ??
    []
  return Array.isArray(experiences) ? experiences : []
})

// 项目经验
const projectExperiences = computed(() => {
  const projects = props.data?.projectExperiences ??
    props.data?.project_experiences ??
    props.data?.projects ??
    props.data?.projectExperience ??
    []
  return Array.isArray(projects) ? projects : []
})

// 问题
const issues = computed(() => {
  const issues = props.data?.issues ?? props.data?.problems ?? props.data?.weaknesses ?? []
  return Array.isArray(issues) ? issues : []
})

// 建议
const suggestions = computed(() => {
  const suggestions = props.data?.suggestions ??
    props.data?.improvements ??
    props.data?.recommendations ??
    []
  return Array.isArray(suggestions) ? suggestions : []
})

// 是否有内容
// 是否有内容
const hasContent = computed(() => {
  return hasScores.value ||
    workExperiences.value.length > 0 ||
    projectExperiences.value.length > 0 ||
    issues.value.length > 0 ||
    suggestions.value.length > 0
})

// 得分样式类
const getScoreClass = (score) => {
  if (score >= 80) return 'score-excellent'
  if (score >= 60) return 'score-good'
  return 'score-poor'
}
</script>

<style scoped>
.work-experience-section {
  padding: 8px 0;
}

.scores-overview {
  display: flex;
  gap: 40px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-divider, #f0f0f0);
}

.score-item {
  text-align: center;
}

.score-value {
  font-size: 36px;
  font-weight: 600;
  line-height: 1;
  margin-bottom: 8px;
}

.score-excellent {
  color: var(--color-success, #67c23a);
}

.score-good {
  color: var(--color-warning, #e6a23c);
}

.score-poor {
  color: var(--color-danger, #f56c6c);
}

.score-label {
  font-size: 13px;
  color: var(--text-muted, #909399);
}

.experience-list {
  margin-bottom: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-title, #303133);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-divider, #f0f0f0);
}

.experience-item {
  padding: 16px;
  background-color: var(--bg-elevated, #f5f7fa);
  border-radius: 4px;
  margin-bottom: 12px;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.exp-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-title, #303133);
}

.exp-period {
  font-size: 13px;
  color: var(--text-muted, #909399);
}

.exp-position {
  font-size: 14px;
  color: var(--text-body, #606266);
  margin-bottom: 8px;
}

.exp-desc {
  font-size: 13px;
  color: var(--text-body, #606266);
  line-height: 1.6;
}

.exp-tech {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tech-tag {
  font-size: 12px;
}

.issues-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-divider, #f0f0f0);
}

.issues-list,
.suggestions-list {
  margin-bottom: 16px;
}

.issues-list:last-child,
.suggestions-list:last-child {
  margin-bottom: 0;
}

.issue-item,
.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background-color: #fef0f0;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-body, #606266);
  line-height: 1.5;
}

.suggestion-item {
  background-color: #ecf5ff;
}

.issue-item:last-child,
.suggestion-item:last-child {
  margin-bottom: 0;
}

.empty-experience {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--text-muted, #909399);
  font-size: 14px;
}
</style>
