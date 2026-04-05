<template>
  <div class="home-view">
    <!-- 顶部欢迎与状态区 -->
    <div class="welcome-section">
      <div class="welcome-left">
        <h1 class="welcome-title">你好，{{ userStore.userInfo?.username || '用户' }}</h1>
        <p class="welcome-desc">选择以下任务开始使用</p>
      </div>
      <div class="welcome-right">
        <div class="quota-summary">
          <span class="quota-label">剩余额度</span>
          <span class="quota-value">简历 {{ resumeQuotaLeft }} / 面试 {{ interviewQuotaLeft }}</span>
        </div>
      </div>
    </div>

    <!-- 核心任务入口区 -->
    <div class="task-section">
      <div class="task-card resume-card">
        <div class="task-card-header">
          <div class="task-icon resume-icon">简</div>
          <div class="task-info">
            <h3 class="task-title">简历诊断</h3>
            <p class="task-desc">上传简历，获取智能分析与优化建议</p>
          </div>
        </div>
        <div class="task-card-footer">
          <div class="task-quota">
            <span class="quota-text">剩余 {{ resumeQuotaLeft }} 次</span>
          </div>
          <el-button type="primary" size="default" @click="startResumeDiagnosis">
            开始诊断
          </el-button>
        </div>
      </div>

      <div class="task-card interview-card">
        <div class="task-card-header">
          <div class="task-icon interview-icon">面</div>
          <div class="task-info">
            <h3 class="task-title">模拟面试</h3>
            <p class="task-desc">选择岗位与难度，开启AI模拟面试</p>
          </div>
        </div>
        <div class="task-card-footer">
          <div class="task-quota">
            <span class="quota-text">剩余 {{ interviewQuotaLeft }} 次</span>
          </div>
          <el-button type="primary" size="default" @click="startInterview">
            开始面试
          </el-button>
        </div>
      </div>
    </div>

    <!-- 数据概览区 -->
    <div class="stats-section">
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">本月诊断</span>
          <span class="stat-value">{{ resumeCountThisMonth }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">本月面试</span>
          <span class="stat-value">{{ interviewCountThisMonth }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">简历剩余</span>
          <span class="stat-value">{{ resumeQuotaLeft }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">面试剩余</span>
          <span class="stat-value">{{ interviewQuotaLeft }}</span>
        </div>
      </div>
    </div>

    <!-- 最近记录区 -->
    <div class="records-section">
      <div class="column">
        <div class="column-header">
          <h3 class="column-title">最近简历诊断</h3>
          <el-button link type="primary" size="small" @click="viewAllResume">查看全部</el-button>
        </div>
        <div class="record-list">
          <template v-if="recentResumeRecords.length > 0">
            <div v-for="record in recentResumeRecords" :key="record.taskId" class="record-item">
              <div class="record-main">
                <span class="record-name">{{ record.fileName }}</span>
                <span class="record-time">{{ record.time }}</span>
              </div>
              <div class="record-status" :class="record.statusClass">
                {{ record.statusText }}
              </div>
            </div>
          </template>
          <template v-else>
            <div class="empty-records">
              <span class="empty-text">暂无简历诊断记录</span>
              <el-button link type="primary" size="small" @click="startResumeDiagnosis">上传简历</el-button>
            </div>
          </template>
        </div>
      </div>

      <div class="column">
        <div class="column-header">
          <h3 class="column-title">最近模拟面试</h3>
          <el-button link type="primary" size="small" @click="viewAllInterview">查看全部</el-button>
        </div>
        <div class="record-list">
          <template v-if="recentInterviewRecords.length > 0">
            <div v-for="record in recentInterviewRecords" :key="record.sessionId" class="record-item">
              <div class="record-main">
                <span class="record-name">{{ record.jobRole }}</span>
                <span class="record-time">{{ record.time }}</span>
              </div>
              <div class="record-score" v-if="record.score">
                {{ record.score }}分
              </div>
            </div>
          </template>
          <template v-else>
            <div class="empty-records">
              <span class="empty-text">暂无模拟面试记录</span>
              <el-button link type="primary" size="small" @click="startInterview">开始面试</el-button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getResumeHistory, extractFileName } from '@/api/resume'
import { getInterviewHistory } from '@/api/interview'

const router = useRouter()
const userStore = useUserStore()

// 从 store 获取额度数据
const resumeQuotaLeft = computed(() => {
  return userStore.userInfo?.resumeQuota ?? 0
})

const interviewQuotaLeft = computed(() => {
  return userStore.userInfo?.interviewQuota ?? 0
})

// 真实历史记录数据
const allResumeHistory = ref([])
const allInterviewHistory = ref([])

// 本月诊断统计（根据真实数据计算）
const resumeCountThisMonth = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return allResumeHistory.value.filter(item => {
    const itemDate = new Date(item.createTime)
    return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
  }).length
})

const interviewCountThisMonth = ref(0) // 面试数据暂无接口，保持为0

// 最近记录 - 从真实数据获取最多5条
const recentResumeRecords = computed(() => {
  return allResumeHistory.value.slice(0, 5).map(item => ({
    taskId: item.taskId,
    fileName: extractFileName(item.fileUrl),
    time: formatTime(item.createTime),
    statusText: getStatusText(item.status),
    statusClass: getStatusClass(item.status)
  }))
})

const recentInterviewRecords = computed(() => {
  return allInterviewHistory.value.slice(0, 5).map(item => ({
    sessionId: item.sessionId,
    jobRole: item.jobRole,
    time: formatTime(item.createTime),
    score: item.comprehensiveScore ?? item.score,
    status: item.status,
    difficulty: item.difficulty,
    mode: item.interviewMode || item.mode || 'normal'
  }))
})

// 状态映射
const statusMap = {
  0: { text: '排队中', class: 'status-pending' },
  1: { text: '解析中', class: 'status-processing' },
  2: { text: '已完成', class: 'status-success' },
  3: { text: '失败', class: 'status-failed' }
}

const getStatusText = (status) => {
  return statusMap[status]?.text || '未知'
}

const getStatusClass = (status) => {
  return statusMap[status]?.class || ''
}

// 时间格式化
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取简历诊断历史记录
const fetchResumeHistory = async () => {
  try {
    const res = await getResumeHistory()
    // 兼容分页和非分页响应
    let list = []
    if (res.data) {
      if (Array.isArray(res.data)) {
        list = res.data
      } else if (res.data.list && Array.isArray(res.data.list)) {
        list = res.data.list
      }
    }
    // 按创建时间降序排序（最新的在前面）
    allResumeHistory.value = list.sort((a, b) => {
      return new Date(b.createTime) - new Date(a.createTime)
    })
  } catch (err) {
    console.error('获取简历诊断历史失败:', err)
  }
}

// 获取模拟面试历史记录
const fetchInterviewHistory = async () => {
  try {
    const res = await getInterviewHistory()
    // 兼容分页和非分页响应
    let list = []
    if (res.data) {
      if (Array.isArray(res.data)) {
        list = res.data
      } else if (res.data.list && Array.isArray(res.data.list)) {
        list = res.data.list
      }
    }
    // 按创建时间降序排序（最新的在前面）
    allInterviewHistory.value = list.sort((a, b) => {
      return new Date(b.createTime) - new Date(a.createTime)
    })
  } catch (err) {
    console.error('获取模拟面试历史失败:', err)
  }
}

// 页面加载时获取用户信息和历史记录
onMounted(() => {
  if (userStore.isLoggedIn() && !userStore.userInfo) {
    userStore.fetchUserInfo()
  }
  // 获取简历诊断历史记录
  fetchResumeHistory()
  // 获取模拟面试历史记录
  fetchInterviewHistory()
})

const startResumeDiagnosis = () => {
  router.push('/resume/upload')
}

const startInterview = () => {
  router.push('/interview/entry')
}

// 查看全部简历诊断 - 跳转到历史列表页
const viewAllResume = () => {
  router.push('/resume/history')
}

const viewAllInterview = () => {
  router.push('/interview/history')
}
</script>

<style scoped>
.home-view {
  min-height: 100%;
}

/* 顶部欢迎与状态区 */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.welcome-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #303133;
}

.welcome-desc {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #909399;
}

.quota-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.quota-label {
  font-size: 13px;
  color: #606266;
}

.quota-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

/* 核心任务入口区 */
.task-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.task-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.task-card-header {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.task-icon {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  flex-shrink: 0;
}

.resume-icon {
  background-color: #409eff;
}

.interview-icon {
  background-color: #67c23a;
}

.task-info {
  flex: 1;
}

.task-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.task-desc {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.task-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-quota {
  font-size: 13px;
  color: #606266;
}

/* 数据概览区 */
.stats-section {
  margin-bottom: 24px;
}

.stats-bar {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background-color: #e4e7ed;
}

/* 最近记录区 */
.records-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.column {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px 20px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
}

.column-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.record-list {
  min-height: 120px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f7fa;
}

.record-item:last-child {
  border-bottom: none;
}

.record-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.record-name {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-time {
  font-size: 12px;
  color: #c0c4cc;
}

.record-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* 状态样式 */
.status-success {
  background-color: #f0f9eb;
  color: #67c23a;
}

.status-processing {
  background-color: #ecf5ff;
  color: #409eff;
}

.status-pending {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.status-failed {
  background-color: #fef0f0;
  color: #f56c6c;
}

.record-score {
  font-size: 14px;
  font-weight: 500;
  color: #409eff;
  flex-shrink: 0;
}

.empty-records {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
}

.empty-text {
  font-size: 13px;
  color: #909399;
}
</style>
