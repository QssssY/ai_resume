<template>
  <div class="section-basic-info">
    <div class="section-header" @click="expanded = !expanded">
      <span class="section-label">基本信息</span>
      <span class="expand-icon">{{ expanded ? '▼' : '▶' }}</span>
    </div>
    <div v-show="expanded" class="section-content">
      <el-form label-width="70px" size="default">
        <el-form-item label="姓名">
          <el-input :model-value="modelValue.name" @update:model-value="update('name', $event)" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="职位">
          <el-input :model-value="modelValue.title" @update:model-value="update('title', $event)" placeholder="请输入目标职位" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input :model-value="modelValue.phone" @update:model-value="update('phone', $event)" placeholder="请输入电话号码" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input :model-value="modelValue.email" @update:model-value="update('email', $event)" placeholder="请输入邮箱地址" />
        </el-form-item>
        <el-form-item label="所在地">
          <el-input :model-value="modelValue.location" @update:model-value="update('location', $event)" placeholder="请输入所在城市" />
        </el-form-item>
        <el-form-item label="网站">
          <el-input :model-value="modelValue.website" @update:model-value="update('website', $event)" placeholder="请输入个人网站" />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue'])
const expanded = ref(true)

function update(field, value) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}
</script>

<style scoped>
.section-basic-info {
  border: 1px solid var(--border-card);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-card-hover);
  cursor: pointer;
  user-select: none;
}

.section-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-title);
}

.expand-icon {
  font-size: 12px;
  color: var(--text-muted);
}

.section-content {
  padding: 16px;
  background: var(--bg-card);
}
</style>
