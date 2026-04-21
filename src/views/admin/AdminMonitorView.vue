<template>
  <div class="admin-monitor-view">
    <section class="monitor-header">
      <div>
        <h1 class="monitor-title">业务监控</h1>
        <p class="monitor-subtitle">
          基于应用层统计展示简历任务与面试会话运行状态，便于快速定位异常趋势
        </p>
      </div>
      <el-button :loading="loading" @click="loadMonitorOverview">刷新监控</el-button>
    </section>

    <el-alert
      v-if="errorMessage"
      class="monitor-error"
      type="error"
      :closable="false"
      :title="errorMessage"
    />

    <section class="monitor-grid">
      <article class="monitor-card">
        <div class="label">待处理简历任务</div>
        <div class="value">{{ monitorOverview.pendingResumeTaskCount }}</div>
      </article>
      <article class="monitor-card">
        <div class="label">处理中简历任务</div>
        <div class="value">{{ monitorOverview.processingResumeTaskCount }}</div>
      </article>
      <article class="monitor-card">
        <div class="label">失败简历任务</div>
        <div class="value danger">{{ monitorOverview.failedResumeTaskCount }}</div>
      </article>
      <article class="monitor-card">
        <div class="label">活跃面试会话</div>
        <div class="value">{{ monitorOverview.activeInterviewSessionCount }}</div>
      </article>
      <article class="monitor-card">
        <div class="label">当日面试会话</div>
        <div class="value">{{ monitorOverview.todayInterviewSessionCount }}</div>
      </article>
      <article class="monitor-card">
        <div class="label">当日简历诊断</div>
        <div class="value">{{ monitorOverview.todayResumeDiagnosisCount }}</div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getAdminMonitorOverview } from '@/api/admin/monitor'

const loading = ref(false)
const errorMessage = ref('')

// 监控总览状态：与 /api/admin/monitor/overview 字段一一对应，作为页面唯一数据源。
const monitorOverview = reactive({
  pendingResumeTaskCount: 0,
  processingResumeTaskCount: 0,
  failedResumeTaskCount: 0,
  activeInterviewSessionCount: 0,
  todayInterviewSessionCount: 0,
  todayResumeDiagnosisCount: 0
})

/**
 * 加载监控总览数据。
 * 作用：统一处理加载状态、接口异常和数据回填，保证页面可观测性稳定。
 */
const loadMonitorOverview = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await getAdminMonitorOverview()
    Object.assign(monitorOverview, res?.data || {})
  } catch (error) {
    errorMessage.value = error?.message || '加载监控总览失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadMonitorOverview()
})
</script>

<style scoped>
.admin-monitor-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.monitor-header {
  background: #fff;
  border: 1px solid #f4d8c5;
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.monitor-title {
  margin: 0;
  font-size: 20px;
  color: #8f451b;
}

.monitor-subtitle {
  margin: 4px 0 0;
  color: #a86a45;
  font-size: 13px;
}

.monitor-error {
  margin-bottom: 2px;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 10px;
}

.monitor-card {
  background: #fff;
  border: 1px solid #f2d4be;
  border-radius: 12px;
  padding: 12px 14px;
}

.label {
  font-size: 12px;
  color: #ae7a55;
}

.value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: #8f451b;
}

.value.danger {
  color: #d44e2d;
}

@media (max-width: 1200px) {
  .monitor-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 720px) {
  .monitor-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .monitor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
