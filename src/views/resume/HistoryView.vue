<template>
  <div class="resume-history-view">
    <!-- 页面标题区 -->
    <div class="page-header">
      <h1 class="page-title">诊断历史</h1>
      <p class="page-desc">查看您所有的简历诊断记录</p>
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
            <el-button type="primary" @click="fetchHistory">重试</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="historyList.length === 0" class="empty-section">
      <div class="empty-content">
        <el-icon :size="64" color="#dcdfe6"><Document /></el-icon>
        <div class="empty-title">暂无诊断记录</div>
        <div class="empty-desc">您还没有进行过简历诊断，上传简历开始您的第一次诊断吧</div>
        <el-button type="primary" @click="goToUpload">去上传简历</el-button>
      </div>
    </div>

    <!-- 历史记录列表 -->
    <div v-else class="history-list">
      <div class="history-card">
        <el-table
          :data="historyList"
          stripe
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 500 }"
        >
          <!-- 文件名 -->
          <el-table-column label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="file-name-cell">
                <el-icon :size="16" color="#409eff"><Document /></el-icon>
                <span class="file-name" :title="getFileName(row)">{{ getFileName(row) }}</span>
              </div>
            </template>
          </el-table-column>

          <!-- 任务ID -->
          <el-table-column label="任务ID" width="120">
            <template #default="{ row }">
              <span class="task-id">{{ row.taskId }}</span>
            </template>
          </el-table-column>

          <!-- 状态 -->
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 创建时间 -->
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              <span class="create-time">{{ formatTime(row.createTime) }}</span>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click="viewResult(row)"
              >
                查看结果
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 刷新按钮 -->
      <div class="refresh-section">
        <el-button :loading="refreshing" @click="fetchHistory">
          <el-icon><Refresh /></el-icon>
          刷新列表
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Loading,
  CircleClose,
  Document,
  Refresh
} from '@element-plus/icons-vue'
import { getResumeHistory, extractFileName } from '@/api/resume'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 状态
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const historyList = ref([])

// 状态映射
const statusMap = {
  0: { text: '排队中', type: 'warning' },
  1: { text: '解析中', type: 'primary' },
  2: { text: '已完成', type: 'success' },
  3: { text: '失败', type: 'danger' }
}

// 获取状态文本
const getStatusText = (status) => {
  return statusMap[status]?.text || '未知'
}

// 获取状态类型
const getStatusType = (status) => {
  return statusMap[status]?.type || 'info'
}

// 获取文件名
const getFileName = (row) => {
  return extractFileName(row.fileUrl)
}

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

// 获取历史记录
const fetchHistory = async () => {
  if (refreshing.value) return

  if (!loading.value) {
    refreshing.value = true
  }

  error.value = ''

  try {
    const res = await getResumeHistory()
    historyList.value = res.data || []
    loading.value = false
    refreshing.value = false
  } catch (err) {
    console.error('获取历史记录失败:', err)
    error.value = err.message || '获取历史记录失败，请稍后重试'
    loading.value = false
    refreshing.value = false
  }
}

// 查看结果
const viewResult = (row) => {
  // 跳转到结果页，与 ResultView.vue 读取 taskId 的方式保持一致
  router.push(`/resume/result/${row.taskId}`)
}

// 去上传页面
const goToUpload = () => {
  router.push('/resume/upload')
}

// 生命周期
onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.resume-history-view {
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

.error-icon {
  flex-shrink: 0;
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

/* 空状态 */
.empty-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 16px 0 8px;
}

.empty-desc {
  font-size: 14px;
  color: #909399;
  margin-bottom: 24px;
  max-width: 400px;
}

/* 历史记录列表 */
.history-list {
  margin-bottom: 24px;
}

.history-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

/* 文件名单元格 */
.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

/* 任务ID */
.task-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #606266;
}

/* 创建时间 */
.create-time {
  font-size: 13px;
  color: #606266;
}

/* 刷新按钮区域 */
.refresh-section {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
