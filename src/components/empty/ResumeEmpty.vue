<template>
  <svg
    class="empty-illustration"
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- 背景圆形 -->
    <circle cx="60" cy="60" r="50" :fill="bgColor" />
    <!-- 简历图标 -->
    <g transform="translate(35, 30)">
      <rect x="0" y="0" width="50" height="64" rx="4" fill="white" stroke="#FF8C42" stroke-width="2" />
      <!-- 标题行 -->
      <rect x="8" y="10" width="20" height="4" rx="2" fill="#FF8C42" />
      <!-- 内容行1 -->
      <rect x="8" y="20" width="34" height="3" rx="1.5" fill="#FFD7BF" />
      <rect x="8" y="26" width="28" height="3" rx="1.5" fill="#FFD7BF" />
      <!-- 内容行2 -->
      <rect x="8" y="36" width="34" height="3" rx="1.5" fill="#FFD7BF" />
      <rect x="8" y="42" width="24" height="3" rx="1.5" fill="#FFD7BF" />
      <!-- 内容行3 -->
      <rect x="8" y="52" width="30" height="3" rx="1.5" fill="#FFD7BF" />
    </g>
    <!-- 放大镜 -->
    <g transform="translate(72, 65)">
      <circle cx="12" cy="12" r="10" stroke="#FF8C42" stroke-width="3" fill="white" />
      <line x1="19" y1="19" x2="26" y2="26" stroke="#FF8C42" stroke-width="3" stroke-linecap="round" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 120
  },
  bgColor: {
    type: String,
    default: '#FFF8F3'
  }
})
</script>