<template>
  <div class="radar-chart-wrapper">
    <Radar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { useThemeStore } from '@/stores/theme'

// 注册雷达图所需的 Chart.js 模块
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.resolvedTheme === 'dark')

const props = defineProps({
  scores: {
    type: Object,
    required: true,
    // 期望格式: { basicInfo: 0-100, skill: 0-100, work: 0-100, project: 0-100, education: 0-100 }
  }
})

// 五维标签
const labels = ['基本信息', '岗位能力', '工作经验', '项目经历', '教育背景']

// 图表数据
const chartData = computed(() => ({
  labels,
  datasets: [
    {
      label: '简历评分',
      data: [
        props.scores.basicInfo || 0,
        props.scores.skill || 0,
        props.scores.work || 0,
        props.scores.project || 0,
        props.scores.education || 0,
      ],
      backgroundColor: 'rgba(255, 140, 66, 0.15)',
      borderColor: '#FF8C42',
      borderWidth: 2,
      pointBackgroundColor: '#FF8C42',
      pointBorderColor: isDark.value ? '#1a1a2e' : '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
  ],
}))

// 图表配置
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.label}: ${ctx.raw}分`,
      },
    },
  },
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 20,
        font: { size: 11 },
        color: isDark.value ? '#7A7A90' : '#999',
        backdropColor: 'transparent',
      },
      pointLabels: {
        font: { size: 13, weight: '600' },
        color: isDark.value ? '#E8E8F0' : '#2f2f2f',
      },
      grid: {
        color: isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      },
      angleLines: {
        color: isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      },
    },
  },
}))
</script>

<style scoped>
.radar-chart-wrapper {
  max-width: 400px;
  margin: 0 auto;
}
</style>
