import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/utils/auth'

const routes = [
  // 站点首页
  {
    path: '/',
    name: 'HomePage',
    component: () => import('@/views/HomePageView.vue'),
    meta: { requiresAuth: false, useLayout: true }
  },
  // 登录页
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false, useLayout: false }
  },
  // 个人中心 / 控制台
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 简历上传
  {
    path: '/resume/upload',
    name: 'ResumeUpload',
    component: () => import('@/views/resume/UploadView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 简历结果
  {
    path: '/resume/result/:taskId',
    name: 'ResumeResult',
    component: () => import('@/views/resume/ResultView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 简历历史
  {
    path: '/resume/history',
    name: 'ResumeHistory',
    component: () => import('@/views/resume/HistoryView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 面试入口
  {
    path: '/interview/entry',
    name: 'InterviewEntry',
    component: () => import('@/views/interview/InterviewEntryView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 面试会话
  {
    path: '/interview/session/:sessionId',
    name: 'InterviewSession',
    component: () => import('@/views/interview/InterviewSessionView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 面试历史
  {
    path: '/interview/history',
    name: 'InterviewHistory',
    component: () => import('@/views/interview/InterviewHistoryView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 面试报告
  {
    path: '/interview/report/:sessionId',
    name: 'InterviewReport',
    component: () => import('@/views/interview/InterviewReportView.vue'),
    meta: { requiresAuth: true, useLayout: true }
  },
  // 404 兜底
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth === true)

  // 需要登录但未登录，跳转登录页
  if (requiresAuth && !isLoggedIn()) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
  // 已登录用户访问登录页，跳转首页
  else if (to.path === '/login' && isLoggedIn()) {
    next('/')
  }
  // 其他情况正常放行
  else {
    next()
  }
})

export default router
