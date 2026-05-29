import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/adminRequest', () => ({
  default: vi.fn((config) => Promise.resolve({ code: 200, data: config }))
}))

import adminRequest from '@/utils/adminRequest'
import { getAdminUsers, getAdminUserStats, updateUsersBatchStatus } from '@/api/admin/users'

describe('admin users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updateUsersBatchStatus sends string ids to avoid precision loss', async () => {
    await updateUsersBatchStatus(['9007199254740993', 123], 0)

    expect(adminRequest).toHaveBeenCalledWith({
      url: '/api/admin/users/batch/status',
      method: 'put',
      data: {
        ids: ['9007199254740993', '123'],
        isActive: 0
      }
    })
  })

  it('getAdminUsers passes server-side pagination and vip state filters', async () => {
    await getAdminUsers({
      page: 2,
      size: 50,
      keyword: 'alice',
      role: 1,
      status: 1,
      vipState: 'active'
    })

    expect(adminRequest).toHaveBeenCalledWith({
      url: '/api/admin/users',
      method: 'get',
      params: {
        page: 2,
        size: 50,
        keyword: 'alice',
        role: 1,
        status: 1,
        vipState: 'active'
      }
    })
  })

  it('getAdminUserStats requests the admin user stats endpoint', async () => {
    await getAdminUserStats()

    expect(adminRequest).toHaveBeenCalledWith({
      url: '/api/admin/users/stats',
      method: 'get'
    })
  })
})
