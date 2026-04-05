import request from '@/utils/request'

/**
 * 创建面试会话
 * @param {Object} data - 创建参数
 * @param {string} data.jobRole - 面试岗位
 * @param {number} data.difficulty - 难度级别：1-初级，2-中级，3-高级
 * @returns {Promise}
 */
export function createInterviewSession(data) {
  return request({
    url: '/api/interview/session',
    method: 'post',
    data
  })
}

/**
 * 发送面试消息
 * @param {string} sessionId - 会话ID
 * @param {Object} data - 消息参数
 * @param {string} data.content - 消息内容
 * @returns {Promise}
 */
export function sendInterviewMessage(sessionId, data) {
  return request({
    url: `/api/interview/session/${sessionId}/message`,
    method: 'post',
    data
  })
}

/**
 * 结束面试
 * @param {string} sessionId - 会话ID
 * @returns {Promise}
 */
export function endInterview(sessionId) {
  return request({
    url: `/api/interview/session/${sessionId}/end`,
    method: 'post'
  })
}

/**
 * 查询会话详情
 * @param {string} sessionId - 会话ID
 * @returns {Promise}
 */
export function getInterviewSession(sessionId) {
  return request({
    url: `/api/interview/session/${sessionId}`,
    method: 'get'
  })
}

/**
 * 查询面试历史记录（分页）
 * @param {Object} params - 分页参数
 * @param {number} params.pageNum - 页码
 * @param {number} params.pageSize - 每页大小
 * @returns {Promise}
 */
export function getInterviewHistory(params = { pageNum: 1, pageSize: 5 }) {
  return request({
    url: '/api/interview/history',
    method: 'get',
    params
  })
}
