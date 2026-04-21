<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Prompt 管理</h2>
        <p class="page-subtitle">维护面试/简历 Prompt 模板，并与岗位配置联动</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增 Prompt</el-button>
    </div>

    <div class="filter-bar">
      <!-- Prompt 列表本地筛选：降低配置量上来后的查找成本 -->
      <el-input
        v-model.trim="keyword"
        class="filter-item keyword"
        placeholder="按岗位编码/名称/内容搜索"
        clearable
      />
      <el-select v-model="scenarioFilter" class="filter-item" placeholder="按场景筛选">
        <el-option label="全部场景" value="all" />
        <el-option label="面试系统设定" :value="1" />
        <el-option label="简历诊断设定" :value="2" />
      </el-select>
      <el-select v-model="statusFilter" class="filter-item" placeholder="按状态筛选">
        <el-option label="全部状态" value="all" />
        <el-option label="仅启用" value="active" />
        <el-option label="仅禁用" value="inactive" />
      </el-select>
    </div>

    <el-card shadow="never">
      <el-table :data="filteredPromptList" v-loading="tableLoading" border empty-text="暂无 Prompt 配置数据">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="scenarioTypeDesc" label="场景类型" min-width="140" />
        <el-table-column prop="jobRoleCode" label="岗位编码" min-width="140" />
        <el-table-column prop="jobRoleName" label="岗位名称" min-width="160" />
        <el-table-column prop="difficultyDesc" label="难度" width="100" />
        <el-table-column label="Prompt 内容" min-width="320">
          <template #default="{ row }">
            <el-tooltip placement="top" :content="row.promptContent">
              <div class="prompt-preview">{{ row.promptContent }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
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
      :title="isEditMode ? '编辑 Prompt' : '新增 Prompt'"
      width="760px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="96px">
        <el-form-item label="场景类型" prop="scenarioType">
          <el-select v-model="formData.scenarioType" style="width: 100%" :disabled="submitLoading">
            <el-option :value="1" label="面试系统设定" />
            <el-option :value="2" label="简历诊断设定" />
          </el-select>
        </el-form-item>

        <el-form-item label="岗位" prop="jobRoleCode">
          <el-select
            v-model="formData.jobRoleCode"
            filterable
            style="width: 100%"
            placeholder="请选择岗位配置"
            :disabled="submitLoading"
          >
            <el-option
              v-for="role in jobRoleOptions"
              :key="role.id"
              :label="`${role.roleName}（${role.roleCode}）`"
              :value="role.roleCode"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="难度" prop="difficulty">
          <el-select v-model="formData.difficulty" style="width: 100%" :disabled="submitLoading">
            <el-option :value="1" label="初级" />
            <el-option :value="2" label="中级" />
            <el-option :value="3" label="高级" />
          </el-select>
        </el-form-item>

        <el-form-item label="Prompt" prop="promptContent">
          <el-input
            v-model.trim="formData.promptContent"
            type="textarea"
            :rows="10"
            placeholder="请输入 Prompt 模板内容"
            :disabled="submitLoading"
          />
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
import { getAdminJobRoles } from '@/api/admin/jobRoles'
import {
  createAdminPrompt,
  getAdminPrompts,
  toggleAdminPromptActive,
  updateAdminPrompt
} from '@/api/admin/prompts'

// 列表数据：Prompt 模板主表格。
const promptList = ref([])
const tableLoading = ref(false)
const keyword = ref('')
const scenarioFilter = ref('all')
const statusFilter = ref('all')

// 岗位选项：用于创建/编辑 Prompt 时做合法岗位选择。
const jobRoleOptions = ref([])

// 弹窗提交状态：控制新增/编辑流程。
const dialogVisible = ref(false)
const isEditMode = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)

// 表单字段：严格对应后端 Prompt DTO 字段。
const formData = reactive({
  id: null,
  scenarioType: 1,
  jobRoleCode: '',
  difficulty: 1,
  promptContent: ''
})

const formRules = {
  scenarioType: [{ required: true, message: '请选择场景类型', trigger: 'change' }],
  jobRoleCode: [{ required: true, message: '请选择岗位', trigger: 'change' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  promptContent: [{ required: true, message: '请输入 Prompt 内容', trigger: 'blur' }]
}

/**
 * Prompt 列表筛选结果。
 * 作用：按场景、状态和关键词进行本地过滤，提升配置管理效率。
 */
const filteredPromptList = computed(() => {
  return promptList.value.filter((item) => {
    const matchesKeyword = !keyword.value
      || item.jobRoleCode?.includes(keyword.value)
      || item.jobRoleName?.includes(keyword.value)
      || item.promptContent?.includes(keyword.value)

    const matchesScenario = scenarioFilter.value === 'all'
      || Number(item.scenarioType) === Number(scenarioFilter.value)

    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && item.isActive === 1)
      || (statusFilter.value === 'inactive' && item.isActive !== 1)

    return matchesKeyword && matchesScenario && matchesStatus
  })
})

/**
 * 重置表单，避免新增/编辑状态互相污染。
 */
const resetFormData = () => {
  formData.id = null
  formData.scenarioType = 1
  formData.jobRoleCode = ''
  formData.difficulty = 1
  formData.promptContent = ''
}

/**
 * 加载 Prompt 列表。
 */
const fetchPromptList = async () => {
  tableLoading.value = true
  try {
    const res = await getAdminPrompts()
    promptList.value = Array.isArray(res?.data) ? res.data : []
  } catch (error) {
    ElMessage.error(error?.message || '加载 Prompt 列表失败')
  } finally {
    tableLoading.value = false
  }
}

/**
 * 加载岗位配置选项。
 * 作用：确保 Prompt 的岗位字段必须来源于岗位配置表。
 */
const fetchJobRoleOptions = async () => {
  try {
    const res = await getAdminJobRoles()
    jobRoleOptions.value = Array.isArray(res?.data) ? res.data : []
  } catch (error) {
    ElMessage.error(error?.message || '加载岗位选项失败')
  }
}

const openCreateDialog = () => {
  isEditMode.value = false
  resetFormData()
  dialogVisible.value = true
}

/**
 * 打开编辑弹窗并填充行数据。
 * @param {Record<string, any>} row
 */
const openEditDialog = (row) => {
  isEditMode.value = true
  formData.id = row.id
  formData.scenarioType = Number(row.scenarioType ?? 1)
  formData.jobRoleCode = row.jobRoleCode || ''
  formData.difficulty = Number(row.difficulty ?? 1)
  formData.promptContent = row.promptContent || ''
  dialogVisible.value = true
}

/**
 * 提交 Prompt 表单。
 * 关键逻辑：创建和编辑共用同一个表单，按 isEditMode 决定接口。
 */
const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload = {
      scenarioType: formData.scenarioType,
      jobRoleCode: formData.jobRoleCode,
      difficulty: formData.difficulty,
      promptContent: formData.promptContent
    }

    if (isEditMode.value) {
      await updateAdminPrompt({
        id: formData.id,
        ...payload
      })
      ElMessage.success('Prompt 修改成功')
    } else {
      await createAdminPrompt(payload)
      ElMessage.success('Prompt 新增成功')
    }

    dialogVisible.value = false
    await fetchPromptList()
  } catch (error) {
    ElMessage.error(error?.message || '保存 Prompt 失败')
  } finally {
    submitLoading.value = false
  }
}

/**
 * 切换 Prompt 启用状态。
 * @param {Record<string, any>} row
 */
const handleToggleActive = async (row) => {
  const nextActive = row.isActive === 1 ? 0 : 1
  const actionText = nextActive === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确认${actionText}该 Prompt 吗？`,
      `${actionText}确认`,
      { type: 'warning' }
    )
    await toggleAdminPromptActive(row.id, nextActive)
    ElMessage.success(`Prompt 已${actionText}`)
    await fetchPromptList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || `${actionText} Prompt 失败`)
    }
  }
}

onMounted(async () => {
  await Promise.all([fetchPromptList(), fetchJobRoleOptions()])
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

.prompt-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
