<template>
  <div class="resume-upload-view">
    <!-- 未登录提示 -->
    <div v-if="needLogin" class="login-prompt">
      <el-alert
        title="请先登录"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          <span>使用简历诊断功能需要先登录</span>
          <el-button type="primary" size="small" @click="goToLogin" style="margin-left: 12px">
            去登录
          </el-button>
        </template>
      </el-alert>
    </div>

    <!-- 页面标题区 -->
    <div class="page-header">
      <h1 class="page-title">简历诊断</h1>
      <p class="page-desc">上传简历后，系统将进行诊断分析并生成结果</p>
    </div>

    <!-- 入口操作区 -->
    <div class="upload-section">
      <div class="upload-card">
        <!-- 上传区域 -->
        <el-upload
          class="upload-area"
          drag
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
          :accept="acceptedFormats"
        >
          <div v-if="!selectedFile" class="upload-placeholder">
            <div class="upload-icon">
              <el-icon :size="48"><Upload /></el-icon>
            </div>
            <div class="upload-text">
              <div class="upload-title">点击或拖拽文件至此处上传</div>
              <div class="upload-hint">支持 PDF 格式，文件大小不超过 10MB</div>
            </div>
          </div>
          <div v-else class="upload-selected">
            <div class="file-info">
              <el-icon class="file-icon" :size="32"><Document /></el-icon>
              <div class="file-detail">
                <div class="file-name">{{ selectedFile.name }}</div>
                <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
              </div>
            </div>
            <el-button link type="danger" @click="clearFile">更换文件</el-button>
          </div>
        </el-upload>

        <!-- 文件校验提示 -->
        <div v-if="fileError" class="file-error">
          <el-icon><WarningFilled /></el-icon>
          <span>{{ fileError }}</span>
        </div>

        <!-- 文件要求说明 -->
        <div class="file-requirements">
          <div class="req-title">文件要求</div>
          <ul class="req-list">
            <li>文件格式：仅支持 PDF</li>
            <li>文件大小：不超过 10MB</li>
            <li>请确保简历内容清晰可识别</li>
          </ul>
        </div>

        <!-- 提交按钮 -->
        <div class="submit-section">
          <el-button
            type="primary"
            size="large"
            :disabled="!selectedFile || fileError || submitting"
            :loading="submitting"
            :class="{ 'btn-loading': submitting }"
            @click="handleSubmit"
          >
            <span v-if="submitting" class="btn-text-loading">AI 正在分析中...</span>
            <span v-else>{{ buttonText }}</span>
          </el-button>
        </div>

        <!-- 失败反馈 -->
        <div v-if="submitError" class="submit-error">
          <div class="error-icon">
            <el-icon :size="32" color="#f56c6c"><CircleClose /></el-icon>
          </div>
          <div class="error-content">
            <div class="error-title">提交失败</div>
            <div class="error-desc">{{ submitError }}</div>
            <el-button type="primary" @click="retrySubmit">重新提交</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果说明区 -->
    <div class="info-section">
      <div class="info-card">
        <h3 class="info-title">诊断完成后你将看到</h3>
        <div class="info-list">
          <div class="info-item">
            <div class="info-dot"></div>
            <div class="info-text">简历基本信息完整性分析</div>
          </div>
          <div class="info-item">
            <div class="info-dot"></div>
            <div class="info-text">技能匹配度评估</div>
          </div>
          <div class="info-item">
            <div class="info-dot"></div>
            <div class="info-text">经历描述优化建议</div>
          </div>
          <div class="info-item">
            <div class="info-dot"></div>
            <div class="info-text">整体评分与改进方向</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Upload, Document, WarningFilled, CircleClose } from '@element-plus/icons-vue'
import { uploadResume } from '@/api/resume'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isLoggedIn } from '@/utils/auth'

const router = useRouter()

// 检查是否登录
const needLogin = computed(() => !isLoggedIn())

// 配置
const acceptedFormats = '.pdf'
const maxFileSize = 10 * 1024 * 1024 // 10MB

// 状态
const selectedFile = ref(null)
const fileError = ref('')
const submitting = ref(false)
const submitError = ref('')

// 按钮文本
const buttonText = computed(() => {
  if (submitting.value) {
    return '提交中...'
  }
  return '开始诊断'
})

// 文件大小格式化
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 校验文件
const validateFile = (file) => {
  if (!file) {
    fileError.value = '请选择文件'
    return false
  }

  const extension = file.name.split('.').pop().toLowerCase()
  if (extension !== 'pdf') {
    fileError.value = '仅支持 PDF 格式文件'
    return false
  }

  if (file.size > maxFileSize) {
    fileError.value = '文件大小不能超过 10MB'
    return false
  }

  fileError.value = ''
  return true
}

// 处理文件选择
const handleFileChange = (file) => {
  const rawFile = file.raw
  if (validateFile(rawFile)) {
    selectedFile.value = rawFile
  }
}

// 清除文件
const clearFile = () => {
  selectedFile.value = null
  fileError.value = ''
}

// 跳转到登录页
const goToLogin = () => {
  router.push({
    path: '/login',
    query: { redirect: '/resume/upload' }
  })
}

// 提交
const handleSubmit = async () => {
  // 未登录时提示先登录
  if (!isLoggedIn()) {
    try {
      await ElMessageBox.confirm(
        '使用简历诊断功能需要先登录，是否前往登录页？',
        '提示',
        {
          confirmButtonText: '去登录',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      goToLogin()
    } catch {
      // 用户取消
    }
    return
  }

  if (!selectedFile.value || fileError.value) {
    return
  }

  submitting.value = true
  submitError.value = ''

  try {
    const res = await uploadResume(selectedFile.value)
    const taskId = String(res.data)

    ElMessage({
      message: '简历已提交，正在诊断...',
      type: 'success',
      duration: 2000,
      showClose: true
    })

    if (taskId) {
      await router.push(`/resume/result/${taskId}`)
    } else {
      submitError.value = '任务创建成功，但未获取到任务ID'
    }
  } catch (err) {
    console.error('上传失败:', err)
    submitError.value = err.message || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

// 重试提交
const retrySubmit = () => {
  submitError.value = ''
  handleSubmit()
}
</script>

<style scoped>
.resume-upload-view {
  min-height: 100%;
}

/* 未登录提示 */
.login-prompt {
  margin-bottom: 24px;
}

/* 页面标题区 */
.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 6px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-title);
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
}

/* 入口操作区 */
.upload-section {
  margin-bottom: 24px;
}

.upload-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(255, 140, 66, 0.06);
}

/* 上传区域 - 橙色主题 */
.upload-area {
  margin-bottom: 20px;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  border: 2px dashed var(--orange-border);
  border-radius: 12px;
  background-color: var(--bg-page);
  padding: 40px 20px;
  transition: all 0.25s ease;
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: var(--orange-main);
  background-color: var(--orange-light-bg);
}

.upload-placeholder {
  text-align: center;
}

.upload-icon {
  margin-bottom: 12px;
  color: var(--orange-main);
}

.upload-title {
  font-size: 15px;
  color: var(--text-body);
  margin-bottom: 6px;
}

.upload-hint {
  font-size: 13px;
  color: var(--text-muted);
}

.upload-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  color: var(--orange-main);
}

.file-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 14px;
  color: var(--text-body);
}

.file-size {
  font-size: 12px;
  color: var(--text-muted);
}

/* 文件错误提示 */
.file-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background-color: #FEF0F0;
  border: 1px solid var(--orange-border);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--color-danger);
}

/* 文件要求说明 */
.file-requirements {
  margin-bottom: 24px;
}

.req-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-body);
  margin-bottom: 10px;
}

.req-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.req-list li {
  font-size: 13px;
  color: var(--text-muted);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.req-list li::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--orange-main);
}

/* 提交按钮区 */
.submit-section {
  margin-bottom: 20px;
}

.submit-section :deep(.btn-loading) {
  position: relative;
  overflow: hidden;
}

.submit-section :deep(.btn-loading::after) {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  animation: loading-bar 1.5s ease-in-out infinite;
}

@keyframes loading-bar {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 失败反馈 */
.submit-error {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background-color: #FEF0F0;
  border: 1px solid var(--orange-border);
  border-radius: 8px;
}

.error-content {
  flex: 1;
}

.error-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-danger);
  margin-bottom: 6px;
}

.error-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

/* 结果说明区 */
.info-section {
  margin-bottom: 24px;
}

.info-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(255, 140, 66, 0.06);
}

.info-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-title);
}

.info-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--orange-main);
  flex-shrink: 0;
}

.info-text {
  font-size: 14px;
  color: var(--text-body);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .page-title {
    font-size: 20px;
  }
  .upload-card {
    padding: 24px 20px;
  }
  .info-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }
  .page-desc {
    font-size: 13px;
  }
  .upload-card {
    padding: 20px 16px;
  }
  .upload-area :deep(.el-upload-dragger) {
    padding: 24px 16px;
  }
  .upload-title {
    font-size: 14px;
  }
}
</style>
