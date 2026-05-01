import request from '@/utils/request'

/**
 * 查询当前用户通知列表（分页+筛选）
 * @param {Object} params - { page, size, readStatus, type }
 */
export function getNotifications(params) {
  return request({
    url: '/api/user/notifications',
    method: 'get',
    params
  })
}

/**
 * 获取当前用户未读通知数量
 */
export function getUnreadCount() {
  return request({
    url: '/api/user/notifications/unread-count',
    method: 'get'
  })
}

/**
 * 单条通知标记已读
 * @param {string|number} id - 通知ID
 */
export function markAsRead(id) {
  return request({
    url: `/api/user/notifications/${id}/read`,
    method: 'post'
  })
}

/**
 * 全部通知标记已读
 */
export function markAllAsRead() {
  return request({
    url: '/api/user/notifications/read-all',
    method: 'post'
  })
}
