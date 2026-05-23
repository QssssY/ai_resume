import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ElementPlus from 'element-plus'
import GrowthCenterView from '@/views/growth/GrowthCenterView.vue'
import { getGrowthOverview, getInterviewRadar } from '@/api/growth'

vi.mock('@/api/growth', () => ({
  getGrowthOverview: vi.fn(() => Promise.resolve({
    data: {
      summary: {
        latestResumeScore: 82,
        latestInterviewScore: 76,
        resumeDiagnosisCount: 3,
        mockInterviewCount: 2
      },
      resumeScoreTrend: [{ date: '05/20', score: 82 }],
      interviewScoreTrend: [{ date: '05/21', score: 76 }],
      growthConfig: {
        encouragementMessages: ['你的简历质量已经超过 80 分，适合继续打磨岗位匹配。'],
        milestones: [
          {
            configKey: 'milestone_first_interview',
            title: '完成第一次模拟面试',
            description: '开始沉淀面试反馈',
            sort: 1
          }
        ]
      }
    }
  })),
  getInterviewRadar: vi.fn(() => Promise.resolve({ data: { sessionCount: 0 } }))
}))

let currentWrapper = null

const mountView = () => {
  currentWrapper = mount(GrowthCenterView, {
    global: {
      plugins: [ElementPlus],
      mocks: {
        $router: { push: vi.fn() }
      },
      stubs: {
        LineChart: { template: '<div class="line-chart-stub"></div>' },
        RadarChart: { template: '<div class="radar-chart-stub"></div>' },
        RadarScorePanel: { template: '<div class="radar-panel-stub"></div>' }
      }
    }
  })
  return currentWrapper
}

describe('GrowthCenterView', () => {
  afterEach(() => {
    currentWrapper?.unmount()
    currentWrapper = null
    vi.clearAllMocks()
  })

  it('renders admin configured encouragement messages and milestones', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(getGrowthOverview).toHaveBeenCalled()
    expect(getInterviewRadar).toHaveBeenCalled()
    expect(wrapper.text()).toContain('成长激励')
    expect(wrapper.text()).toContain('你的简历质量已经超过 80 分，适合继续打磨岗位匹配。')
    expect(wrapper.text()).toContain('成长里程碑')
    expect(wrapper.text()).toContain('完成第一次模拟面试')
    expect(wrapper.text()).toContain('开始沉淀面试反馈')
  })
})
