<template>
  <div class="interview-history-view">
    <!-- 页面标题区 -->
    <div class="page-header">
      <h1 class="page-title">模拟面试历史</h1>
      <p class="page-desc">查看您的模拟面试记录和会话详情</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-section">
      <div class="loading-content">
        <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
        <div class="loading-text">加载面试历史...</div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-section">
      <el-result
        icon="error"
        title="加载失败"
        :sub-title="error"
      >
        <template #extra>
          <el-button type="primary" @click="fetchHistory">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- 空状态 -->
    <div v-else-if="total === 0" class="empty-section">
      <el-result
        icon="info"
        title="暂无面试记录"
        sub-title="您还没有进行过模拟面试，点击开始面试体验一下吧"
      >
        <template #extra>
          <el-button type="primary" @click="startNewInterview">开始面试</el-button>
        </template>
      </el-result>
    </div>

    <!-- 历史列表 -->
    <div v-else class="history-list">
      <div
        v-for="item in historyList"
        :key="item.sessionId"
        class="history-card"
      >
        <div class="card-header">
          <div class="header-left">
            <h3 class="job-role">{{ item.jobRole }}</h3>
            <el-tag :type="getDifficultyType(item.difficulty)" size="small">
              {{ item.difficultyDesc || getDifficultyText(item.difficulty) }}
            </el-tag>
          </div>
          <div class="header-right">
            <el-tag :type="getStatusType(item.status)" effect="light">
              {{ item.statusDesc || getStatusText(item.status) }}
            </el-tag>
          </div>
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="info-label">创建时间:</span>
            <span class="info-value">{{ formatTime(item.createTime) }}</span>
          </div>
          <div class="info-row" v-if="item.comprehensiveScore !== null && item.comprehensiveScore !== undefined">
            <span class="info-label">综合评分:</span>
            <span class="info-value score">{{ item.comprehensiveScore }} 分</span>
          </div>
          <div class="info-row" v-if="item.messageCount !== null && item.messageCount !== undefined">
            <span class="info-label">消息数量:</span>
            <span class="info-value">
              <el-icon><ChatDotRound /></el-icon>
              {{ item.messageCount }} 条
            </span>
          </div>
        </div>

        <div class="card-footer">
          <div class="footer-left">
          </div>
          <div class="footer-right">
            <el-button
              v-if="item.status === 0"
              type="primary"
              size="small"
              @click="continueSession(item.sessionId)"
            >
              继续面试
            </el-button>
            <el-button
              v-else
              type="primary"
              size="small"
              plain
              @click="viewSession(item.sessionId)"
            >
              查看会话
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页器 -->
    <div v-if="total > 0" class="pagination-section">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading, ChatDotRound } from '@element-plus/icons-vue'
import { getInterviewHistory } from '@/api/interview'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 状态
const loading = ref(true)
const error = ref('')
const historyList = ref([])

// 分页状态 - 默认 pageSize 为 5
const pageNum = ref(1)
const pageSize = ref(5)
const total = ref(0)
const totalPages = ref(0)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

// 难度映射
const difficultyMap = {
  1: { text: '初级', type: 'success' },
  2: { text: '中级', type: 'warning' },
  3: { text: '高级', type: 'danger' }
}

// 状态映射
const statusMap = {
  0: { text: '进行中', type: 'success' },
  1: { text: '已结束', type: 'info' }
}

const getDifficultyText = (difficulty) => {
  return difficultyMap[difficulty]?.text || '未知'
}

const getDifficultyType = (difficulty) => {
  return difficultyMap[difficulty]?.type || 'info'
}

const getStatusText = (status) => {
  return statusMap[status]?.text || '未知'
}

const getStatusType = (status) => {
  return statusMap[status]?.type || 'info'
}

// 时间格式化
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取历史记录
const fetchHistory = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await getInterviewHistory({ pageNum: pageNum.value, pageSize: pageSize.value })

    // 解析分页响应
    if (res.data) {
      if (Array.isArray(res.data)) {
        // 兼容非分页响应
        historyList.value = res.data
        total.value = res.data.length
      } else if (res.data.list && Array.isArray(res.data.list)) {
        // 分页响应
        historyList.value = res.data.list
        total.value = res.data.total || 0
        pageNum.value = res.data.pageNum || 1
        pageSize.value = res.data.pageSize || 5
        totalPages.value = res.data.totalPages || 0
        hasNextPage.value = res.data.hasNextPage || false
        hasPreviousPage.value = res.data.hasPreviousPage || false
      } else {
        historyList.value = []
        total.value = 0
      }
    } else {
      historyList.value = []
      total.value = 0
    }
  } catch (err) {
    console.error('获取面试历史失败:', err)
    error.value = err.message || '获取面试历史失败，请稍后重试'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

// 分页事件处理
const handleSizeChange = (val) => {
  pageSize.value = val
  pageNum.value = 1
  fetchHistory()
}

const handleCurrentChange = (val) => {
  pageNum.value = val
  fetchHistory()
}

// 开始新面试
const startNewInterview = () => {
  router.push('/interview/entry')
}

// 继续面试 - sessionId 仅用于内部跳转
const continueSession = (sessionId) => {
  router.push(`/interview/session/${sessionId}`)
}

// 查看会话 - sessionId 仅用于内部跳转
const viewSession = (sessionId) => {
  router.push(`/interview/session/${sessionId}`)
}

// 生命周期
onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.interview-history-view {
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #606266;
}

/* 空状态 */
.empty-section {
  padding: 40px 0;
}

/* 历史列表 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.history-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.history-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f5f7fa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.job-role {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.header-right {
  flex-shrink: 0;
}

/* 卡片内容 */
.card-body {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #909399;
  width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-value.score {
  color: #409eff;
  font-weight: 500;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f5f7fa;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
}

/* 分页器 */
.pagination-section {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
  }

  .header-left {
    width: 100%;
  }

  .card-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .footer-right {
    width: 100%;
    justify-content: stretch;
  }

  .footer-right .el-button {
    flex: 1;
  }
}
</style>
