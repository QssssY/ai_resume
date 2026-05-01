import request from '@/utils/request'

/**
 * 获取个人成长中心概览数据
 * 聚合简历诊断、JD匹配、AI润色、模拟面试等维度的成长数据
 * @returns {Promise}
 */
export function getGrowthOverview() {
  return request({
    url: '/api/user/growth/overview',
    method: 'get'
  })
}
