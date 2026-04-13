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

// 分离数据源：用于统计和展示
const allResumeHistoryForStats = ref([])
const allInterviewHistoryForStats = ref([])
const allResumeHistoryForDisplay = ref([])
const allInterviewHistoryForDisplay = ref([])

/**
 * 从 API 响应中提取列表数据
 */
const extractListFromResponse = (res) => {
  if (!res) return []
  if (Array.isArray(res.data)) {
    return res.data
  }
  if (res.data && typeof res.data === 'object') {
    const listFields = ['list', 'records', 'rows', 'data']
    for (const field of listFields) {
      if (Array.isArray(res.data[field])) {
        return res.data[field]
      }
    }
  }
  if (res && typeof res === 'object') {
    const listFields = ['list', 'records', 'rows', 'data']
    for (const field of listFields) {
      if (Array.isArray(res[field])) {
        return res[field]
      }
    }
  }
  return []
}

/**
 * 判断给定时间是否为本月
 */
const isCurrentMonth = (timeValue) => {
  if (!timeValue) return false
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const itemDate = new Date(timeValue)
  if (isNaN(itemDate.getTime())) return false
  return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
}

/**
 * 从记录项中提取时间字段值
 */
const extractTimeFromRecord = (item) => {
  if (!item) return null
  return item.createTime ||
         item.createdAt ||
         item.startTime ||
         item.created_time ||
         item.updateTime ||
         item.updatedAt ||
         null
}

// 本月诊断统计
const resumeCountThisMonth = computed(() => {
  return allResumeHistoryForStats.value.filter(item => {
    const timeValue = extractTimeFromRecord(item)
    return isCurrentMonth(timeValue)
  }).length
})

// 本月面试统计
const interviewCountThisMonth = computed(() => {
  return allInterviewHistoryForStats.value.filter(item => {
    const timeValue = extractTimeFromRecord(item)
    return isCurrentMonth(timeValue)
  }).length
})

// 状态映射 - 橙色主题
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

// 最近记录
const recentResumeRecords = computed(() => {
  return allResumeHistoryForDisplay.value.slice(0, 5).map(item => ({
    taskId: item.taskId,
    fileName: extractFileName(item.fileUrl),
    time: formatTime(extractTimeFromRecord(item)),
    statusText: getStatusText(item.status),
    statusClass: getStatusClass(item.status)
  }))
})

const recentInterviewRecords = computed(() => {
  return allInterviewHistoryForDisplay.value.slice(0, 5).map(item => ({
    sessionId: item.sessionId,
    jobRole: item.jobRole,
    time: formatTime(extractTimeFromRecord(item)),
    score: item.comprehensiveScore ?? item.score,
    status: item.status,
    difficulty: item.difficulty,
    mode: item.interviewMode || item.mode || 'normal'
  }))
})

// 获取简历诊断历史记录
const fetchResumeHistory = async () => {
  try {
    const resStats = await getResumeHistory({ pageNum: 1, pageSize: 1000 })
    allResumeHistoryForStats.value = extractListFromResponse(resStats)
    const resDisplay = await getResumeHistory({ pageNum: 1, pageSize: 10 })
    allResumeHistoryForDisplay.value = extractListFromResponse(resDisplay)
    const sortByTime = (a, b) => {
      const timeA = new Date(extractTimeFromRecord(a)).getTime()
      const timeB = new Date(extractTimeFromRecord(b)).getTime()
      return timeB - timeA
    }
    allResumeHistoryForStats.value.sort(sortByTime)
    allResumeHistoryForDisplay.value.sort(sortByTime)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[首页] 获取简历诊断历史失败:', err)
    }
  }
}

// 获取模拟面试历史记录
const fetchInterviewHistory = async () => {
  try {
    const resStats = await getInterviewHistory({ pageNum: 1, pageSize: 1000 })
    allInterviewHistoryForStats.value = extractListFromResponse(resStats)
    const resDisplay = await getInterviewHistory({ pageNum: 1, pageSize: 10 })
    allInterviewHistoryForDisplay.value = extractListFromResponse(resDisplay)
    const sortByTime = (a, b) => {
      const timeA = new Date(extractTimeFromRecord(a)).getTime()
      const timeB = new Date(extractTimeFromRecord(b)).getTime()
      return timeB - timeA
    }
    allInterviewHistoryForStats.value.sort(sortByTime)
    allInterviewHistoryForDisplay.value.sort(sortByTime)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[首页] 获取模拟面试历史失败:', err)
    }
  }
}

// 页面加载时获取用户信息和历史记录
onMounted(() => {
  if (userStore.isLoggedIn() && !userStore.userInfo) {
    userStore.fetchUserInfo()
  }
  fetchResumeHistory()
  fetchInterviewHistory()
})

const startResumeDiagnosis = () => {
  router.push('/resume/upload')
}

const startInterview = () => {
  router.push('/interview/entry')
}

// 查看全部简历诊断
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
  font-size: 24px;
  font-weight: 600;
  color: #2F2F2F;
}

.welcome-desc {
  margin: 6px 0 0 0;
  font-size: 14px;
  color: #888888;
}

.quota-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background-color: #FFFFFF;
  border: 1px solid #F3D8C7;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.08);
}

.quota-label {
  font-size: 13px;
  color: #888888;
}

.quota-value {
  font-size: 14px;
  font-weight: 600;
  color: #FF8C42;
}

/* 数据概览区 */
.stats-section {
  margin-bottom: 24px;
}

.stats-bar {
  background-color: #FFFFFF;
  border: 1px solid #F3D8C7;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(255, 140, 66, 0.06);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  text-align: center;
}

.stat-label {
  font-size: 13px;
  color: #888888;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #FF8C42;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background-color: #F3D8C7;
}

/* 最近记录区 */
.records-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.column {
  background-color: #FFFFFF;
  border: 1px solid #F3D8C7;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(255, 140, 66, 0.06);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #F3D8C7;
}

.column-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2F2F2F;
}

.record-list {
  min-height: 120px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #FFF8F3;
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
  color: #555555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-time {
  font-size: 12px;
  color: #888888;
}

.record-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* 状态样式 - 橙色主题 */
.status-success {
  background-color: #FFF3E8;
  color: #FF8C42;
}

.status-processing {
  background-color: #FFF3E8;
  color: #FF8C42;
}

.status-pending {
  background-color: #FFF8F3;
  color: #E6A23C;
}

.status-failed {
  background-color: #FEF0F0;
  color: #F56C6C;
}

.record-score {
  font-size: 14px;
  font-weight: 600;
  color: #FF8C42;
  flex-shrink: 0;
}

.empty-records {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
}

.empty-text {
  font-size: 13px;
  color: #888888;
}
</style>
