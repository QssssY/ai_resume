import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/utils/auth'

// 不需要登录的页面
const publicPages = ['/login']

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/HomeView.vue')
      },
      {
        path: 'resume/upload',
        name: 'ResumeUpload',
        component: () => import('@/views/resume/UploadView.vue')
      },
      {
        path: 'resume/result/:taskId',
        name: 'ResumeResult',
        component: () => import('@/views/resume/ResultView.vue')
      },
      {
        path: 'resume/history',
        name: 'ResumeHistory',
        component: () => import('@/views/resume/HistoryView.vue')
      },
      {
        path: 'interview/entry',
        name: 'InterviewEntry',
        component: () => import('@/views/interview/InterviewEntryView.vue')
      },
      {
        path: 'interview/session/:sessionId',
        name: 'InterviewSession',
        component: () => import('@/views/interview/InterviewSessionView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)

  if (requiresAuth && !isLoggedIn()) {
    // 需要登录但未登录，跳转到登录页
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else if (to.path === '/login' && isLoggedIn()) {
    // 已登录用户访问登录页，跳转到首页
    next('/')
  } else {
    next()
  }
})

export default router
