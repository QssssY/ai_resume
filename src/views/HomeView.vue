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

// 【关键修改】分离数据源：
// - allResumeHistoryForStats / allInterviewHistoryForStats: 用于统计（大分页）
// - allResumeHistoryForDisplay / allInterviewHistoryForDisplay: 用于列表展示
const allResumeHistoryForStats = ref([])
const allInterviewHistoryForStats = ref([])
const allResumeHistoryForDisplay = ref([])
const allInterviewHistoryForDisplay = ref([])

/**
 * 从 API 响应中提取列表数据
 * 兼容多种分页响应结构：
 * - res.data (直接是数组)
 * - res.data.list / res.data.records / res.data.rows
 * - res.data.data (嵌套一层)
 *
 * @param {Object} res - API 响应对象
 * @returns {Array} 提取出的列表数据
 */
const extractListFromResponse = (res) => {
  if (!res) return []

  // 情况1: res.data 直接是数组
  if (Array.isArray(res.data)) {
    return res.data
  }

  // 情况2: res.data 是对象，检查各种可能的列表字段
  if (res.data && typeof res.data === 'object') {
    const listFields = ['list', 'records', 'rows', 'data']
    for (const field of listFields) {
      if (Array.isArray(res.data[field])) {
        return res.data[field]
      }
    }
  }

  // 情况3: 直接检查 res 下的字段（有些响应结构没有 data 包装）
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
 * 统一封装本月判断逻辑，避免重复代码
 *
 * @param {string|Date} timeValue - 时间值（字符串或 Date 对象）
 * @returns {boolean} 是否为本月
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
 * 兼容多种时间字段名：createTime / createdAt / startTime / created_time / updateTime / updatedAt
 *
 * @param {Object} item - 记录项对象
 * @returns {string|Date|null} 提取到的时间值
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

// 本月诊断统计（基于统计专用数据源计算）
const resumeCountThisMonth = computed(() => {
  return allResumeHistoryForStats.value.filter(item => {
    const timeValue = extractTimeFromRecord(item)
    return isCurrentMonth(timeValue)
  }).length
})

// 本月面试统计（基于统计专用数据源计算）
const interviewCountThisMonth = computed(() => {
  return allInterviewHistoryForStats.value.filter(item => {
    const timeValue = extractTimeFromRecord(item)
    return isCurrentMonth(timeValue)
  }).length
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

// 最近记录 - 从展示专用数据源获取最多5条
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

/**
 * 获取简历诊断历史记录（分离统计和展示数据源）
 * 统计数据使用大分页（pageSize=1000），展示数据使用正常分页（pageSize=10）
 */
const fetchResumeHistory = async () => {
  try {
    // 统计用：大分页，获取尽可能多的数据用于准确统计
    const resStats = await getResumeHistory({ pageNum: 1, pageSize: 1000 })
    allResumeHistoryForStats.value = extractListFromResponse(resStats)

    // 展示用：正常分页，用于最近记录列表
    const resDisplay = await getResumeHistory({ pageNum: 1, pageSize: 10 })
    allResumeHistoryForDisplay.value = extractListFromResponse(resDisplay)

    // 统一按时间降序排序
    const sortByTime = (a, b) => {
      const timeA = new Date(extractTimeFromRecord(a)).getTime()
      const timeB = new Date(extractTimeFromRecord(b)).getTime()
      return timeB - timeA
    }
    allResumeHistoryForStats.value.sort(sortByTime)
    allResumeHistoryForDisplay.value.sort(sortByTime)
  } catch (err) {
    // 仅开发环境输出错误日志
    if (import.meta.env.DEV) {
      console.error('[首页] 获取简历诊断历史失败:', err)
    }
  }
}

/**
 * 获取模拟面试历史记录（分离统计和展示数据源）
 * 统计数据使用大分页（pageSize=1000），展示数据使用正常分页（pageSize=10）
 */
const fetchInterviewHistory = async () => {
  try {
    // 统计用：大分页，获取尽可能多的数据用于准确统计
    const resStats = await getInterviewHistory({ pageNum: 1, pageSize: 1000 })
    allInterviewHistoryForStats.value = extractListFromResponse(resStats)

    // 展示用：正常分页，用于最近记录列表
    const resDisplay = await getInterviewHistory({ pageNum: 1, pageSize: 10 })
    allInterviewHistoryForDisplay.value = extractListFromResponse(resDisplay)

    // 统一按时间降序排序
    const sortByTime = (a, b) => {
      const timeA = new Date(extractTimeFromRecord(a)).getTime()
      const timeB = new Date(extractTimeFromRecord(b)).getTime()
      return timeB - timeA
    }
    allInterviewHistoryForStats.value.sort(sortByTime)
    allInterviewHistoryForDisplay.value.sort(sortByTime)
  } catch (err) {
    // 仅开发环境输出错误日志
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
