import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/request', () => ({
  default: vi.fn((config) => Promise.resolve({ code: 200, data: config }))
}))

import request from '@/utils/request'
import {
  deleteUserAiConfig,
  getUserAiConfigs,
  getUserAiUsage,
  saveUserAiConfig,
  testUserAiConnectivity,
  toggleUserAiConfig
} from '@/api/userAiConfig'

describe('userAiConfig API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send user custom AI config requests to the documented endpoints', async () => {
    const payload = {
      configType: 'resume',
      providerName: 'DeepSeek',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-user',
      model: 'deepseek-chat',
      supportsMultimodal: true
    }

    await getUserAiConfigs()
    await saveUserAiConfig(payload)
    await toggleUserAiConfig('resume', false)
    await testUserAiConnectivity(payload)
    await getUserAiUsage()
    await deleteUserAiConfig('resume')

    expect(request).toHaveBeenNthCalledWith(1, {
      url: '/api/user/ai-config',
      method: 'get'
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      url: '/api/user/ai-config',
      method: 'post',
      data: payload,
      skipDefaultErrorHandler: true
    })
    expect(request).toHaveBeenNthCalledWith(3, {
      url: '/api/user/ai-config/resume/toggle',
      method: 'put',
      data: { enabled: false }
    })
    expect(request).toHaveBeenNthCalledWith(4, {
      url: '/api/user/ai-config/test-connectivity',
      method: 'post',
      data: {
        baseUrl: payload.baseUrl,
        apiKey: payload.apiKey,
        model: payload.model,
        supportsMultimodal: payload.supportsMultimodal
      },
      skipDefaultErrorHandler: true
    })
    expect(request).toHaveBeenNthCalledWith(5, {
      url: '/api/user/ai-config/usage',
      method: 'get'
    })
    expect(request).toHaveBeenNthCalledWith(6, {
      url: '/api/user/ai-config/resume',
      method: 'delete'
    })
  })
})
