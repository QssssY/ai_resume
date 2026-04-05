<template>
  <div class="interview-session-view">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="header-left">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1 class="page-title">模拟面试</h1>
      </div>
      <div class="header-right">
        <el-tag :type="sessionStatusType" effect="light">
          {{ sessionStatusText }}
        </el-tag>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-section">
      <div class="loading-content">
        <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
        <div class="loading-text">加载面试会话...</div>
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
          <el-button type="primary" @click="fetchSessionDetail">重试</el-button>
          <el-button @click="goBack">返回</el-button>
        </template>
      </el-result>
    </div>

    <!-- 会话内容区 -->
    <div v-else class="session-content">
      <!-- 配置信息卡片 -->
      <div class="config-card">
        <div class="config-item">
          <span class="config-label">面试岗位</span>
          <span class="config-value">{{ sessionData?.jobRole || '-' }}</span>
        </div>
        <div class="config-divider"></div>
        <div class="config-item">
          <span class="config-label">难度级别</span>
          <el-tag :type="difficultyType" size="small">
            {{ difficultyText }}
          </el-tag>
        </div>
        <div class="config-divider"></div>
        <div class="config-item">
          <span class="config-label">面试模式</span>
          <span class="config-value">{{ modeText }}</span>
        </div>
      </div>

      <!-- 聊天记录区 -->
      <div class="chat-section">
        <div class="chat-header">
          <div class="chat-title">面试对话</div>
          <div class="chat-count">{{ chatLogs.length }} 条消息</div>
        </div>

        <div class="chat-messages" ref="chatContainer">
          <template v-if="chatLogs.length > 0">
            <!-- ===== AI 面试官消息 - 左侧布局 ===== -->
            <template v-for="(msg, index) in chatLogs" :key="index">
              <div v-if="msg.messageRole === 'assistant'" class="message-row assistant-row">
                <div class="message-avatar assistant-avatar">
                  <img :src="assistantAvatar" alt="AI面试官" @error="handleImageError" />
                </div>
                <div class="message-content assistant-content">
                  <div class="message-bubble assistant-bubble">{{ msg.content }}</div>
                  <div class="message-time assistant-time">{{ formatTime(msg.createTime) }}</div>
                </div>
              </div>

              <!-- ===== 用户消息 - 右侧布局 ===== -->
              <div v-else class="message-row user-row">
                <div class="message-content user-content">
                  <div class="message-bubble user-bubble">{{ msg.content }}</div>
                  <div class="message-time user-time">{{ formatTime(msg.createTime) }}</div>
                </div>
                <div class="message-avatar user-avatar">
                  <img :src="userAvatar" alt="用户" @error="handleImageError" />
                </div>
              </div>
            </template>
          </template>

          <div v-else class="empty-chat">
            <el-icon :size="48" color="#dcdfe6"><ChatDotSquare /></el-icon>
            <p>暂无对话记录</p>
            <p class="empty-desc">面试开始后，对话内容将显示在这里</p>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-section" v-if="isInProgress">
        <div class="input-box">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="2"
            placeholder="请输入你的回答..."
            resize="none"
            @keyup.enter.ctrl="sendMessage"
          />
          <div class="input-actions">
            <span class="input-hint">Ctrl + Enter 发送</span>
            <el-button
              type="primary"
              :loading="sending"
              :disabled="!inputMessage.trim()"
              @click="sendMessage"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>

      <!-- 操作区 -->
      <div class="action-section">
        <div class="action-group">
          <el-button v-if="isInProgress" type="danger" plain @click="endInterview">
            结束面试
          </el-button>
          <el-button v-else-if="isEnded" type="primary" @click="viewReport">
            查看评价报告
          </el-button>
          <el-button @click="goBack">返回</el-button>
        </div>
      </div>
    </div>

    <!-- 结束面试确认对话框 -->
    <el-dialog
      v-model="showEndDialog"
      title="结束面试"
      width="400px"
    >
      <p>确定要结束本次面试吗？结束后将无法继续回答。</p>
      <template #footer>
        <el-button @click="showEndDialog = false">取消</el-button>
        <el-button type="primary" :loading="ending" @click="confirmEndInterview">
          确认结束
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeft,
  User,
  Service,
  ChatDotSquare,
  Loading
} from '@element-plus/icons-vue'
import {
  getInterviewSession,
  sendInterviewMessage,
  endInterview as apiEndInterview
} from '@/api/interview'
import { ElMessage, ElMessageBox } from 'element-plus'

// 导入图片资源
import assistantAvatarImg from '@/assets/assistant.png'
import userAvatarImg from '@/assets/user.png'

const router = useRouter()
const route = useRoute()

// 会话ID
const sessionId = computed(() => route.params.sessionId)

// 状态
const loading = ref(true)
const error = ref('')
const sessionData = ref(null)
const inputMessage = ref('')
const sending = ref(false)
const ending = ref(false)
const showEndDialog = ref(false)

// 图片资源
const assistantAvatar = assistantAvatarImg
const userAvatar = userAvatarImg

// 从路由参数获取配置
const modeFromQuery = computed(() => route.query.mode || 'normal')

// 计算属性
const isInProgress = computed(() => sessionData.value?.status === 0)
const isEnded = computed(() => sessionData.value?.status === 1)

const sessionStatusText = computed(() => {
  if (!sessionData.value) return '加载中'
  return sessionData.value.status === 0 ? '进行中' : '已结束'
})

const sessionStatusType = computed(() => {
  if (!sessionData.value) return 'info'
  return sessionData.value.status === 0 ? 'success' : 'info'
})

const difficultyText = computed(() => {
  const map = { 1: '初级', 2: '中级', 3: '高级' }
  return map[sessionData.value?.difficulty] || '初级'
})

const difficultyType = computed(() => {
  const map = { 1: 'success', 2: 'warning', 3: 'danger' }
  return map[sessionData.value?.difficulty] || 'info'
})

const modeText = computed(() => {
  return modeFromQuery.value === 'normal' ? '普通面试' : '压力面试'
})

const chatLogs = computed(() => {
  return sessionData.value?.chatLogs || []
})

// 图片加载失败处理
const handleImageError = (e) => {
  console.warn('头像加载失败:', e.target.src)
  e.target.style.display = 'none'
  e.target.parentElement.classList.add('avatar-fallback')
}

// 方法
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
    loading.value = false
  } catch (err) {
    console.error('获取会话详情失败:', err)
    error.value = err.message || '获取会话详情失败，请稍后重试'
    loading.value = false
  }
}

const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || !sessionId.value) return

  sending.value = true

  try {
    await sendInterviewMessage({
      sessionId: sessionId.value,
      content
    })

    inputMessage.value = ''

    // 重新获取会话详情以更新聊天记录
    await fetchSessionDetail()
  } catch (err) {
    console.error('发送消息失败:', err)
    ElMessage.error(err.message || '发送消息失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

const endInterview = () => {
  showEndDialog.value = true
}

const confirmEndInterview = async () => {
  if (!sessionId.value) return

  ending.value = true

  try {
    await apiEndInterview(sessionId.value)
    showEndDialog.value = false
    ElMessage.success('面试已结束')
    await fetchSessionDetail()
  } catch (err) {
    console.error('结束面试失败:', err)
    ElMessage.error(err.message || '结束面试失败，请稍后重试')
  } finally {
    ending.value = false
  }
}

const viewReport = () => {
  if (!sessionId.value) return
  router.push(`/interview/report/${sessionId.value}`)
}

const goBack = () => {
  router.back()
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  fetchSessionDetail()
})
</script>

<style scoped>
.interview-session-view {
  min-height: 100%;
}

/* 页面标题区 */
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

/* 加载和错误状态 */
.loading-section,
.error-section {
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

/* 会话内容区 */
.session-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 配置信息卡片 */
.config-card {
  display: flex;
  align-items: center;
  gap: 24px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px 24px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-label {
  font-size: 13px;
  color: #909399;
}

.config-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.config-divider {
  width: 1px;
  height: 20px;
  background-color: #e4e7ed;
}

/* 聊天记录区 */
.chat-section {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.chat-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.chat-count {
  font-size: 12px;
  color: #909399;
}

.chat-messages {
  height: 400px;
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f7fa;
}

/* ===== AI 面试官消息 - 左侧布局 ===== */
.assistant-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: flex-start;
}

.assistant-row .message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background-color: #fff;
  border: 1px solid #e4e7ed;
}

.assistant-row .message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.assistant-row .message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.assistant-row .message-bubble {
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  background-color: #fff;
  color: #303133;
}

.assistant-row .message-time {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  text-align: left;
}

/* ===== 用户消息 - 右侧布局 ===== */
.user-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: flex-end;
}

.user-row .message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-row .message-bubble {
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
  color: #fff;
}

.user-row .message-time {
  margin-top: 4px;
  font-size: 12px;
  color: #ffecd9;
  text-align: right;
}

.user-row .message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background-color: #fff;
  border: 1px solid #e4e7ed;
}

.user-row .message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-chat p {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.empty-desc {
  font-size: 12px;
  color: #c0c4cc;
}

/* 输入区 */
.input-section {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
}

.input-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-hint {
  font-size: 12px;
  color: #909399;
}

/* 操作区 */
.action-section {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 0;
}

.action-group {
  display: flex;
  gap: 12px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .config-card {
    flex-direction: column;
    gap: 12px;
  }

  .config-divider {
    width: 100%;
    height: 1px;
  }

  .assistant-row .message-content,
  .user-row .message-content {
    max-width: 85%;
  }
}
</style>
