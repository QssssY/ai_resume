<template>
  <div class="resume-result-view">
    <!-- 页面标题区 -->
    <div class="page-header">
      <h1 class="page-title">简历诊断结果</h1>
      <p class="page-desc">查看本次简历诊断任务的处理状态与结果</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-section">
      <div class="loading-content">
        <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
        <div class="loading-text">加载中...</div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-section">
      <div class="error-card">
        <div class="error-icon">
          <el-icon :size="48" color="#f56c6c"><CircleClose /></el-icon>
        </div>
        <div class="error-content">
          <div class="error-title">加载失败</div>
          <div class="error-desc">{{ error }}</div>
          <div class="error-actions">
            <el-button type="primary" @click="fetchTaskDetail">重试</el-button>
            <el-button @click="goToUpload">返回上传</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务内容 -->
    <div v-else-if="task" class="task-section">
      <!-- 任务状态区 -->
      <div class="status-card">
        <div class="status-header">
          <div class="status-icon" :class="statusClass">
            <el-icon :size="32">
              <component :is="statusIcon" />
            </el-icon>
          </div>
          <div class="status-info">
            <div class="status-title">{{ statusText }}</div>
            <div class="status-time">
              <template v-if="task.updateTime">
                更新时间：{{ formatTime(task.updateTime) }}
              </template>
              <template v-else>
                创建时间：{{ formatTime(task.createTime) }}
              </template>
            </div>
          </div>
        </div>

        <!-- 处理中状态：提供刷新按钮 -->
        <div v-if="isProcessing" class="status-actions">
          <el-button :loading="refreshing" @click="fetchTaskDetail">
            {{ refreshing ? '刷新中...' : '刷新状态' }}
          </el-button>
        </div>
      </div>

      <!-- 诊断结果结构化展示（仅完成时显示） -->
      <template v-if="isCompleted && parsedResult">
        <!-- 总体评价 -->
        <div class="result-module">
          <div class="module-header">
            <div class="module-icon overall">
              <el-icon :size="20"><Trophy /></el-icon>
            </div>
            <div class="module-title">总体评价</div>
          </div>
          <div class="module-body">
            <OverallEvaluation :data="parsedResult.overallEvaluation" />
          </div>
        </div>

        <!-- 亮点概览 -->
        <div class="result-module">
          <div class="module-header">
            <div class="module-icon highlight">
              <el-icon :size="20"><Star /></el-icon>
            </div>
            <div class="module-title">亮点概览</div>
          </div>
          <div class="module-body">
            <HighlightsSection :data="parsedResult.highlights" />
          </div>
        </div>

        <!-- 技能情况 -->
        <div class="result-module">
          <div class="module-header">
            <div class="module-icon skill">
              <el-icon :size="20"><Tools /></el-icon>
            </div>
            <div class="module-title">技能情况</div>
          </div>
          <div class="module-body">
            <SkillsSection :data="parsedResult.skillEvaluation" />
          </div>
        </div>

        <!-- 基础信息完整度 -->
        <div class="result-module">
          <div class="module-header">
            <div class="module-icon basic">
              <el-icon :size="20"><User /></el-icon>
            </div>
            <div class="module-title">基础信息完整度</div>
          </div>
          <div class="module-body">
            <BasicInfoSection :data="parsedResult.basicInfoEvaluation" />
          </div>
        </div>

        <!-- 工作与项目经验 -->
        <div class="result-module">
          <div class="module-header">
            <div class="module-icon experience">
              <el-icon :size="20"><Briefcase /></el-icon>
            </div>
            <div class="module-title">工作与项目经验</div>
          </div>
          <div class="module-body">
            <WorkExperienceSection :data="workExperienceData" />
          </div>
        </div>

        <!-- 优化建议 -->
        <div class="result-module">
          <div class="module-header">
            <div class="module-icon optimization">
              <el-icon :size="20"><Edit /></el-icon>
            </div>
            <div class="module-title">优化建议</div>
          </div>
          <div class="module-body">
            <OptimizationSection :data="parsedResult.optimizationSuggestions" />
          </div>
        </div>
      </template>

      <!-- 原始结果回退显示（当解析失败时） -->
      <div v-else-if="isCompleted && task.diagnosisResult" class="result-card fallback">
        <div class="result-header">
          <h3 class="result-title">诊断结果</h3>
          <el-tag v-if="!parsedResult" type="warning" size="small">原始数据</el-tag>
        </div>
        <div class="result-content">
          <pre class="result-pre">{{ formatRawResult(task.diagnosisResult) }}</pre>
        </div>
      </div>

      <!-- 失败提示区（仅失败时显示） -->
      <div v-if="isFailed" class="failed-card">
        <div class="failed-icon">
          <el-icon :size="32" color="#f56c6c"><WarningFilled /></el-icon>
        </div>
        <div class="failed-content">
          <div class="failed-title">诊断失败</div>
          <div class="failed-desc">
            {{ task.errorMsg || '请稍后重试' }}
          </div>
        </div>
      </div>

      <!-- 操作区 -->
      <div class="actions-card">
        <div class="actions-group">
          <el-button @click="goToHome">返回首页</el-button>
          <el-button @click="goToUpload">继续上传</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Loading,
  CircleClose,
  CircleCheck,
  Clock,
  WarningFilled,
  Trophy,
  Star,
  Tools,
  User,
  Briefcase,
  Edit,
  Warning,
  InfoFilled
} from '@element-plus/icons-vue'
import { getResumeTask } from '@/api/resume'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

// 导入结构化展示组件
import OverallEvaluation from '@/components/resume/OverallEvaluation.vue'
import HighlightsSection from '@/components/resume/HighlightsSection.vue'
import SkillsSection from '@/components/resume/SkillsSection.vue'
import BasicInfoSection from '@/components/resume/BasicInfoSection.vue'
import WorkExperienceSection from '@/components/resume/WorkExperienceSection.vue'
import OptimizationSection from '@/components/resume/OptimizationSection.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 状态
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const task = ref(null)
const pollTimer = ref(null)
const hasRefreshedUserInfo = ref(false)

// 任务ID
const taskId = computed(() => route.params.taskId)

// 状态判断
const isPending = computed(() => task.value?.status === 0)
const isProcessing = computed(() => task.value?.status === 1)
const isCompleted = computed(() => task.value?.status === 2)
const isFailed = computed(() => task.value?.status === 3)

// 状态文本
const statusText = computed(() => {
  switch (task.value?.status) {
    case 0:
      return '排队中'
    case 1:
      return '解析分析中'
    case 2:
      return '已完成'
    case 3:
      return '已失败'
    default:
      return '未知状态'
  }
})

// 状态图标
const statusIcon = computed(() => {
  switch (task.value?.status) {
    case 0:
      return Clock
    case 1:
      return Loading
    case 2:
      return CircleCheck
    case 3:
      return WarningFilled
    default:
      return Clock
  }
})

// 状态样式类
const statusClass = computed(() => {
  switch (task.value?.status) {
    case 0:
      return 'status-pending'
    case 1:
      return 'status-processing'
    case 2:
      return 'status-completed'
    case 3:
      return 'status-failed'
    default:
      return ''
  }
})

// 解析诊断结果
const parsedResult = computed(() => {
  if (!task.value?.diagnosisResult) return null

  try {
    const result = typeof task.value.diagnosisResult === 'string'
      ? JSON.parse(task.value.diagnosisResult)
      : task.value.diagnosisResult

    // 确保返回的对象包含各个模块
    return {
      overallEvaluation: result.overallEvaluation || result.overall || {},
      highlights: result.highlights || result.strengths || [],
      skillEvaluation: result.skillEvaluation || result.skills || {},
      basicInfoEvaluation: result.basicInfoEvaluation || result.basicInfo || {},
      workExperienceEvaluation: result.workExperienceEvaluation || result.experience || {},
      projectExperienceEvaluation: result.projectExperienceEvaluation || result.projects || {},
      optimizationSuggestions: result.optimizationSuggestions || result.suggestions || []
    }
  } catch (e) {
    console.error('解析诊断结果失败:', e)
    return null
  }
})

// 工作经验数据（合并工作和项目经验）
const workExperienceData = computed(() => {
  if (!parsedResult.value) return {}

  return {
    workScore: parsedResult.value.workExperienceEvaluation?.score,
    projectScore: parsedResult.value.projectExperienceEvaluation?.score,
    workExperiences: parsedResult.value.workExperienceEvaluation?.experiences ||
      parsedResult.value.workExperienceEvaluation?.items,
    projectExperiences: parsedResult.value.projectExperienceEvaluation?.projects ||
      parsedResult.value.projectExperienceEvaluation?.items,
    issues: [
      ...(parsedResult.value.workExperienceEvaluation?.issues || []),
      ...(parsedResult.value.projectExperienceEvaluation?.issues || [])
    ],
    suggestions: [
      ...(parsedResult.value.workExperienceEvaluation?.suggestions || []),
      ...(parsedResult.value.projectExperienceEvaluation?.suggestions || [])
    ]
  }
})

// 时间格式化
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化原始结果（用于回退显示）
const formatRawResult = (result) => {
  if (!result) return ''
  try {
    if (typeof result === 'string') {
      // 尝试解析并格式化JSON
      const parsed = JSON.parse(result)
      return JSON.stringify(parsed, null, 2)
    }
    return JSON.stringify(result, null, 2)
  } catch (e) {
    return String(result)
  }
}

// 获取任务详情
const fetchTaskDetail = async () => {
  if (!taskId.value) {
    error.value = '任务ID不存在'
    loading.value = false
    return
  }

  if (refreshing.value) return

  if (!loading.value) {
    refreshing.value = true
  }

  error.value = ''

  try {
    const res = await getResumeTask(taskId.value)
    const previousStatus = task.value?.status
    task.value = res.data
    loading.value = false
    refreshing.value = false

    // 如果任务刚刚完成，刷新用户额度信息
    if (isCompleted.value && previousStatus !== 2 && !hasRefreshedUserInfo.value) {
      hasRefreshedUserInfo.value = true
      await userStore.fetchUserInfo()
      ElMessage.success('简历诊断已完成')
    }
  } catch (err) {
    console.error('获取任务详情失败:', err)
    error.value = err.message || '获取任务详情失败，请稍后重试'
    loading.value = false
    refreshing.value = false
  }
}

// 轮询任务状态（仅处理中时）
const startPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
  }

  // 每3秒轮询一次
  pollTimer.value = setInterval(() => {
    if (isProcessing.value || isPending.value) {
      fetchTaskDetail()
    } else {
      // 任务完成或失败，停止轮询
      stopPolling()
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

// 跳转
const goToHome = () => {
  router.push('/')
}

const goToUpload = () => {
  router.push('/resume/upload')
}

// 生命周期
onMounted(() => {
  fetchTaskDetail()
})

onUnmounted(() => {
  stopPolling()
})

// 监听任务状态变化，处理中时启动轮询
const unwatch = watch(isProcessing, (newVal) => {
  if (newVal || isPending.value) {
    startPolling()
  } else {
    stopPolling()
  }
}, { immediate: true })

onUnmounted(() => {
  unwatch()
})
</script>

<style scoped>
.resume-result-view {
  min-height: 100%;
}

/* 页面标题区 */
.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 500;
  color: #303133;
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

/* 加载状态 */
.loading-section {
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: #606266;
}

/* 错误状态 */
.error-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.error-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 32px;
  max-width: 500px;
}

.error-content {
  flex: 1;
}

.error-title {
  font-size: 16px;
  font-weight: 500;
  color: #f56c6c;
  margin-bottom: 8px;
}

.error-desc {
  font-size: 14px;
  color: #606266;
  margin-bottom: 16px;
}

.error-actions {
  display: flex;
  gap: 12px;
}

/* 任务卡片通用 */
.status-card,
.result-module,
.failed-card,
.actions-card,
.result-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 16px;
}

.status-card,
.failed-card,
.actions-card {
  padding: 24px;
}

.result-card {
  padding: 0;
  overflow: hidden;
}

.result-card.fallback {
  padding: 24px;
}

/* 任务状态区 */
.status-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon.status-pending {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.status-icon.status-processing {
  background-color: #ecf5ff;
  color: #409eff;
}

.status-icon.status-completed {
  background-color: #f0f9eb;
  color: #67c23a;
}

.status-icon.status-failed {
  background-color: #fef0f0;
  color: #f56c6c;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.status-time {
  font-size: 13px;
  color: #909399;
}

.status-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f7fa;
}

/* 结果模块样式 */
.result-module {
  overflow: hidden;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.module-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-icon.overall {
  background-color: #f0f9eb;
  color: #67c23a;
}

.module-icon.highlight {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.module-icon.skill {
  background-color: #ecf5ff;
  color: #409eff;
}

.module-icon.basic {
  background-color: #f5f0ff;
  color: #a855f7;
}

.module-icon.experience {
  background-color: #fff7ed;
  color: #f97316;
}

.module-icon.optimization {
  background-color: #f0f9eb;
  color: #22c55e;
}

.module-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.module-body {
  padding: 20px;
}

/* 原始结果回退显示 */
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
}

.result-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.result-content {
  line-height: 1.8;
}

.result-pre {
  font-size: 13px;
  color: #606266;
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

/* 失败提示区 */
.failed-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background-color: #fef0f0;
  border-color: #fde2e2;
}

.failed-content {
  flex: 1;
}

.failed-title {
  font-size: 15px;
  font-weight: 500;
  color: #f56c6c;
  margin-bottom: 6px;
}

.failed-desc {
  font-size: 14px;
  color: #606266;
}

/* 操作区 */
.actions-card {
  display: flex;
  justify-content: center;
}

.actions-group {
  display: flex;
  gap: 12px;
}
</style>
