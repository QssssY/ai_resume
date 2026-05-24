<template>
  <span class="feature-icon" :class="[`size-${size}`]" aria-hidden="true">
    <img :src="iconSrc" :alt="resolvedLabel" loading="lazy" decoding="async" />
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { getFeatureIcon, getFeatureIconLabel } from '@/utils/featureIcons'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'sm'
  }
})

const iconSrc = computed(() => getFeatureIcon(props.name))
const resolvedLabel = computed(() => props.label || getFeatureIconLabel(props.name))
</script>

<style scoped>
.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  line-height: 0;
}

.feature-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.size-xs {
  width: 18px;
  height: 18px;
}

.size-sm {
  width: 22px;
  height: 22px;
}

.size-md {
  width: 32px;
  height: 32px;
}

.size-lg {
  width: 52px;
  height: 52px;
}

.size-xl {
  width: 72px;
  height: 72px;
}
</style>
