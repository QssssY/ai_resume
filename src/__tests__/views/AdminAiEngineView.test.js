import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ElementPlus from 'element-plus'
import AdminAiEngineView from '@/views/admin/AdminAiEngineView.vue'
import {
  getAdminAiEngines,
  testAdminAiEngineConnectivity
} from '@/api/admin/aiEngines'
import { showAdminSuccess } from '@/utils/adminFeedback'

let currentWrapper = null

vi.mock('@/api/admin/aiEngines', () => ({
  createAdminAiEngine: vi.fn(() => Promise.resolve({ data: 1 })),
  deleteAiEngine: vi.fn(() => Promise.resolve()),
  deleteAiEngines: vi.fn(() => Promise.resolve()),
  getAdminAiEngines: vi.fn(() => Promise.resolve({ data: [] })),
  testAdminAiEngineConnectivity: vi.fn(),
  toggleAdminAiEngineActive: vi.fn(() => Promise.resolve()),
  toggleAiEnginesBatchActive: vi.fn(() => Promise.resolve()),
  updateAdminAiEngine: vi.fn(() => Promise.resolve())
}))

vi.mock('@/utils/adminFeedback', () => ({
  confirmAdminRiskAction: vi.fn(() => Promise.resolve()),
  resolveAdminTableEmptyText: vi.fn(() => '暂无 AI 引擎配置'),
  showAdminError: vi.fn(),
  showAdminSuccess: vi.fn(),
  showAdminWarning: vi.fn()
}))

const mountView = async () => {
  currentWrapper = mount(AdminAiEngineView, {
    attachTo: document.body,
    global: {
      plugins: [ElementPlus],
      stubs: {
        transition: false
      }
    }
  })
  await flushPromises()
  return currentWrapper
}

describe('AdminAiEngineView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testAdminAiEngineConnectivity.mockResolvedValue({
      data: {
        success: true,
        message: '连通测试成功',
        latencyMs: 12,
        responsePreview: 'ok'
      }
    })
  })

  afterEach(() => {
    currentWrapper?.unmount()
    currentWrapper = null
  })

  it('should call connectivity test API with current form values and show result', async () => {
    const wrapper = await mountView()
    wrapper.vm.openCreateDialog()
    await nextTick()
    Object.assign(wrapper.vm.formData, {
      engineCode: 'test-engine',
      engineName: '测试引擎',
      providerType: 'openai',
      businessType: 'interview',
      modelName: 'gpt-test',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-real',
      thinkingMode: 'none',
      temperature: 0.2,
      maxTokens: 64,
      timeoutMs: 30000,
      isActive: 1,
      sort: 0
    })

    await wrapper.vm.handleConnectivityTest()
    await flushPromises()

    expect(getAdminAiEngines).toHaveBeenCalled()
    expect(testAdminAiEngineConnectivity).toHaveBeenCalledWith({
      id: null,
      providerType: 'openai',
      modelName: 'gpt-test',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-real',
      thinkingMode: 'none',
      temperature: 0.2,
      maxTokens: 64,
      timeoutMs: 30000
    })
    expect(wrapper.vm.connectivityTestResult).toMatchObject({
      success: true,
      message: '连通测试成功',
      latencyMs: 12,
      responsePreview: 'ok'
    })
    expect(showAdminSuccess).toHaveBeenCalledWith('连通测试成功')
  })
})
