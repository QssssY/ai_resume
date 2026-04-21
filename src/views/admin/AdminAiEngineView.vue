<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">AI 引擎配置</h2>
        <p class="page-subtitle">维护 interview/resume 业务模型配置，支持启用切换和密钥脱敏展示</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增引擎配置</el-button>
    </div>

    <div class="filter-bar">
      <!-- 引擎配置本地筛选：方便按业务类型和状态快速定位当前生效配置 -->
      <el-input
        v-model.trim="keyword"
        class="filter-item keyword"
        placeholder="按编码/名称/模型搜索"
        clearable
      />
      <el-select v-model="businessTypeFilter" class="filter-item" placeholder="按业务类型筛选">
        <el-option label="全部业务" value="all" />
        <el-option label="模拟面试" value="interview" />
        <el-option label="简历诊断" value="resume" />
      </el-select>
      <el-select v-model="statusFilter" class="filter-item" placeholder="按状态筛选">
        <el-option label="全部状态" value="all" />
        <el-option label="仅启用" value="active" />
        <el-option label="仅禁用" value="inactive" />
      </el-select>
    </div>

    <el-card shadow="never">
      <el-table :data="filteredEngineList" v-loading="tableLoading" border empty-text="暂无 AI 引擎配置数据">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="engineCode" label="引擎编码" min-width="140" />
        <el-table-column prop="engineName" label="引擎名称" min-width="140" />
        <el-table-column prop="providerType" label="Provider" min-width="120" />
        <el-table-column prop="businessTypeDesc" label="业务类型" min-width="120" />
        <el-table-column prop="modelName" label="模型名" min-width="140" />
        <el-table-column prop="baseUrl" label="基础地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="apiKey" label="API Key(脱敏)" min-width="140" />
        <el-table-column prop="temperature" label="温度" width="90" />
        <el-table-column prop="maxTokens" label="MaxTokens" width="110" />
        <el-table-column prop="timeoutMs" label="超时(ms)" width="100" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive === 1 ? 'success' : 'info'">
              {{ row.isActive === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button
                link
                :type="row.isActive === 1 ? 'warning' : 'success'"
                @click="handleToggleActive(row)"
              >
                {{ row.isActive === 1 ? '禁用' : '启用' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditMode ? '编辑 AI 引擎配置' : '新增 AI 引擎配置'"
      width="760px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="引擎编码" prop="engineCode">
              <el-input v-model.trim="formData.engineCode" :disabled="submitLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="引擎名称" prop="engineName">
              <el-input v-model.trim="formData.engineName" :disabled="submitLoading" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Provider" prop="providerType">
              <el-input v-model.trim="formData.providerType" :disabled="submitLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务类型" prop="businessType">
              <el-select v-model="formData.businessType" style="width: 100%" :disabled="submitLoading">
                <el-option value="interview" label="模拟面试(interview)" />
                <el-option value="resume" label="简历诊断(resume)" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="模型名" prop="modelName">
          <el-input v-model.trim="formData.modelName" :disabled="submitLoading" />
        </el-form-item>

        <el-form-item label="基础地址" prop="baseUrl">
          <el-input v-model.trim="formData.baseUrl" :disabled="submitLoading" />
        </el-form-item>

        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model.trim="formData.apiKey"
            type="password"
            show-password
            :placeholder="isEditMode ? '留空表示不修改 API Key' : '请输入 API Key'"
            :disabled="submitLoading"
          />
        </el-form-item>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="温度" prop="temperature">
              <el-input-number
                v-model="formData.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                :precision="1"
                :disabled="submitLoading"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="MaxTokens" prop="maxTokens">
              <el-input-number v-model="formData.maxTokens" :min="1" :disabled="submitLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="超时(ms)" prop="timeoutMs">
              <el-input-number v-model="formData.timeoutMs" :min="1000" :step="500" :disabled="submitLoading" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="formData.sort" :min="0" :disabled="submitLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="isActive">
              <el-radio-group v-model="formData.isActive" :disabled="submitLoading">
                <el-radio :value="1">启用</el-radio>
                <el-radio :value="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model.trim="formData.remark" :disabled="submitLoading" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">
          {{ isEditMode ? '保存修改' : '确认新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAdminAiEngine,
  getAdminAiEngines,
  toggleAdminAiEngineActive,
  updateAdminAiEngine
} from '@/api/admin/aiEngines'

// 表格数据：AI 引擎配置列表。
const engineList = ref([])
const tableLoading = ref(false)
const keyword = ref('')
const businessTypeFilter = ref('all')
const statusFilter = ref('all')

// 弹窗编辑状态：复用一个表单完成新增和编辑。
const dialogVisible = ref(false)
const isEditMode = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)

// 表单字段：与后端 DTO 字段保持一致。
const formData = reactive({
  id: null,
  engineCode: '',
  engineName: '',
  providerType: '',
  businessType: 'interview',
  modelName: '',
  baseUrl: '',
  apiKey: '',
  temperature: 1.0,
  maxTokens: 4096,
  timeoutMs: 30000,
  isActive: 1,
  sort: 0,
  remark: ''
})

// 表单校验：编辑时 API Key 可以留空，其它核心字段保持必填。
const formRules = {
  engineCode: [{ required: true, message: '请输入引擎编码', trigger: 'blur' }],
  engineName: [{ required: true, message: '请输入引擎名称', trigger: 'blur' }],
  providerType: [{ required: true, message: '请输入 Provider 类型', trigger: 'blur' }],
  businessType: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  modelName: [{ required: true, message: '请输入模型名', trigger: 'blur' }],
  baseUrl: [{ required: true, message: '请输入基础地址', trigger: 'blur' }],
  apiKey: [
    {
      validator: (_, value, callback) => {
        // 关键规则：新增时必须提供 API Key，编辑时允许留空表示不更新。
        if (!isEditMode.value && !value) {
          callback(new Error('新增时必须填写 API Key'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  temperature: [{ required: true, message: '请输入温度', trigger: 'change' }],
  maxTokens: [{ required: true, message: '请输入 MaxTokens', trigger: 'change' }],
  timeoutMs: [{ required: true, message: '请输入超时毫秒', trigger: 'change' }],
  isActive: [{ required: true, message: '请选择状态', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'change' }]
}

/**
 * 引擎列表筛选结果。
 * 作用：前端本地筛选用于提升后台配置操作效率，不影响后端数据真实性。
 */
const filteredEngineList = computed(() => {
  return engineList.value.filter((item) => {
    const matchesKeyword = !keyword.value
      || item.engineCode?.includes(keyword.value)
      || item.engineName?.includes(keyword.value)
      || item.modelName?.includes(keyword.value)

    const matchesBusinessType = businessTypeFilter.value === 'all'
      || item.businessType === businessTypeFilter.value

    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && item.isActive === 1)
      || (statusFilter.value === 'inactive' && item.isActive !== 1)

    return matchesKeyword && matchesBusinessType && matchesStatus
  })
})

/**
 * 重置表单为默认值。
 */
const resetFormData = () => {
  formData.id = null
  formData.engineCode = ''
  formData.engineName = ''
  formData.providerType = ''
  formData.businessType = 'interview'
  formData.modelName = ''
  formData.baseUrl = ''
  formData.apiKey = ''
  formData.temperature = 1.0
  formData.maxTokens = 4096
  formData.timeoutMs = 30000
  formData.isActive = 1
  formData.sort = 0
  formData.remark = ''
}

/**
 * 加载 AI 引擎配置列表。
 */
const fetchEngineList = async () => {
  tableLoading.value = true
  try {
    const res = await getAdminAiEngines()
    engineList.value = Array.isArray(res?.data) ? res.data : []
  } catch (error) {
    ElMessage.error(error?.message || '加载 AI 引擎配置失败')
  } finally {
    tableLoading.value = false
  }
}

const openCreateDialog = () => {
  isEditMode.value = false
  resetFormData()
  dialogVisible.value = true
}

/**
 * 打开编辑弹窗并回填行数据。
 * 说明：编辑态的 API Key 用空字符串初始化，避免前端显示后端脱敏值。
 * @param {Record<string, any>} row
 */
const openEditDialog = (row) => {
  isEditMode.value = true
  formData.id = row.id
  formData.engineCode = row.engineCode || ''
  formData.engineName = row.engineName || ''
  formData.providerType = row.providerType || ''
  formData.businessType = row.businessType || 'interview'
  formData.modelName = row.modelName || ''
  formData.baseUrl = row.baseUrl || ''
  formData.apiKey = ''
  formData.temperature = Number(row.temperature ?? 1.0)
  formData.maxTokens = Number(row.maxTokens ?? 4096)
  formData.timeoutMs = Number(row.timeoutMs ?? 30000)
  formData.isActive = Number(row.isActive ?? 0)
  formData.sort = Number(row.sort ?? 0)
  formData.remark = row.remark || ''
  dialogVisible.value = true
}

/**
 * 提交新增/编辑表单。
 */
const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const basePayload = {
      engineCode: formData.engineCode,
      engineName: formData.engineName,
      providerType: formData.providerType,
      businessType: formData.businessType,
      modelName: formData.modelName,
      baseUrl: formData.baseUrl,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      timeoutMs: formData.timeoutMs,
      isActive: formData.isActive,
      sort: formData.sort,
      remark: formData.remark || null
    }

    if (isEditMode.value) {
      const payload = {
        id: formData.id,
        ...basePayload
      }
      // 编辑态仅在用户输入新值时才提交 apiKey。
      if (formData.apiKey) {
        payload.apiKey = formData.apiKey
      }
      await updateAdminAiEngine(payload)
      ElMessage.success('AI 引擎配置修改成功')
    } else {
      await createAdminAiEngine({
        ...basePayload,
        apiKey: formData.apiKey
      })
      ElMessage.success('AI 引擎配置新增成功')
    }

    dialogVisible.value = false
    await fetchEngineList()
  } catch (error) {
    ElMessage.error(error?.message || '保存 AI 引擎配置失败')
  } finally {
    submitLoading.value = false
  }
}

/**
 * 切换配置启用状态。
 * 说明：后端会保证同一 businessType 只有一个启用配置。
 * @param {Record<string, any>} row
 */
const handleToggleActive = async (row) => {
  const nextActive = row.isActive === 1 ? 0 : 1
  const actionText = nextActive === 1 ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(
      `确认${actionText}配置「${row.engineName}」吗？`,
      `${actionText}确认`,
      { type: 'warning' }
    )
    await toggleAdminAiEngineActive(row.id, nextActive)
    ElMessage.success(`配置已${actionText}`)
    await fetchEngineList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || `${actionText}配置失败`)
    }
  }
}

onMounted(() => {
  fetchEngineList()
})
</script>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #8f451b;
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #ad734f;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-item {
  width: 180px;
}

.filter-item.keyword {
  width: 320px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
