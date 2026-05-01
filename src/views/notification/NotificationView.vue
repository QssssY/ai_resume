<template>
  <div class="notification-page">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">消息通知</h1>
        <span class="unread-badge" v-if="unreadCount > 0">{{ unreadCount }} 条未读</span>
      </div>
      <el-button
        v-if="unreadCount > 0"
        type="primary"
        plain
        size="small"
        @click="handleMarkAllRead"
        :loading="markAllLoading"
      >
        全部已读
      </el-button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filterType" placeholder="通知类型" clearable size="small" @change="handleFilterChange">
        <el-option label="全部类型" value="" />
        <el-option label="简历诊断" value="resume" />
        <el-option label="AI 润色" value="polish" />
        <el-option label="模拟面试" value="interview" />
        <el-option label="额度提醒" value="quota" />
        <el-option label="系统通知" value="system" />
      </el-select>
      <el-select v-model="filterReadStatus" placeholder="已读状态" clearable size="small" @change="handleFilterChange">
        <el-option label="全部状态" value="" />
        <el-option label="未读" :value="0" />
        <el-option label="已读" :value="1" />
      </el-select>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner"></span>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="notifications.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <p class="empty-text">暂无消息通知</p>
      <p class="empty-desc">当有新的诊断结果、润色报告或面试反馈时，会在这里通知你</p>
    </div>

    <!-- 通知列表 -->
    <div v-else class="notification-list">
      <div
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: item.readStatus === 0 }"
        @click="handleItemClick(item)"
      >
        <!-- 类型图标 -->
        <div class="item-icon" :class="`type-${item.type}`">
          <svg v-if="item.type === 'resume'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <svg v-else-if="item.type === 'polish'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <svg v-else-if="item.type === 'interview'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <svg v-else-if="item.type === 'quota'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <!-- 内容区 -->
        <div class="item-content">
          <div class="item-header">
            <span class="item-title">{{ item.title }}</span>
            <el-tag :type="getTypeTagType(item.type)" size="small" effect="plain">
              {{ getTypeLabel(item.type) }}
            </el-tag>
          </div>
          <p class="item-text">{{ item.content }}</p>
          <span class="item-time">{{ formatTime(item.createTime) }}</span>
        </div>

        <!-- 未读标记 -->
        <div v-if="item.readStatus === 0" class="unread-dot"></div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/api/notification'

const router = useRouter()

// 列表数据
const notifications = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const unreadCount = ref(0)

// 筛选条件
const filterType = ref('')
const filterReadStatus = ref('')

// 全部已读按钮加载状态
const markAllLoading = ref(false)

/**
 * 获取通知列表
 */
const fetchNotifications = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      size: pageSize.value
    }
    if (filterType.value) params.type = filterType.value
    if (filterReadStatus.value !== '' && filterReadStatus.value !== null) params.readStatus = filterReadStatus.value

    const res = await getNotifications(params)
    if (res.code === 200) {
      notifications.value = res.data.records || []
      total.value = res.data.total || 0
      unreadCount.value = res.data.unreadCount || 0
    }
  } catch (e) {
    console.error('获取通知列表失败', e)
  } finally {
    loading.value = false
  }
}

/**
 * 获取未读数量
 */
const fetchUnreadCount = async () => {
  try {
    const res = await getUnreadCount()
    if (res.code === 200) {
      unreadCount.value = res.data.unreadCount || 0
    }
  } catch (e) {
    console.error('获取未读数量失败', e)
  }
}

/**
 * 筛选条件变化
 */
const handleFilterChange = () => {
  currentPage.value = 1
  fetchNotifications()
}

/**
 * 分页切换
 */
const handlePageChange = (page) => {
  currentPage.value = page
  fetchNotifications()
}

/**
 * 点击单条通知，标记已读并跳转
 */
const handleItemClick = async (item) => {
  // 未读时标记已读
  if (item.readStatus === 0) {
    try {
      await markAsRead(item.id)
      item.readStatus = 1
      item.readTime = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (e) {
      console.error('标记已读失败', e)
    }
  }

  // 根据业务类型跳转
  if (item.bizType === 'resume_diagnosis' && item.bizId) {
    router.push(`/resume/result/${item.bizId}`)
  } else if (item.bizType === 'resume_polish' && item.bizId) {
    router.push(`/resume/result/${item.bizId}`)
  } else if (item.bizType === 'mock_interview' && item.bizId) {
    router.push(`/interview/report/${item.bizId}`)
  }
}

/**
 * 全部已读
 */
const handleMarkAllRead = async () => {
  markAllLoading.value = true
  try {
    await markAllAsRead()
    unreadCount.value = 0
    notifications.value.forEach(item => {
      if (item.readStatus === 0) {
        item.readStatus = 1
        item.readTime = new Date().toISOString()
      }
    })
    ElMessage.success('已全部标记为已读')
  } catch (e) {
    // 错误提示已由 axios 拦截器统一处理，此处不再重复
    console.error('全部已读操作失败', e)
  } finally {
    markAllLoading.value = false
  }
}

/**
 * 通知类型标签样式
 */
const getTypeTagType = (type) => {
  const map = { resume: 'warning', polish: '', interview: 'success', quota: 'danger', system: 'info' }
  return map[type] || 'info'
}

/**
 * 通知类型文本
 */
const getTypeLabel = (type) => {
  const map = { resume: '简历诊断', polish: 'AI润色', interview: '模拟面试', quota: '额度提醒', system: '系统' }
  return map[type] || '通知'
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

onMounted(() => {
  fetchNotifications()
})
</script>

<style scoped>
.notification-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 页面标题区 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-title, #1a1a1a);
  margin: 0;
}

.unread-badge {
  font-size: 13px;
  color: #ff8c42;
  background: rgba(255, 140, 66, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 500;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-bar .el-select {
  width: 140px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 0;
  color: #999;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #ff8c42;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #ddd;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 13px;
  color: #bbb;
  margin: 0;
  text-align: center;
}

/* 通知列表 */
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-card, #f0f0f0);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.notification-item:hover {
  border-color: #ffecd9;
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.08);
}

.notification-item.unread {
  background: #fffbf8;
  border-color: #ffe0c4;
}

/* 类型图标 */
.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon svg {
  width: 20px;
  height: 20px;
}

.item-icon.type-resume {
  background: rgba(255, 140, 66, 0.1);
  color: #ff8c42;
}

.item-icon.type-polish {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.item-icon.type-interview {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.item-icon.type-quota {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.item-icon.type-system {
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
}

/* 内容区 */
.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-title, #1a1a1a);
}

.item-text {
  font-size: 13px;
  color: var(--text-body, #666);
  margin: 0 0 6px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 12px;
  color: var(--text-muted, #aaa);
}

/* 未读点 */
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff8c42;
  flex-shrink: 0;
  margin-top: 6px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 响应式 */
@media (max-width: 600px) {
  .notification-page {
    padding: 16px 12px;
  }

  .page-title {
    font-size: 18px;
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-bar .el-select {
    width: 100%;
  }

  .notification-item {
    padding: 12px;
  }

  .item-text {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>
