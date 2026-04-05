<template>
  <div class="interview-report-view">
    <div class="page-header">
      <div class="header-left">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1 class="page-title">面试评价报告</h1>
      </div>
      <div class="header-right">
        <el-tag :type="statusTagType" effect="light">
          {{ statusText }}
        </el-tag>
      </div>
    </div>

    <div v-if="loading" class="loading-section">
      <div class="loading-content">
        <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
        <div class="loading-text">加载评价报告...</div>
      </div>
    </div>

    <div v-else-if="error" class="error-section">
      <el-result icon="error" title="加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="fetchSessionDetail">重试</el-button>
          <el-button @click="goBack">返回</el-button>
        </template>
      </el-result>
    </div>

    <div v-else-if="!isEnded" class="empty-section">
      <el-result icon="info" title="暂无评价报告" sub-title="当前面试尚未结束，结束后可查看综合评分与评价报告">
        <template #extra>
          <el-button type="primary" @click="goToSession">返回会话</el-button>
          <el-button @click="goBack">返回</el-button>
        </template>
      </el-result>
    </div>

    <div v-else class="report-content">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">面试岗位</span>
          <span class="summary-value">{{ sessionData?.jobRole || '-' }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">综合评分</span>
          <span class="summary-value score">{{ displayScore }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">报告等级</span>
          <el-tag :type="levelTagType" size="small">{{ parsedReport?.level || '-' }}</el-tag>
        </div>
      </div>

      <div v-if="!hasReport" class="report-empty-card">
        <el-empty description="暂无评价报告内容" />
      </div>

      <template v-else>
        <div v-if="parsedReport?.summary" class="report-section">
          <div class="section-header">
            <el-icon class="section-icon" color="#409eff"><Document /></el-icon>
            <span class="section-title">总体评价</span>
          </div>
          <div class="section-body summary-text">{{ parsedReport.summary }}</div>
        </div>

        <div v-if="reportStrengths.length > 0" class="report-section">
          <div class="section-header">
            <el-icon class="section-icon" color="#67c23a"><CircleCheck /></el-icon>
            <span class="section-title">优势亮点</span>
          </div>
          <div class="section-body">
            <ul class="bullet-list">
              <li v-for="(item, idx) in reportStrengths" :key="idx">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div v-if="reportDimensions" class="report-section">
          <div class="section-header">
            <el-icon class="section-icon" color="#e6a23c"><DataAnalysis /></el-icon>
            <span class="section-title">各维度评分</span>
          </div>
          <div class="section-body">
            <div class="dimensions-grid">
              <div v-for="(value, key) in reportDimensions" :key="key" class="dimension-card">
                <div class="dimension-name">{{ dimensionNameMap[key] || key }}</div>
                <el-progress
                  :percentage="Math.round(Number(value))"
                  :color="getDimensionColor(Number(value))"
                  :stroke-width="8"
                  :show-text="true"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="reportSuggestions.length > 0" class="report-section">
          <div class="section-header">
            <el-icon class="section-icon" color="#409eff"><Guide /></el-icon>
            <span class="section-title">改进建议</span>
          </div>
          <div class="section-body">
            <ul class="bullet-list suggestion-list">
              <li v-for="(item, idx) in reportSuggestions" :key="idx">
                <span class="suggestion-index">{{ idx + 1 }}</span>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <div v-if="reportImprovements.length > 0" class="report-section">
          <div class="section-header">
            <el-icon class="section-icon" color="#f56c6c"><Warning /></el-icon>
            <span class="section-title">待提升方向</span>
          </div>
          <div class="section-body">
            <ul class="bullet-list improvement-list">
              <li v-for="(item, idx) in reportImprovements" :key="idx">{{ item }}</li>
            </ul>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Loading,
  Document,
  CircleCheck,
  DataAnalysis,
  Guide,
  Warning
} from '@element-plus/icons-vue'
import { getInterviewSession } from '@/api/interview'

const route = useRoute()
const router = useRouter()
const sessionId = computed(() => route.params.sessionId)

const loading = ref(true)
const error = ref('')
const sessionData = ref(null)

const isEnded = computed(() => sessionData.value?.status === 1)
const statusText = computed(() => {
  if (!sessionData.value) return '加载中'
  return sessionData.value.status === 1 ? '已结束' : '进行中'
})
const statusTagType = computed(() => {
  if (!sessionData.value) return 'info'
  return sessionData.value.status === 1 ? 'info' : 'success'
})
const displayScore = computed(() => {
  const score = sessionData.value?.comprehensiveScore
  return score === null || score === undefined ? '-' : `${score} 分`
})

const parsedReport = computed(() => {
  const report = sessionData.value?.evaluationReport
  if (report === null || report === undefined) return null
  if (typeof report === 'string') {
    const trimmed = report.trim()
    if (!trimmed) return null
    try {
      return JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  return report
})

const hasReport = computed(() => {
  return parsedReport.value !== null
})

const levelTagType = computed(() => {
  const level = parsedReport.value?.level
  const map = { 初级: 'success', 中级: 'warning', 高级: 'danger' }
  return map[level] || 'info'
})

const reportStrengths = computed(() => {
  const val = parsedReport.value?.strengths
  if (!val) return []
  if (Array.isArray(val)) return val
  return []
})

const reportSuggestions = computed(() => {
  const val = parsedReport.value?.suggestions
  if (!val) return []
  if (Array.isArray(val)) return val
  return []
})

const reportImprovements = computed(() => {
  const val = parsedReport.value?.improvements
  if (!val) return []
  if (Array.isArray(val)) return val
  return []
})

const reportDimensions = computed(() => {
  const val = parsedReport.value?.dimensions
  if (!val || typeof val !== 'object') return null
  return val
})

const dimensionNameMap = {
  systemDesign: '系统设计',
  communication: '沟通表达',
  problemSolving: '问题解决',
  technicalDepth: '技术深度',
  codeQuality: '代码质量',
  architecture: '架构能力',
  experience: '实践经验'
}

const getDimensionColor = (score) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

const fetchSessionDetail = async () => {
  if (!sessionId.value) {
    error.value = '会话ID不存在'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await getInterviewSession(sessionId.value)
    sessionData.value = res.data
  } catch (err) {
    error.value = err.message || '获取评价报告失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const goToSession = () => {
  if (!sessionId.value) return
  router.push(`/interview/session/${sessionId.value}`)
}

onMounted(() => {
  fetchSessionDetail()
})
</script>

<style scoped>
.interview-report-view {
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #303133;
}

.loading-section,
.error-section,
.empty-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-icon {
  color: #409eff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #606266;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 24px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px 24px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-label {
  font-size: 13px;
  color: #909399;
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.summary-value.score {
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
}

.summary-divider {
  width: 1px;
  height: 20px;
  background-color: #e4e7ed;
}

.report-empty-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 48px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-section {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.section-body {
  padding: 16px;
}

.summary-text {
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
}

.bullet-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bullet-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
}

.bullet-list li::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #409eff;
  margin-top: 8px;
  flex-shrink: 0;
}

.improvement-list li::before {
  background-color: #f56c6c;
}

.suggestion-list {
  gap: 12px;
}

.suggestion-list li {
  align-items: flex-start;
  gap: 10px;
}

.suggestion-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.dimension-card {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px 16px;
  background-color: #fafafa;
}

.dimension-name {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .summary-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .summary-divider {
    width: 100%;
    height: 1px;
  }

  .dimensions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
