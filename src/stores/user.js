import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getToken, setToken, removeToken, isLoggedIn } from '@/utils/auth'
import { login, getCurrentUser } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(getToken())
  const userInfo = ref(null)
  const loading = ref(false)

  // 登录
  const doLogin = async (loginData) => {
    loading.value = true
    try {
      const res = await login(loginData)
      const { token: tokenStr, tokenType } = res.data
      setToken(tokenStr, tokenType)
      token.value = tokenStr
      // 登录成功后获取用户信息
      await fetchUserInfo()
      return res
    } finally {
      loading.value = false
    }
  }

  // 获取用户信息
  const fetchUserInfo = async () => {
    if (!isLoggedIn()) return
    try {
      const res = await getCurrentUser()
      userInfo.value = res.data
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  }

  // 登出
  const doLogout = () => {
    removeToken()
    token.value = null
    userInfo.value = null
  }

  return {
    token,
    userInfo,
    loading,
    isLoggedIn,
    doLogin,
    fetchUserInfo,
    doLogout
  }
})
