import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/request', () => ({
  default: vi.fn((config) => Promise.resolve({ code: 200, data: config }))
}))

import request from '@/utils/request'
import { analyzeResumeJobMatch, analyzeResumePolish, uploadResume } from '@/api/resume'

describe('resume API fallbackToPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send fallbackToPlatform for AI resume entrypoints', async () => {
    const file = new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })
    await uploadResume(file, { fallbackToPlatform: true })
    await analyzeResumeJobMatch({ resumeTaskId: '1', resumeText: 'resume', jdText: 'jd' }, { fallbackToPlatform: true })
    await analyzeResumePolish({ resumeTaskId: '1', resumeText: 'resume' }, { fallbackToPlatform: true })

    expect(request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: '/api/resume/upload',
      method: 'post',
      params: { fallbackToPlatform: true }
    }))
    expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/api/resume/job-match/analyze',
      method: 'post',
      data: expect.objectContaining({ fallbackToPlatform: true }),
      skipDefaultErrorHandler: true
    }))
    expect(request).toHaveBeenNthCalledWith(3, expect.objectContaining({
      url: '/api/resume/polish/analyze',
      method: 'post',
      data: expect.objectContaining({ fallbackToPlatform: true }),
      skipDefaultErrorHandler: true
    }))
  })
})
