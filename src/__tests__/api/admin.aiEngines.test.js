import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/adminRequest', () => ({
  default: vi.fn((config) => Promise.resolve({ code: 200, data: config }))
}))

import adminRequest from '@/utils/adminRequest'
import {
  getCustomAiDailyLimit,
  testAdminAiEngineConnectivity,
  updateCustomAiDailyLimit
} from '@/api/admin/aiEngines'

describe('admin aiEngines API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('testAdminAiEngineConnectivity sends current form config', async () => {
    const data = {
      id: 10,
      providerType: 'openai',
      modelName: 'gpt-test',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-real',
      thinkingMode: 'none',
      temperature: 0,
      maxTokens: 8,
      timeoutMs: 30000
    }

    await testAdminAiEngineConnectivity(data)

    expect(adminRequest).toHaveBeenCalledWith({
      url: '/api/admin/ai-engines/connectivity-test',
      method: 'post',
      data
    })
  })

  it('custom AI daily limit endpoints use admin custom-ai route', async () => {
    await getCustomAiDailyLimit()
    await updateCustomAiDailyLimit(80)

    expect(adminRequest).toHaveBeenNthCalledWith(1, {
      url: '/api/admin/custom-ai/daily-limit',
      method: 'get'
    })
    expect(adminRequest).toHaveBeenNthCalledWith(2, {
      url: '/api/admin/custom-ai/daily-limit',
      method: 'put',
      data: { limit: 80 }
    })
  })
})
