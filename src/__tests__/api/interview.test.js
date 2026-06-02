import { beforeEach, describe, expect, it, vi } from 'vitest'

import request from '@/utils/request'
import { getInterviewSessionStatus, streamInterviewMessage } from '@/api/interview'

vi.mock('@/utils/request', () => ({
  default: vi.fn(),
}))

describe('interview API fallbackToPlatform', () => {
  beforeEach(() => {
    request.mockReset()
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
  })

  it('should request lightweight session status', async () => {
    request.mockResolvedValueOnce({ data: { sessionId: 'session-1', reportReady: true } })

    await getInterviewSessionStatus('session-1')

    expect(request).toHaveBeenCalledWith({
      url: '/api/interview/session/session-1/status',
      method: 'get'
    })
  })

  it('should include fallbackToPlatform in stream body when requested', async () => {
    await streamInterviewMessage(
      'session-1',
      { content: 'answer', feedbackMode: 'immediate' },
      'token',
      { fallbackToPlatform: true }
    )

    expect(global.fetch).toHaveBeenCalledWith('/api/interview/session/session-1/message/stream', expect.objectContaining({
      body: JSON.stringify({
        content: 'answer',
        feedbackMode: 'immediate',
        fallbackToPlatform: true
      })
    }))
  })
})
