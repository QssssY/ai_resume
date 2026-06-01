import { beforeEach, describe, expect, it, vi } from 'vitest'

import { streamInterviewMessage } from '@/api/interview'

describe('interview API fallbackToPlatform', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
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
