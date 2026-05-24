<template>
  <div class="notification-type-icon" :class="[`type-${meta.key}`, `size-${size}`]">
    <FeatureIcon :name="meta.featureIcon" :label="meta.label" :size="iconSize" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import FeatureIcon from '@/components/common/FeatureIcon.vue'
import { getNotificationTypeMeta } from '@/utils/notificationMeta'

const props = defineProps({
  type: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md'
  }
})

const meta = computed(() => getNotificationTypeMeta(props.type))
const iconSize = computed(() => (props.size === 'sm' ? 'md' : 'lg'))
</script>

<style scoped>
.notification-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
}

.size-sm {
  width: 32px;
  height: 32px;
}

.size-md {
  width: 40px;
  height: 40px;
}

.type-resume {
  background: rgba(255, 140, 66, 0.1);
}

.type-polish,
.type-update {
  background: rgba(64, 158, 255, 0.1);
}

.type-interview {
  background: rgba(103, 194, 58, 0.1);
}

.type-quota,
.type-maintenance {
  background: rgba(245, 108, 108, 0.1);
}

.type-system,
.type-unknown {
  background: rgba(144, 147, 153, 0.1);
}

.type-activity {
  background: rgba(230, 162, 60, 0.12);
}
</style>
