<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">用户与权益管理</h2>
        <p class="page-subtitle">查看用户基础信息、会员权益状态，并支持管理员手工调整</p>
      </div>
      <el-input
        v-model.trim="keyword"
        class="search-input"
        placeholder="按用户名或用户ID搜索"
        clearable
      />
    </div>

    <el-card shadow="never">
      <el-table :data="filteredUsers" v-loading="tableLoading" border empty-text="暂无用户数据">
        <el-table-column prop="_userId" label="用户ID" min-width="180" />
        <el-table-column prop="username" label="用户名" min-width="150" />
        <el-table-column prop="roleDesc" label="角色" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="isEnabledUser(row) ? 'success' : 'danger'">
              {{ isEnabledUser(row) ? '正常' : '封禁' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="会员到期时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.vipExpireTime) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-button link type="primary" @click="openRightsDrawer(row)">查看权益</el-button>
              <el-button link type="warning" @click="openEditDialog(row)">编辑权益</el-button>
              <el-button
                link
                :type="isEnabledUser(row) ? 'danger' : 'success'"
                @click="handleToggleStatus(row)"
              >
                {{ isEnabledUser(row) ? '封禁' : '解封' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="rightsDrawerVisible" title="用户权益详情" size="480px">
      <el-skeleton v-if="rightsLoading" :rows="8" animated />
      <el-descriptions v-else :column="1" border>
        <el-descriptions-item label="用户ID">{{ rightsData.userId }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ rightsData.username }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ rightsData.roleDesc }}</el-descriptions-item>
        <el-descriptions-item label="套餐编码">{{ rightsData.membershipPlanCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="会员到期">
          {{ formatDateTime(rightsData.vipExpireTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="会员有效">{{ rightsData.isVipActive ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="简历剩余额度">{{ rightsData.resumeQuota }}</el-descriptions-item>
        <el-descriptions-item label="面试剩余额度">{{ rightsData.interviewQuota }}</el-descriptions-item>
        <el-descriptions-item label="今日简历已用">{{ rightsData.dailyResumeUsed }}</el-descriptions-item>
        <el-descriptions-item label="今日面试已用">{{ rightsData.dailyInterviewUsed }}</el-descriptions-item>
        <el-descriptions-item label="累计简历已用">{{ rightsData.totalResumeUsed }}</el-descriptions-item>
        <el-descriptions-item label="累计面试已用">{{ rightsData.totalInterviewUsed }}</el-descriptions-item>
        <el-descriptions-item label="最近刷新日期">{{ rightsData.lastRefreshDate || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑用户权益"
      width="620px"
      destroy-on-close
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="110px">
        <el-form-item label="目标角色" prop="role">
          <el-radio-group v-model="editForm.role" :disabled="editLoading">
            <el-radio :value="0">普通用户</el-radio>
            <el-radio :value="1">会员用户</el-radio>
            <el-radio :value="9">管理员</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="套餐编码">
          <el-select
            v-model="editForm.membershipPlanCode"
            clearable
            filterable
            style="width: 100%"
            placeholder="会员角色下可选择套餐"
            :disabled="editLoading || editForm.role !== 1"
          >
            <el-option
              v-for="plan in membershipPlans"
              :key="plan.planCode"
              :label="`${plan.planName || plan.planCode}（${plan.planCode}）`"
              :value="plan.planCode"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="会员到期时间">
          <el-date-picker
            v-model="editForm.vipExpireTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="请选择到期时间"
            style="width: 100%"
            :disabled="editLoading || editForm.role !== 1"
          />
        </el-form-item>

        <el-form-item label="修改备注">
          <el-input
            v-model.trim="editForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可选，建议填写调整原因"
            :disabled="editLoading"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminUserRights,
  getAdminUsers,
  getMembershipPlansForAdmin,
  updateAdminUserRights,
  updateAdminUserStatus
} from '@/api/admin/users'

// 用户列表基础状态：承载用户管理主表格。
const userList = ref([])
const tableLoading = ref(false)
const keyword = ref('')

// 权益详情抽屉状态：点击“查看权益”后加载展示。
const rightsDrawerVisible = ref(false)
const rightsLoading = ref(false)
const rightsData = reactive({
  userId: '',
  username: '',
  roleDesc: '',
  membershipPlanCode: '',
  vipExpireTime: '',
  isVipActive: false,
  resumeQuota: 0,
  interviewQuota: 0,
  dailyResumeUsed: 0,
  dailyInterviewUsed: 0,
  totalResumeUsed: 0,
  totalInterviewUsed: 0,
  lastRefreshDate: ''
})

// 权益编辑状态：用于管理员手工调整 role/套餐/到期时间。
const selectedUserId = ref('')
const editDialogVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  role: 0,
  membershipPlanCode: '',
  vipExpireTime: '',
  remark: ''
})

// 会员套餐选项：用于权益编辑时选择合法套餐编码。
const membershipPlans = ref([])

const editRules = {
  role: [{ required: true, message: '请选择目标角色', trigger: 'change' }]
}

/**
 * 归一化 userId 为字符串。
 * 为什么这样做：
 * 1. 超长 ID 若走 Number 会丢失精度。
 * 2. 权益接口路径参数必须使用保真的原始字符串。
 * @param {string | number | null | undefined} userId
 * @returns {string}
 */
const normalizeUserId = (userId) => {
  if (userId === null || userId === undefined) return ''
  return String(userId).trim()
}

/**
 * 从用户行中读取可用于接口调用的 userId。
 * 作用：统一走 `_userId` 字段，避免各处拼接时产生格式污染。
 * @param {Record<string, any>} row
 * @returns {string}
 */
const readUserId = (row) => {
  if (!row) return ''
  return row._userId || normalizeUserId(row.id)
}

/**
 * 判断用户是否为正常状态。
 * @param {Record<string, any>} row
 * @returns {boolean}
 */
const isEnabledUser = (row) => Number(row?.status) === 1

/**
 * 过滤后的用户列表。
 * 作用：支持按用户名或用户ID做本地搜索，减少后端改动成本。
 */
const filteredUsers = computed(() => {
  if (!keyword.value) return userList.value
  return userList.value.filter((item) => {
    return item.username?.includes(keyword.value) || item._userId?.includes(keyword.value)
  })
})

/**
 * 日期时间格式化。
 * @param {string | null} value
 * @returns {string}
 */
const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

/**
 * 拉取用户列表。
 * 关键逻辑：在页面层为每行补充 `_userId`，后续接口一律使用该字符串值。
 */
const fetchUserList = async () => {
  tableLoading.value = true
  try {
    const res = await getAdminUsers()
    const list = Array.isArray(res?.data) ? res.data : []
    userList.value = list.map((item) => ({
      ...item,
      _userId: normalizeUserId(item.id ?? item.userId)
    }))
  } catch (error) {
    ElMessage.error(error?.message || '加载用户列表失败')
  } finally {
    tableLoading.value = false
  }
}

/**
 * 拉取会员套餐列表。
 */
const fetchMembershipPlans = async () => {
  try {
    const res = await getMembershipPlansForAdmin()
    membershipPlans.value = Array.isArray(res?.data) ? res.data : []
  } catch (error) {
    ElMessage.error(error?.message || '加载会员套餐失败')
  }
}

/**
 * 拉取并展示某个用户的权益详情。
 * @param {string} userId
 */
const fetchRightsByUserId = async (userId) => {
  rightsLoading.value = true
  try {
    const res = await getAdminUserRights(userId)
    Object.assign(rightsData, res?.data || {})
  } catch (error) {
    ElMessage.error(error?.message || '加载用户权益详情失败')
  } finally {
    rightsLoading.value = false
  }
}

const openRightsDrawer = async (row) => {
  const userId = readUserId(row)
  if (!userId) {
    ElMessage.error('用户ID无效，无法查询权益')
    return
  }
  rightsDrawerVisible.value = true
  await fetchRightsByUserId(userId)
}

/**
 * 打开权益编辑弹窗。
 * 关键逻辑：先调用权益详情接口，确保编辑基于后端实时数据。
 * @param {Record<string, any>} row
 */
const openEditDialog = async (row) => {
  const userId = readUserId(row)
  if (!userId) {
    ElMessage.error('用户ID无效，无法编辑权益')
    return
  }

  selectedUserId.value = userId
  editDialogVisible.value = true
  editLoading.value = true

  try {
    const res = await getAdminUserRights(userId)
    const data = res?.data || {}
    editForm.role = Number(data.role ?? 0)
    editForm.membershipPlanCode = data.membershipPlanCode || ''
    editForm.vipExpireTime = data.vipExpireTime || ''
    editForm.remark = ''
  } catch (error) {
    ElMessage.error(error?.message || '加载用户权益数据失败')
  } finally {
    editLoading.value = false
  }
}

/**
 * 提交权益编辑。
 * 关键逻辑：
 * 1. 非会员角色时主动清空套餐与到期时间。
 * 2. userId 全流程使用字符串，避免超长 ID 精度丢失。
 */
const submitEdit = async () => {
  if (!selectedUserId.value || !editFormRef.value) return
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return

  editLoading.value = true
  try {
    const payload = {
      role: editForm.role,
      membershipPlanCode: editForm.role === 1 ? (editForm.membershipPlanCode || null) : null,
      vipExpireTime: editForm.role === 1 ? (editForm.vipExpireTime || null) : null,
      remark: editForm.remark || null
    }

    await updateAdminUserRights(selectedUserId.value, payload)
    ElMessage.success('用户权益更新成功')
    editDialogVisible.value = false
    await fetchUserList()
    if (rightsDrawerVisible.value) {
      await fetchRightsByUserId(selectedUserId.value)
    }
  } catch (error) {
    ElMessage.error(error?.message || '更新用户权益失败')
  } finally {
    editLoading.value = false
  }
}

/**
 * 切换用户状态（正常/封禁）。
 * @param {Record<string, any>} row
 */
const handleToggleStatus = async (row) => {
  const userId = readUserId(row)
  if (!userId) {
    ElMessage.error('用户ID无效，无法更新状态')
    return
  }

  const nextStatus = isEnabledUser(row) ? 0 : 1
  const actionText = nextStatus === 1 ? '解封' : '封禁'
  try {
    await ElMessageBox.confirm(
      `确认${actionText}用户「${row.username}」吗？`,
      `${actionText}确认`,
      { type: 'warning' }
    )
    await updateAdminUserStatus(userId, nextStatus)
    ElMessage.success(`用户已${actionText}`)
    await fetchUserList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || `${actionText}用户失败`)
    }
  }
}

/**
 * 监听角色变更：
 * 当角色切到非会员时，前端立即清空会员字段，避免误提交旧值。
 */
watch(
  () => editForm.role,
  (roleValue) => {
    if (roleValue !== 1) {
      editForm.membershipPlanCode = ''
      editForm.vipExpireTime = ''
    }
  }
)

onMounted(async () => {
  await Promise.all([fetchUserList(), fetchMembershipPlans()])
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

.search-input {
  width: 280px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
