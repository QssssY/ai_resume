import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, getTokenType, removeToken, isLoggedIn } from '@/utils/auth'
import router from '@/router'

const request = axios.create({
  baseURL: '',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 自动注入 token
    if (isLoggedIn()) {
      const token = getToken()
      const tokenType = getTokenType()
      config.headers.Authorization = `${tokenType} ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 200) {
      return res
    } else {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401:
          // 未授权，清除 token 并跳转登录页
          removeToken()
          ElMessage.error('登录已过期，请重新登录')
          // 保存当前路径，登录后返回
          const currentPath = router.currentRoute.value.fullPath
          router.push({
            path: '/login',
            query: { redirect: currentPath }
          })
          break
        case 403:
          ElMessage.error('无权限访问')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        default:
          ElMessage.error(data?.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error('请求失败')
    }
    return Promise.reject(error)
  }
)

export default request
