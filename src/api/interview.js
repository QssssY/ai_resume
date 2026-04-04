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
 * @param {Object} data - 消息参数
 * @param {string} data.sessionId - 会话ID
 * @param {string} data.content - 消息内容
 * @returns {Promise}
 */
export function sendInterviewMessage(data) {
  return request({
    url: '/api/interview/message',
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
 * 查询面试历史记录
 * @returns {Promise}
 */
export function getInterviewHistory() {
  return request({
    url: '/api/interview/history',
    method: 'get'
  })
}
