<template>
  <div class="consumption-log-panel">
    <!-- 类型筛选栏 -->
    <div class="filter-bar">
      <button
        v-for="opt in typeOptions"
        :key="opt.value"
        class="filter-btn"
        :class="{ active: activeType === opt.value }"
        @click="activeType = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="log-loading">
      <div class="loading-spinner"></div>
      <span>加载消费记录...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="records.length === 0" class="log-empty">
      <FeatureIcon name="empty-state" size="sm" />
      <span>暂无消费记录</span>
    </div>

    <!-- 记录列表 -->
    <div v-else class="log-list">
      <div v-for="item in records" :key="item.id" class="log-item">
        <!-- 左侧：类型图标+名称 -->
        <div class="log-left">
          <div class="log-type-badge" :class="'type-' + item.quotaType">
            {{ item.quotaTypeName?.charAt(0) || '?' }}
          </div>
          <div class="log-detail">
            <div class="log-type-name">{{ item.quotaTypeName }}</div>
            <div class="log-meta">
              <span class="log-source">{{ item.sourceName }}</span>
              <span v-if="item.description" class="log-desc">· {{ item.description }}</span>
            </div>
          </div>
        </div>
        <!-- 右侧：变动数量+时间 -->
        <div class="log-right">
          <span class="log-amount" :class="item.changeAmount < 0 ? 'refund' : 'consume'">
            {{ item.changeAmount > 0 ? '-' + item.changeAmount : '+' + Math.abs(item.changeAmount) }}
          </span>
          <span class="log-time">{{ formatTime(item.createTime) }}</span>
        </div>
      </div>
    </div>

    <!-- 分页器 -->
    <div v-if="total > pageSize" class="log-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        small
        @current-change="onPageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getConsumptionLog } from '@/api/quota'
import FeatureIcon from '@/components/common/FeatureIcon.vue'

defineOptions({ name: 'ConsumptionLogPanel' })

/** 额度类型筛选选项 */
const typeOptions = [
  { label: '全部', value: '' },
  { label: '模拟面试', value: 'INTERVIEW' },
  { label: '简历诊断', value: 'RESUME' },
  { label: 'AI润色', value: 'POLISH' },
  { label: 'JD匹配', value: 'JD_MATCH' },
  { label: '模板库', value: 'TEMPLATE' },
  { label: 'Offer', value: 'OFFER' },
]

/** 当前选中类型 */
const activeType = ref('')
/** 当前页码 */
const currentPage = ref(1)
/** 每页条数 */
const pageSize = 20
/** 总记录数 */
const total = ref(0)
/** 消费记录列表 */
const records = ref([])
/** 加载状态 */
const loading = ref(false)

/** 获取消费记录 */
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize,
    }
    if (activeType.value) {
      params.quotaType = activeType.value
    }
    const res = await getConsumptionLog(params)
    const data = res.data
    records.value = data?.list || []
    total.value = data?.total || 0
  } catch {
    records.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 类型切换时重置页码并重新加载 */
watch(activeType, () => {
  currentPage.value = 1
  fetchLogs()
})

/** 页码切换 */
const onPageChange = (page) => {
  currentPage.value = page
  fetchLogs()
}

/** 时间格式化 */
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.consumption-log-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-card);
  border-radius: 20px;
  background: var(--bg-card);
  font-size: 13px;
  color: var(--text-body);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.filter-btn:hover {
  border-color: var(--orange-main);
  color: var(--orange-main);
}

.filter-btn.active {
  background: var(--orange-main);
  border-color: var(--orange-main);
  color: #fff;
}

/* 加载状态 */
.log-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-divider);
  border-top-color: var(--orange-main);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  gap: 10px;
  color: var(--text-placeholder);
  font-size: 13px;
}

/* 记录列表 */
.log-list {
  display: flex;
  flex-direction: column;
}

.log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--bg-page);
  transition: background-color 0.12s ease;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item:hover {
  background: var(--bg-card-hover);
}

/* 左侧 */
.log-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.log-type-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  color: #fff;
}

.type-INTERVIEW { background: var(--orange-main); }
.type-RESUME { background: var(--orange-deep); }
.type-POLISH { background: #5B8DEF; }
.type-JD_MATCH { background: #3ABAB4; }
.type-TEMPLATE { background: #7B68EE; }
.type-OFFER { background: #E667AF; }

.log-detail {
  min-width: 0;
}

.log-type-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-title);
}

.log-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-source {
  color: var(--text-muted);
}

.log-desc {
  color: var(--text-placeholder);
}

/* 右侧 */
.log-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 12px;
}

.log-amount {
  font-size: 15px;
  font-weight: 600;
}

.log-amount.consume {
  color: var(--color-danger);
}

.log-amount.refund {
  color: var(--color-success);
}

.log-time {
  font-size: 12px;
  color: var(--text-placeholder);
}

/* 分页 */
.log-pagination {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

/* 响应式 */
@media (max-width: 767px) {
  .filter-bar {
    gap: 6px;
  }
  .filter-btn {
    padding: 5px 10px;
    font-size: 12px;
  }
  .log-item {
    padding: 12px 10px;
  }
  .log-type-badge {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }
  .log-type-name {
    font-size: 13px;
  }
  .log-amount {
    font-size: 14px;
  }
}
</style>
