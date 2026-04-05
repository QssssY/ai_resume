<template>
  <div class="interview-entry-view">
    <!-- 页面标题区 -->
    <div class="page-header">
      <h1 class="page-title">模拟面试</h1>
      <p class="page-desc">选择岗位与难度，开启AI模拟面试，提升面试技巧</p>
    </div>

    <!-- 配置选择区 -->
    <div class="config-section">
      <div class="config-card">
        <!-- 岗位选择 -->
        <div class="config-item">
          <div class="config-label">
            <el-icon :size="16"><Briefcase /></el-icon>
            <span>面试岗位</span>
          </div>
          <div class="config-content">
            <el-select
              v-model="selectedJobRole"
              placeholder="请选择面试岗位"
              size="large"
              class="job-select"
            >
              <el-option
                v-for="job in jobRoles"
                :key="job.value"
                :label="job.label"
                :value="job.value"
              >
                <div class="job-option">
                  <span class="job-name">{{ job.label }}</span>
                  <el-tag v-if="job.hot" type="danger" size="small">热门</el-tag>
                </div>
              </el-option>
            </el-select>
          </div>
        </div>

        <!-- 难度选择 -->
        <div class="config-item">
          <div class="config-label">
            <el-icon :size="16"><TrendCharts /></el-icon>
            <span>难度级别</span>
          </div>
          <div class="config-content">
            <el-radio-group v-model="selectedDifficulty" size="large">
              <el-radio-button :value="1">
                <div class="difficulty-option easy">
                  <el-icon><StarFilled /></el-icon>
                  <span>初级</span>
                </div>
              </el-radio-button>
              <el-radio-button :value="2">
                <div class="difficulty-option medium">
                  <el-icon><StarFilled /></el-icon>
                  <el-icon><StarFilled /></el-icon>
                  <span>中级</span>
                </div>
              </el-radio-button>
              <el-radio-button :value="3">
                <div class="difficulty-option hard">
                  <el-icon><StarFilled /></el-icon>
                  <el-icon><StarFilled /></el-icon>
                  <el-icon><StarFilled /></el-icon>
                  <span>高级</span>
                </div>
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 模式选择 -->
        <div class="config-item">
          <div class="config-label">
            <el-icon :size="16"><SetUp /></el-icon>
            <span>面试模式</span>
          </div>
          <div class="config-content">
            <el-radio-group v-model="selectedMode" size="large">
              <el-radio-button value="normal">
                <div class="mode-option">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>普通面试</span>
                </div>
              </el-radio-button>
              <el-radio-button value="pressure">
                <div class="mode-option">
                  <el-icon><Lightning /></el-icon>
                  <span>压力面试</span>
                </div>
              </el-radio-button>
            </el-radio-group>
            <div class="mode-desc">
              <template v-if="selectedMode === 'normal'">
                标准面试流程，问题由浅入深，适合日常练习
              </template>
              <template v-else>
                高强度连续追问，锻炼应变能力，适合进阶训练
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮区 -->
    <div class="action-section">
      <div class="action-card">
        <div class="action-info">
          <div class="action-title">准备就绪</div>
          <div class="action-desc">
            已选择：{{ selectedJobRoleLabel }} | {{ selectedDifficultyLabel }} | {{ selectedModeLabel }}
          </div>
        </div>
        <el-button
          type="primary"
          size="large"
          :loading="starting"
          :disabled="!canStart"
          @click="startInterview"
        >
          {{ startButtonText }}
        </el-button>
      </div>
    </div>

    <!-- 说明提示区 -->
    <div class="info-section">
      <div class="info-card">
        <h3 class="info-title">
          <el-icon><InfoFilled /></el-icon>
          面试流程说明
        </h3>
        <div class="info-list">
          <div class="info-item">
            <div class="info-step">1</div>
            <div class="info-content">
              <div class="info-item-title">选择配置</div>
              <div class="info-item-desc">选择目标岗位、难度级别和面试模式</div>
            </div>
          </div>
          <div class="info-item">
            <div class="info-step">2</div>
            <div class="info-content">
              <div class="info-item-title">开始面试</div>
              <div class="info-item-desc">AI面试官会根据配置生成针对性问题</div>
            </div>
          </div>
          <div class="info-item">
            <div class="info-step">3</div>
            <div class="info-content">
              <div class="info-item-title">回答问题</div>
              <div class="info-item-desc">根据问题给出回答，AI会进行追问和评价</div>
            </div>
          </div>
          <div class="info-item">
            <div class="info-step">4</div>
            <div class="info-content">
              <div class="info-item-title">查看评价</div>
              <div class="info-item-desc">面试结束后查看综合评分和详细反馈</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Briefcase,
  TrendCharts,
  StarFilled,
  SetUp,
  ChatDotRound,
  Lightning,
  InfoFilled
} from '@element-plus/icons-vue'
import { createInterviewSession } from '@/api/interview'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 岗位列表
const jobRoles = [
  { value: 'Java开发工程师', label: 'Java开发工程师', hot: true },
  { value: '前端开发工程师', label: '前端开发工程师', hot: true },
  { value: 'Python开发工程师', label: 'Python开发工程师', hot: false },
  { value: '产品经理', label: '产品经理', hot: true },
  { value: 'UI设计师', label: 'UI设计师', hot: false },
  { value: '数据分析师', label: '数据分析师', hot: false },
  { value: '测试工程师', label: '测试工程师', hot: false },
  { value: '运维工程师', label: '运维工程师', hot: false }
]

// 选择状态
const selectedJobRole = ref('')
const selectedDifficulty = ref(1)
const selectedMode = ref('normal')
const starting = ref(false)

// 计算属性
const selectedJobRoleLabel = computed(() => {
  const job = jobRoles.find(j => j.value === selectedJobRole.value)
  return job?.label || '未选择'
})

const selectedDifficultyLabel = computed(() => {
  const map = { 1: '初级', 2: '中级', 3: '高级' }
  return map[selectedDifficulty.value] || '初级'
})

const selectedModeLabel = computed(() => {
  return selectedMode.value === 'normal' ? '普通面试' : '压力面试'
})

const canStart = computed(() => {
  return !!selectedJobRole.value
})

const startButtonText = computed(() => {
  if (starting.value) return '创建中...'
  if (!selectedJobRole.value) return '请先选择岗位'
  return '开始面试'
})

// 开始面试
const startInterview = async () => {
  if (!canStart.value) {
    ElMessage.warning('请先选择面试岗位')
    return
  }

  starting.value = true

  try {
    const res = await createInterviewSession({
      jobRole: selectedJobRole.value,
      difficulty: selectedDifficulty.value
    })

    const sessionId = res.data.sessionId

    ElMessage.success('面试会话创建成功')

    // 跳转到面试会话页
    await router.push({
      path: `/interview/session/${sessionId}`,
      query: {
        mode: selectedMode.value,
        difficulty: selectedDifficulty.value
      }
    })
  } catch (err) {
    console.error('创建面试会话失败:', err)
    ElMessage.error(err.message || '创建面试会话失败，请稍后重试')
  } finally {
    starting.value = false
  }
}
</script>

<style scoped>
.interview-entry-view {
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

/* 配置选择区 */
.config-section {
  margin-bottom: 24px;
}

.config-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 24px;
}

.config-item {
  margin-bottom: 24px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.config-content {
  padding-left: 22px;
}

/* 岗位选择 */
.job-select {
  width: 100%;
  max-width: 400px;
}

.job-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.job-name {
  font-size: 14px;
}

/* 难度选择 */
.difficulty-option {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}

.difficulty-option.easy {
  color: #67c23a;
}

.difficulty-option.medium {
  color: #e6a23c;
}

.difficulty-option.hard {
  color: #f56c6c;
}

/* 模式选择 */
.mode-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
}

.mode-desc {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

/* 操作按钮区 */
.action-section {
  margin-bottom: 24px;
}

.action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border-radius: 4px;
  padding: 20px 24px;
  color: #fff;
}

.action-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 13px;
  opacity: 0.9;
}

/* 说明提示区 */
.info-section {
  margin-bottom: 24px;
}

.info-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 24px;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.info-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  gap: 12px;
}

.info-step {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-item-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
}

.info-item-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .info-list {
    grid-template-columns: 1fr;
  }

  .action-card {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
