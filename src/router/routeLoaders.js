export const templateLibraryRouteLoader = () => import('@/views/template/TemplateLibraryView.vue')
export const communityRouteLoader = () => import('@/views/community/CommunityView.vue')
export const growthCenterRouteLoader = () => import('@/views/growth/GrowthCenterView.vue')
export const resumeUploadRouteLoader = () => import('@/views/resume/UploadView.vue')
export const resumeResultRouteLoader = () => import('@/views/resume/ResultView.vue')
export const interviewEntryRouteLoader = () => import('@/views/interview/InterviewEntryView.vue')
export const offerAssistRouteLoader = () => import('@/views/offer/OfferAssistView.vue')
export const adminDashboardRouteLoader = () => import('@/views/admin/AdminDashboardView.vue')
export const adminCommunityReviewRouteLoader = () => import('@/views/admin/AdminCommunityReviewView.vue')
export const adminMonitorRouteLoader = () => import('@/views/admin/AdminMonitorView.vue')
export const adminUserRightsRouteLoader = () => import('@/views/admin/AdminUserRightsView.vue')
export const adminAuditLogRouteLoader = () => import('@/views/admin/AdminAuditLogView.vue')
export const adminNotificationRouteLoader = () => import('@/views/admin/AdminNotificationView.vue')
export const adminFeedbackRouteLoader = () => import('@/views/admin/AdminFeedbackView.vue')
export const adminVersionLogRouteLoader = () => import('@/views/admin/AdminVersionLogView.vue')
export const adminMembershipPlanRouteLoader = () => import('@/views/admin/AdminMembershipPlanView.vue')
export const adminMembershipOrderRouteLoader = () => import('@/views/admin/AdminMembershipOrderView.vue')
export const adminJobRoleRouteLoader = () => import('@/views/admin/AdminJobRoleView.vue')
export const adminPromptRouteLoader = () => import('@/views/admin/AdminPromptView.vue')
export const adminAiEngineRouteLoader = () => import('@/views/admin/AdminAiEngineView.vue')
export const adminGrowthConfigRouteLoader = () => import('@/views/admin/AdminGrowthConfigView.vue')

export const prefetchableUserRouteLoaders = {
  '/templates': templateLibraryRouteLoader,
  '/community': communityRouteLoader,
  '/growth': growthCenterRouteLoader,
  '/resume/upload': resumeUploadRouteLoader,
  '/resume/result': resumeResultRouteLoader,
  '/interview/entry': interviewEntryRouteLoader,
  '/offer': offerAssistRouteLoader
}

export const prefetchableAdminRouteLoaders = {
  '/admin/dashboard': adminDashboardRouteLoader,
  '/admin/community': adminCommunityReviewRouteLoader,
  '/admin/monitor': adminMonitorRouteLoader,
  '/admin/users': adminUserRightsRouteLoader,
  '/admin/audit-logs': adminAuditLogRouteLoader,
  '/admin/notifications': adminNotificationRouteLoader,
  '/admin/feedback': adminFeedbackRouteLoader,
  '/admin/version-logs': adminVersionLogRouteLoader,
  '/admin/membership/plans': adminMembershipPlanRouteLoader,
  '/admin/membership/orders': adminMembershipOrderRouteLoader,
  '/admin/job-roles': adminJobRoleRouteLoader,
  '/admin/prompts': adminPromptRouteLoader,
  '/admin/ai-engines': adminAiEngineRouteLoader,
  '/admin/growth-config': adminGrowthConfigRouteLoader
}

const prefetchedRoutes = new Set()
const prefetchedAdminRoutes = new Set()

export function prefetchUserRoute(path) {
  const loader = prefetchableUserRouteLoaders[path]
  if (!loader || prefetchedRoutes.has(path)) return null

  prefetchedRoutes.add(path)
  return loader().catch((error) => {
    prefetchedRoutes.delete(path)
    throw error
  })
}

export function prefetchAdminRoute(path) {
  const loader = prefetchableAdminRouteLoaders[path]
  if (!loader || prefetchedAdminRoutes.has(path)) return null

  // 管理端只在导航意图明确时预取，避免进入后台后一次性拉满所有页面 chunk。
  prefetchedAdminRoutes.add(path)
  return loader().catch((error) => {
    prefetchedAdminRoutes.delete(path)
    throw error
  })
}

const idleWarmupRoutes = ['/templates', '/community', '/growth', '/resume/upload', '/resume/result', '/interview/entry', '/offer']

export function warmupHighFrequencyUserRoutes() {
  const runWarmup = () => {
    idleWarmupRoutes.forEach((path) => {
      prefetchUserRoute(path)?.catch(() => {})
    })
  }

  if (typeof window === 'undefined') return null

  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(runWarmup, { timeout: 3000 })
  }

  return window.setTimeout(runWarmup, 800)
}
