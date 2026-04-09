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
            <template v-for="msg in chatLogs" :key="msg.id || msg.tempId || `msg-${msg.createTime}`">
              <!-- ===== AI 面试官消息 - 左侧布局 ===== -->
              <div v-if="msg.messageRole === 'assistant'" class="message-row assistant-row">
                <div class="message-avatar assistant-avatar">
                  <img :src="assistantAvatar" alt="AI面试官" @error="handleImageError" />
                </div>
                <div class="message-content assistant-content">
                  <div class="message-bubble assistant-bubble">
                    <!-- 思考中状态：显示"思考中..."动画 -->
                    <span v-if="msg.status === 'thinking'" class="thinking-indicator">
                      <span class="thinking-text">思考中</span><span class="thinking-dots">...</span>
                    </span>
                    <!-- 错误状态：显示错误提示 -->
                    <span v-else-if="msg.status === 'error'" class="error-text">回复失败，请重试</span>
                    <!--
                      【修复】状态严格分离的渲染逻辑：
                      1. streaming 状态：只显示 msg.displayContent（打字缓冲区内容）
                      2. done 状态：只显示 msg.content（后端返回的完整内容，不再用 displayContent）
                      3. 其他历史消息（无 status 字段）：直接显示 msg.content
                      注意：done 状态下绝对不能再显示 displayContent，因为那是打字过程中的中间状态
                    -->
                    <span v-else-if="msg.status === 'streaming'" class="streaming-text">{{ msg.displayContent }}<span class="typing-cursor">|</span></span>
                    <span v-else class="done-text">{{ msg.content || '' }}</span>
                  </div>
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
  endInterview as apiEndInterview,
  streamInterviewMessage
} from '@/api/interview'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getToken } from '@/utils/auth'

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
const streamingContent = ref('')
const isStreaming = ref(false)
const pendingAssistantMsgId = ref(null)

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
  if (sessionData.value?.interviewModeDesc) {
    return sessionData.value.interviewModeDesc
  }
  if (sessionData.value?.interviewMode === 'stress') {
    return '压力面试'
  }
  if (sessionData.value?.interviewMode === 'normal') {
    return '普通面试'
  }
  return '普通面试'
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

    // 【关键修复】将后端返回的原始 chatLogs 消息对象 normalize 为前端扩展格式
    // 后端返回格式：{ id, messageRole, content, createTime, ... }
    // 前端需要格式：{ id, messageRole, content, displayContent, pendingContent, status, ... }
    //
    // 映射规则：
    // - displayContent = 后端 content（历史消息没有流式过程，直接显示即可）
    // - pendingContent = ''（历史消息不需要缓冲区）
    // - status = 'done'（历史消息已结束，不需要打字机）
    // - rawContent = 后端 content（保留完整内容引用）
    if (res.data?.chatLogs && Array.isArray(res.data.chatLogs)) {
      res.data.chatLogs = res.data.chatLogs.map(msg => ({
        ...msg,
        displayContent: msg.content || '',   // 历史消息直接显示 content
        pendingContent: '',                  // 历史消息无缓冲区
        status: msg.status || 'done',       // 历史消息标记为已完成
        rawContent: msg.content || ''       // 保留完整内容引用
      }))
    }

    sessionData.value = res.data
    loading.value = false
  } catch (err) {
    console.error('获取会话详情失败:', err)
    error.value = err.message || '获取会话详情失败，请稍后重试'
    loading.value = false
  }
}

// 打字机状态管理
let typingTimer = null
const TYPE_INTERVAL_MS = 35  // 逐字打印间隔（毫秒），越小越快

const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || !sessionId.value) return

  // 停止可能还在运行的打字机
  if (typingTimer) {
    clearInterval(typingTimer)
    typingTimer = null
  }

  sending.value = true
  isStreaming.value = true

  // 【核心改动】assistant 消息结构升级：
  // - displayContent：界面实际渲染的内容（随打字机逐步追加）
  // - pendingContent：后端到达但尚未打印的缓冲区
  // - rawContent：后端原始完整内容
  // - status：thinking → streaming → done/error
  const tempMsgId = `temp-${Date.now()}`
  const assistantMsg = {
    id: tempMsgId,
    messageRole: 'assistant',
    content: '',          // 保留兼容（旧的 chatLogs 没有此字段）
    displayContent: '',   // 界面已渲染内容
    pendingContent: '',    // 待打印缓冲区
    rawContent: '',       // 后端原始完整内容
    status: 'thinking',   // thinking → streaming → done/error
    streamFinished: false, // SSE 流是否已结束（打字机需要此标志才能停止）
    createTime: new Date().toISOString()
  }

  sessionData.value.chatLogs = [
    ...(sessionData.value.chatLogs || []),
    { id: `user-${Date.now()}`, messageRole: 'user', content: content, createTime: new Date().toISOString() },
    assistantMsg
  ]

  inputMessage.value = ''
  await nextTick()
  scrollToBottom()

  /**
   * 启动打字机：从 pendingContent 逐字提取追加到 displayContent
   *
   * 【设计说明】
   * - 收到 SSE chunk 后，内容先进入 pendingContent（待打印队列）
   * - 打字机定时器每 35ms 从 pendingContent 取 1 个字符
   * - 取出的字符追加到 displayContent，界面渲染 displayContent
   * - pendingContent 为空时停止计时器
   * - SSE 结束后（done 事件），如果 pendingContent 还有内容，打字机继续直到清空
   *
   * 【为什么这样做】
   * - 不用后端来一个 chunk 就直接显示（太快，没有打字机效果）
   * - 也不用等后端全部返回再显示（失去实时感）
   * - 而是用一个缓冲区让打字节奏均匀、可控
   */
  const startTypingMachine = () => {
    if (typingTimer) clearInterval(typingTimer)
    typingTimer = setInterval(() => {
      const logs = sessionData.value?.chatLogs || []
      const msgIndex = logs.findIndex(m => m.id === tempMsgId)
      if (msgIndex === -1) {
        clearInterval(typingTimer)
        typingTimer = null
        return
      }
      const msg = logs[msgIndex]
      // 缓冲区还有内容，继续打印
      if (msg.pendingContent.length > 0) {
        // 每次从缓冲区取 1 个字符追加到显示区
        msg.displayContent += msg.pendingContent[0]
        msg.pendingContent = msg.pendingContent.substring(1)
        msg.status = 'streaming'
        nextTick(() => scrollToBottom())
      } else if (msg.streamFinished && msg.pendingContent.length === 0) {
        // 【修复】只有当 SSE 已结束(streamFinished=true) 且缓冲区已清空时，才停止打字机
        // 停止计时器
        clearInterval(typingTimer)
        typingTimer = null
        // 【关键修复】不再调用 fetchSessionDetail，因为那会用后端完整 chatLogs 覆盖本地显示
        // 改为：直接在本地用 rawContent 收口这条消息
        if (msg.status !== 'error') {
          // 将后端原始完整内容固化为 message.content（从此 displayContent 不再需要）
          msg.content = msg.rawContent
          msg.status = 'done'
        } else {
          msg.status = 'error'
        }
        // 注意：不再调用 fetchSessionDetail()，这样打字效果就不会被整体刷新覆盖
      }
    }, TYPE_INTERVAL_MS)
  }

  let streamSucceeded = false
  try {
    const token = getToken()
    const response = await streamInterviewMessage(
      sessionId.value,
      { sessionId: sessionId.value, content },
      token
    )

    if (!response.ok) {
      let errMsg = `请求失败 (${response.status})`
      try {
        const errBody = await response.json()
        errMsg = errBody.message || errBody.msg || errMsg
      } catch {}
      throw new Error(errMsg)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n')

      for (const line of lines) {
        // 解析新的统一 JSON SSE 格式
        // 格式：event: message\ndata: {"type":"content","content":"文本"}\n\n
        if (line.startsWith('event:')) {
          // 记录事件类型（当前统一为 'message'）
          continue
        } else if (line.startsWith('data:')) {
          // 提取 JSON 数据
          const jsonStr = line.substring('data:'.length).trim()
          if (!jsonStr) continue

          let payload
          try {
            payload = JSON.parse(jsonStr)
          } catch (e) {
            console.warn('[stream] JSON解析失败:', jsonStr, e)
            continue
          }

          // 【统一事件分发】根据 payload.type 处理不同事件
          if (payload.type === 'content') {
            // 内容片段：需要追加到 pendingContent
            const data = payload.content || ''
            if (!data) continue

            const msgIndex = sessionData.value.chatLogs.findIndex(m => m.id === tempMsgId)
            if (msgIndex !== -1) {
              const msg = sessionData.value.chatLogs[msgIndex]
              // 【修复】标准化处理：去除 \r 字符
              const normalizedData = data.replace(/\r/g, '')
              // 【新增】判断是否为纯空白 chunk
              const visibleContent = normalizedData.replace(/[\s\u00A0]/g, '')
              if (visibleContent === '') {
                // 纯空白 chunk：跳过
                console.debug('[stream] 跳过纯空白chunk:', JSON.stringify(normalizedData))
              } else {
                // 有可见内容的有效 chunk
                // 首次收到有效 content：切换为 streaming 状态，启动打字机
                if (msg.status === 'thinking') {
                  msg.status = 'streaming'
                  startTypingMachine()
                }
                // 内容追加到缓冲区
                msg.rawContent += normalizedData
                msg.pendingContent += normalizedData
              }
            }
            await nextTick()
            scrollToBottom()
          } else if (payload.type === 'done') {
            // 流结束：标记 streamFinished，打字机会在 pendingContent 为空时自动停止
            console.debug('[stream] 收到done事件')
            const msgIndex = sessionData.value.chatLogs.findIndex(m => m.id === tempMsgId)
            if (msgIndex !== -1) {
              const msg = sessionData.value.chatLogs[msgIndex]
              msg.streamFinished = true
            }
            break  // 跳出 while 循环
          } else if (payload.type === 'error') {
            // 错误事件：抛出错误，由外层 catch 处理
            throw new Error(payload.message || 'AI 回复失败')
          }
        }
      }
    }

    // 流正常结束
    streamSucceeded = true
    const msgIndex = sessionData.value.chatLogs.findIndex(m => m.id === tempMsgId)
    if (msgIndex !== -1) {
      const msg = sessionData.value.chatLogs[msgIndex]
      // 标记 SSE 已结束，打字机会在 pendingContent 为空时自动停止
      msg.streamFinished = true
    }
    // 不再调用 fetchSessionDetail，打字效果不会被整体刷新覆盖

  } catch (err) {
    console.error('流式消息失败:', err)
    ElMessage.error(err.message || '发送消息失败，请稍后重试')
    if (!streamSucceeded) {
      // 标记消息为错误状态（界面会显示"回复失败"）
      const msgIndex = sessionData.value.chatLogs.findIndex(m => m.id === tempMsgId)
      if (msgIndex !== -1) {
        const msg = sessionData.value.chatLogs[msgIndex]
        msg.status = 'error'
        msg.streamFinished = true  // 让打字机能正确停止
      }
      // 等待打字机停止后再过滤掉
      await nextTick()
    }
  } finally {
    sending.value = false
    isStreaming.value = false
    pendingAssistantMsgId.value = null
    streamingContent.value = ''
    // 打字机在 pendingContent 为空时会自动停止
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    const container = document.querySelector('.chat-messages')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
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

/* 思考中状态 */
.thinking-indicator {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #909399;
  font-style: italic;
}

.thinking-text {
  font-size: 13px;
}

.thinking-dots {
  animation: thinkingPulse 1.2s ease-in-out infinite;
  font-size: 13px;
}

@keyframes thinkingPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* 打字机光标 */
.typing-cursor {
  display: inline-block;
  color: #409eff;
  font-weight: bold;
  animation: blink 0.8s step-end infinite;
  margin-left: 1px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 错误状态 */
.error-text {
  color: #f56c6c;
  font-size: 13px;
}

/* 流式输出中的正文样式（关键：消除 span 默认间隙） */
.streaming-text,
.done-text {
  display: inline;
  margin: 0;
  padding: 0;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  /* 明确关闭可能导致字间距拉开的默认样式 */
  letter-spacing: normal;
  word-spacing: normal;
  /* 换行处理：保留换行但不需要保留所有空格 */
  white-space: pre-line;
  word-break: break-word;
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
