import adminRequest from '@/utils/adminRequest'

/**
 * 归一化 userId 为路径安全字符串。
 * 为什么这样做：
 * 1. 用户 ID 可能是超长整型，前端必须按字符串传递，避免 Number 精度丢失。
 * 2. 统一在 API 层处理，避免页面重复处理 ID 格式。
 * @param {string | number} userId
 * @returns {string}
 */
const normalizeUserId = (userId) => {
  if (userId === null || userId === undefined) return ''
  return String(userId).trim()
}

/**
 * 获取管理端用户列表。
 * @returns {Promise}
 */
export function getAdminUsers() {
  return adminRequest({
    url: '/api/admin/users',
    method: 'get'
  })
}

/**
 * 更新用户状态（正常/封禁）。
 * @param {string | number} userId
 * @param {number} status - 1 正常，0 封禁
 * @returns {Promise}
 */
export function updateAdminUserStatus(userId, status) {
  const safeUserId = normalizeUserId(userId)
  return adminRequest({
    url: `/api/admin/users/${encodeURIComponent(safeUserId)}/status`,
    method: 'put',
    params: { status }
  })
}

/**
 * 获取用户权益详情。
 * @param {string | number} userId
 * @returns {Promise}
 */
export function getAdminUserRights(userId) {
  const safeUserId = normalizeUserId(userId)
  return adminRequest({
    url: `/api/admin/users/${encodeURIComponent(safeUserId)}/rights`,
    method: 'get'
  })
}

/**
 * 更新用户权益。
 * @param {string | number} userId
 * @param {{role?: number, membershipPlanCode?: string, vipExpireTime?: string, remark?: string}} data
 * @returns {Promise}
 */
export function updateAdminUserRights(userId, data) {
  const safeUserId = normalizeUserId(userId)
  return adminRequest({
    url: `/api/admin/users/${encodeURIComponent(safeUserId)}/rights`,
    method: 'put',
    data
  })
}

/**
 * 获取会员套餐列表。
 * 说明：用于权益编辑时提供套餐编码下拉选项。
 * @returns {Promise}
 */
export function getMembershipPlansForAdmin() {
  return adminRequest({
    url: '/api/membership/plans',
    method: 'get'
  })
}
