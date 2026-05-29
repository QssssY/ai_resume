import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('apiCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it('deduplicates concurrent cacheable requests and reuses values before ttl expires', async () => {
    const { cachedGet, clearApiCache } = await import('@/utils/apiCache')
    clearApiCache()
    const loader = vi.fn(() => Promise.resolve({ data: { value: 1 } }))

    const first = cachedGet('public:stats', 300000, loader)
    const second = cachedGet('public:stats', 300000, loader)

    await expect(first).resolves.toEqual({ data: { value: 1 } })
    await expect(second).resolves.toEqual({ data: { value: 1 } })
    expect(loader).toHaveBeenCalledTimes(1)

    await expect(cachedGet('public:stats', 300000, loader)).resolves.toEqual({ data: { value: 1 } })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('reloads after ttl expires and supports prefix invalidation', async () => {
    const { cachedGet, clearApiCacheByPrefix } = await import('@/utils/apiCache')
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ data: { value: 1 } })
      .mockResolvedValueOnce({ data: { value: 2 } })
      .mockResolvedValueOnce({ data: { value: 3 } })

    await cachedGet('membership:plans', 1000, loader)
    vi.advanceTimersByTime(1001)
    await expect(cachedGet('membership:plans', 1000, loader)).resolves.toEqual({ data: { value: 2 } })

    clearApiCacheByPrefix('membership')
    await expect(cachedGet('membership:plans', 1000, loader)).resolves.toEqual({ data: { value: 3 } })
    expect(loader).toHaveBeenCalledTimes(3)
  })
})
