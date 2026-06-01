import request from '@/utils/request'

/**
 * 查询当前用户自定义 AI 配置列表。
 * @returns {Promise}
 */
export function getUserAiConfigs() {
  return request({
    url: '/api/user/ai-config',
    method: 'get'
  })
}

/**
 * 保存当前用户指定类型的 OpenAI 兼容配置。
 * @param {{configType: string, providerName?: string, baseUrl: string, apiKey: string, model: string, supportsMultimodal?: boolean}} data
 * @returns {Promise}
 */
export function saveUserAiConfig(data) {
  return request({
    url: '/api/user/ai-config',
    method: 'post',
    data,
    skipDefaultErrorHandler: true
  })
}

/**
 * 删除当前用户指定类型的自定义 AI 配置。
 * @param {string} configType
 * @returns {Promise}
 */
export function deleteUserAiConfig(configType) {
  return request({
    url: `/api/user/ai-config/${configType}`,
    method: 'delete'
  })
}

/**
 * 启用或禁用当前用户指定类型的自定义 AI 配置。
 * @param {string} configType
 * @param {boolean} enabled
 * @returns {Promise}
 */
export function toggleUserAiConfig(configType, enabled) {
  return request({
    url: `/api/user/ai-config/${configType}/toggle`,
    method: 'put',
    data: { enabled }
  })
}

/**
 * 使用当前表单值执行连通测试，不落库。
 * @param {{baseUrl: string, apiKey: string, model: string, supportsMultimodal?: boolean}} data
 * @returns {Promise}
 */
export function testUserAiConnectivity(data) {
  return request({
    url: '/api/user/ai-config/test-connectivity',
    method: 'post',
    data: {
      baseUrl: data.baseUrl,
      apiKey: data.apiKey,
      model: data.model,
      supportsMultimodal: data.supportsMultimodal
    },
    skipDefaultErrorHandler: true
  })
}

/**
 * 查询当前用户今日自定义 AI 调用用量。
 * @returns {Promise}
 */
export function getUserAiUsage() {
  return request({
    url: '/api/user/ai-config/usage',
    method: 'get'
  })
}
