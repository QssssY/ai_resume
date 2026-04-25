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
    <!-- 对话气泡 -->
    <g transform="translate(20, 25)">
      <rect x="0" y="15" width="55" height="35" rx="8" fill="white" stroke="#FF8C42" stroke-width="2" />
      <path d="M15 50 L20 58 L30 50" stroke="#FF8C42" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <!-- 文字线 -->
      <rect x="8" y="25" width="25" height="3" rx="1.5" fill="#FFD7BF" />
      <rect x="8" y="32" width="20" height="3" rx="1.5" fill="#FFD7BF" />
    </g>
    <!-- 聊天气泡2 -->
    <g transform="translate(45, 45)">
      <rect x="0" y="0" width="40" height="25" rx="8" fill="#FF8C42" opacity="0.2" />
      <rect x="8" y="8" width="15" height="2" rx="1" fill="#FF8C42" />
      <rect x="8" y="14" width="20" height="2" rx="1" fill="#FF8C42" />
    </g>
    <!-- 星星评分 -->
    <g transform="translate(75, 65)">
      <path d="M10 0 L12.5 7.5 L20 7.5 L14 12 L16.5 20 L10 15 L3.5 20 L6 12 L0 7.5 L7.5 7.5 Z" fill="#FF8C42" />
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