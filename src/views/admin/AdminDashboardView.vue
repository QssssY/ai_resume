<template>
  <div class="admin-dashboard-view">
    <section class="dashboard-header">
      <div>
        <h1 class="dashboard-title">数据看板</h1>
        <p class="dashboard-subtitle">
          支持日期范围和热门岗位数量筛选，统一刷新看板数据
        </p>
      </div>
      <el-button :loading="loading" @click="loadDashboardData" class="refresh-btn">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </section>

    <section class="filter-panel">
      <el-radio-group
        v-model="filters.quickRange"
        @change="handleQuickRangeChange"
      >
        <el-radio-button value="today">今天</el-radio-button>
        <el-radio-button value="last7">近7天</el-radio-button>
        <el-radio-button value="last30">近30天</el-radio-button>
        <el-radio-button value="custom">自定义</el-radio-button>
      </el-radio-group>

      <el-date-picker
        v-model="filters.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        :clearable="true"
        :disabled="filters.quickRange !== 'custom'"
      />

      <el-input-number
        v-model="filters.hotLimit"
        :min="1"
        :max="50"
        :step="1"
      />
      <el-button type="primary" :loading="loading" @click="handleApplyFilters"
        >应用筛选</el-button
      >
      <el-button @click="resetFilters">重置筛选</el-button>
    </section>

    <section class="filter-summary">
      <span>当前统计区间：{{ filterSummary.dateRangeText }}</span>
      <span>热门岗位数量：Top {{ filters.hotLimit }}</span>
    </section>

    <el-alert
      v-if="errorMessage"
      class="dashboard-error"
      type="error"
      :closable="false"
      :title="errorMessage"
    />

    <section class="overview-grid">
      <article class="overview-card">
        <div class="label">总用户数</div>
        <div class="value">{{ overview.totalUserCount }}</div>
      </article>
      <article class="overview-card">
        <div class="label">会员用户数</div>
        <div class="value">{{ overview.vipUserCount }}</div>
      </article>
      <article class="overview-card">
        <div class="label">启用 Prompt 数</div>
        <div class="value">{{ overview.activePromptCount }}</div>
      </article>
      <article class="overview-card">
        <div class="label">启用岗位数</div>
        <div class="value">{{ overview.activeJobRoleCount }}</div>
      </article>
      <article class="overview-card">
        <div class="label">启用 AI 引擎数</div>
        <div class="value">{{ overview.activeAiEngineCount }}</div>
      </article>
      <article class="overview-card">
        <div class="label">面试会话</div>
        <div class="value">{{ overview.todayInterviewSessionCount }}</div>
      </article>
      <article class="overview-card">
        <div class="label">简历诊断</div>
        <div class="value">{{ overview.todayResumeDiagnosisCount }}</div>
      </article>
    </section>

    <section class="middle-grid">
      <article class="panel-card">
        <header class="panel-title">
          热门岗位排行（Top {{ filters.hotLimit }}）
        </header>
        <div class="chart-box-wrap">
          <Bar
            v-if="hasHotRoleData"
            :data="hotRoleChartData"
            :options="hotRoleChartOptions"
            :height="260"
          />
          <div v-else class="empty-chart-tip">暂无岗位排行数据</div>
        </div>
      </article>

      <article class="panel-card">
        <header class="panel-title">业务分布</header>
        <div class="distribution-range">
          统计区间：{{ businessDistribution.startDate || "-" }} ~
          {{ businessDistribution.endDate || "-" }}
        </div>
        <div class="chart-box-wrap">
          <Doughnut
            v-if="hasDistributionData"
            :data="distributionChartData"
            :options="distributionChartOptions"
            :height="260"
          />
          <div v-else class="empty-chart-tip">暂无业务分布数据</div>
        </div>
      </article>
    </section>

    <section class="trend-section panel-card">
      <header class="panel-title">趋势数据</header>
      <div class="chart-box-wrap trend-wrap">
        <Line
          v-if="hasTrendData"
          :data="trendChartData"
          :options="trendChartOptions"
          :height="340"
        />
        <div v-else class="empty-chart-tip">暂无趋势数据</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import { Line, Bar, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  Filler,
} from "chart.js";

// 注册 Chart.js 所需模块
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  Filler
);

import {
  getAdminDashboardBusinessDistribution,
  getAdminDashboardHotJobRoles,
  getAdminDashboardOverview,
  getAdminDashboardTrends,
} from "@/api/admin/dashboard";

const loading = ref(false);
const errorMessage = ref("");

const getDefaultDateRange = () => {
  const today = new Date();
  const toFF = (d) => {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const endDate = toFF(today);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  return [toFF(start), endDate];
};

// 看板筛选状态
const filters = reactive({
  quickRange: "last7",
  dateRange: [],
  hotLimit: 10,
});

// 总览卡片数据
const overview = reactive({
  totalUserCount: 0,
  vipUserCount: 0,
  activePromptCount: 0,
  activeJobRoleCount: 0,
  activeAiEngineCount: 0,
  todayInterviewSessionCount: 0,
  todayResumeDiagnosisCount: 0,
});

const trends = ref([]);
const hotJobRoles = ref([]);

const businessDistribution = reactive({
  startDate: "",
  endDate: "",
  interviewCount: 0,
  resumeCount: 0,
  totalCount: 0,
  interviewPercent: 0,
  resumePercent: 0,
});

// 趋势图系列名称
const TREND_SERIES_NAMES = ["面试会话", "简历诊断"];

/**
 * 趋势数据归一化
 */
const normalizedTrendRows = computed(() => {
  if (!Array.isArray(trends.value)) return [];
  return trends.value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      date: item.date ? String(item.date) : `第${index + 1}项`,
      interviewSessionCount: Number(item.interviewSessionCount ?? 0),
      resumeDiagnosisCount: Number(item.resumeDiagnosisCount ?? 0),
    }));
});

const hasTrendData = computed(() => normalizedTrendRows.value.length > 0);
const hasHotRoleData = computed(
  () => Array.isArray(hotJobRoles.value) && hotJobRoles.value.length > 0
);
const hasDistributionData = computed(
  () => Number(businessDistribution.totalCount || 0) > 0
);

/**
 * ==============================
 * 趋势图配置（Chart.js Line）
 * ==============================
 */
const trendChartData = computed(() => ({
  labels: normalizedTrendRows.value.map((item) => item.date),
  datasets: [
    {
      label: TREND_SERIES_NAMES[0],
      data: normalizedTrendRows.value.map((item) => item.interviewSessionCount),
      borderColor: "#ff8c42",
      backgroundColor: "rgba(255, 140, 66, 0.16)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: TREND_SERIES_NAMES[1],
      data: normalizedTrendRows.value.map((item) => item.resumeDiagnosisCount),
      borderColor: "#f6b37d",
      backgroundColor: "rgba(246, 179, 125, 0.12)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
}));

const trendChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600 },
  plugins: {
    legend: {
      position: "top",
      labels: { color: "#8f572f", font: { size: 12 } },
    },
    tooltip: { mode: "index", intersect: false },
  },
  scales: {
    x: {
      ticks: { color: "#9a633e" },
      grid: { color: "rgba(246, 224, 207, 0.4)" },
    },
    y: {
      beginAtZero: true,
      ticks: { color: "#9a633e" },
      grid: { color: "#f6e0cf" },
    },
  },
}));

/**
 * ==============================
 * 热门岗位图配置（Chart.js Bar）
 * ==============================
 */
const hotRoleChartData = computed(() => {
  const sorted = [...hotJobRoles.value].reverse();
  return {
    labels: sorted.map((item) => item.jobRole || "未命名岗位"),
    datasets: [
      {
        label: "会话数",
        data: sorted.map((item) => Number(item.sessionCount || 0)),
        backgroundColor: "#ff8f42",
        borderRadius: 6,
        barThickness: 16,
      },
    ],
  };
});

const hotRoleChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y",
  animation: { duration: 600 },
  plugins: {
    legend: { display: false },
    tooltip: { mode: "index", intersect: false },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: "#9a633e" },
      grid: { color: "#f6e0cf" },
    },
    y: {
      ticks: { color: "#8f572f", font: { size: 12 } },
      grid: { display: false },
    },
  },
}));

/**
 * ==============================
 * 业务分布图配置（Chart.js Doughnut）
 * ==============================
 */
const distributionChartData = computed(() => ({
  labels: ["面试", "简历"],
  datasets: [
    {
      data: [
        Number(businessDistribution.interviewCount || 0),
        Number(businessDistribution.resumeCount || 0),
      ],
      backgroundColor: ["#ff8f42", "#f6b37d"],
      borderWidth: 2,
      borderColor: "#fff",
    },
  ],
}));

const distributionChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: "55%",
  animation: { duration: 600 },
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: "#8f572f", font: { size: 12 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(0) : 0;
          return `${ctx.label}: ${ctx.raw}（${pct}%）`;
        },
      },
    },
  },
}));

/**
 * ==============================
 * 日期工具函数
 * ==============================
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const applyQuickRange = (quickRange) => {
  const today = new Date();
  const endDate = formatDate(today);
  if (quickRange === "today") {
    filters.dateRange = [endDate, endDate];
    return;
  }
  if (quickRange === "last7") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    filters.dateRange = [formatDate(start), endDate];
    return;
  }
  if (quickRange === "last30") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    filters.dateRange = [formatDate(start), endDate];
    return;
  }
};

const filterSummary = computed(() => {
  if (!Array.isArray(filters.dateRange) || filters.dateRange.length !== 2) {
    return { dateRangeText: "近7天" };
  }
  return { dateRangeText: `${filters.dateRange[0]} ~ ${filters.dateRange[1]}` };
});

const dateParams = computed(() => {
  if (!Array.isArray(filters.dateRange) || filters.dateRange.length !== 2) {
    return {};
  }
  return {
    startDate: filters.dateRange[0],
    endDate: filters.dateRange[1],
  };
});

const validateFilters = () => {
  if (!Number.isInteger(filters.hotLimit) || filters.hotLimit <= 0) {
    ElMessage.warning("热门岗位数量必须大于 0");
    return false;
  }
  if (filters.quickRange === "custom") {
    if (!Array.isArray(filters.dateRange) || filters.dateRange.length !== 2) {
      ElMessage.warning("请选择完整的自定义日期范围");
      return false;
    }
  }
  if (Array.isArray(filters.dateRange) && filters.dateRange.length === 2) {
    const start = new Date(filters.dateRange[0]);
    const end = new Date(filters.dateRange[1]);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ElMessage.warning("日期格式无效，请重新选择");
      return false;
    }
    if (start.getTime() > end.getTime()) {
      ElMessage.warning("开始日期不能大于结束日期");
      return false;
    }
    const dayDiff =
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (dayDiff > 90) {
      ElMessage.warning("查询范围不能超过 90 天");
      return false;
    }
  }
  return true;
};

/**
 * ==============================
 * 数据加载
 * ==============================
 */
const loadDashboardData = async () => {
  if (!validateFilters()) return;
  loading.value = true;
  errorMessage.value = "";
  const commonParams = { ...dateParams.value };

  try {
    const [overviewRes, trendsRes, hotRolesRes, distributionRes] =
      await Promise.all([
        getAdminDashboardOverview(commonParams),
        getAdminDashboardTrends(commonParams),
        getAdminDashboardHotJobRoles({
          ...commonParams,
          limit: filters.hotLimit,
        }),
        getAdminDashboardBusinessDistribution(commonParams),
      ]);

    Object.assign(overview, overviewRes?.data || {});
    trends.value = Array.isArray(trendsRes?.data) ? trendsRes.data : [];
    hotJobRoles.value = Array.isArray(hotRolesRes?.data)
      ? hotRolesRes.data
      : [];
    Object.assign(businessDistribution, distributionRes?.data || {});
  } catch (error) {
    errorMessage.value = error?.message || "加载管理端看板数据失败";
  } finally {
    loading.value = false;
  }
};

const handleQuickRangeChange = (quickRange) => {
  applyQuickRange(quickRange);
};

const handleApplyFilters = () => {
  loadDashboardData();
};

const resetFilters = () => {
  filters.quickRange = "last7";
  filters.dateRange = getDefaultDateRange();
  filters.hotLimit = 10;
  loadDashboardData();
};

onMounted(() => {
  loadDashboardData();
});
</script>

<style scoped>
.admin-dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dashboard-header {
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.dashboard-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #2c3e50;
}

.dashboard-subtitle {
  margin: 4px 0 0;
  color: #7f8c8d;
  font-size: 14px;
}

.filter-panel {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.filter-panel :deep(.el-radio-button__inner) {
  border-radius: 8px;
}

.filter-panel :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.filter-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  color: #7f8c8d;
  font-size: 13px;
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 10px 16px;
}

.dashboard-error {
  margin-bottom: 2px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 16px;
}

.overview-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  padding: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.overview-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #e67e22;
}

.label {
  font-size: 13px;
  color: #7f8c8d;
  font-weight: 500;
}

.value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.panel-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.middle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.trend-section {
  width: 100%;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.distribution-range {
  color: #7f8c8d;
  font-size: 13px;
  margin-bottom: 12px;
}

.chart-box-wrap {
  position: relative;
  min-height: 260px;
}

.trend-wrap {
  min-height: 340px;
}

.empty-chart-tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #bbb;
  pointer-events: none;
}

@media (max-width: 1200px) {
  .overview-grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }
}

@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
  .middle-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .filter-panel {
    flex-direction: column;
    align-items: stretch;
  }
}

.refresh-btn {
  background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(230, 126, 34, 0.35);
}
</style>
