<template>
  <div class="auth-view">
    <!-- 左侧品牌展示区 -->
    <div class="brand-section">
      <div class="brand-content">
        <div class="brand-logo">
          <img :src="brandLogo" alt="系统Logo" class="logo-image" />
        </div>
        <h1 class="brand-title">智能模拟面试与简历诊断系统</h1>
        <p class="brand-desc">专业的AI驱动求职辅助平台</p>
        <div class="brand-features">
          <div class="feature-item">
            <span class="feature-dot"></span>
            <span class="feature-text">智能简历诊断</span>
          </div>
          <div class="feature-item">
            <span class="feature-dot"></span>
            <span class="feature-text">AI模拟面试</span>
          </div>
          <div class="feature-item">
            <span class="feature-dot"></span>
            <span class="feature-text">个性化优化建议</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧认证表单区 -->
    <div class="form-section">
      <div class="form-card">
        <!-- 切换标签 -->
        <div class="tab-switch">
          <button
            class="tab-button"
            :class="{ active: authMode === 'login' }"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            class="tab-button"
            :class="{ active: authMode === 'register' }"
            @click="switchMode('register')"
          >
            注册
          </button>
        </div>

        <!-- 登录表单 -->
        <template v-if="authMode === 'login'">
          <div class="form-header">
            <h2 class="form-title">欢迎回来</h2>
            <p class="form-subtitle">请登录以继续使用系统</p>
          </div>

          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            class="auth-form"
            size="large"
            @keyup.enter="handleLogin"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                :prefix-icon="User"
                clearable
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                show-password
                clearable
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                class="submit-button"
                :loading="loading"
                :disabled="loading"
                style="width: 100%"
                @click="handleLogin"
              >
                {{ loading ? '登录中...' : '登录' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="form-footer">
            <span class="footer-text">还没有账号？</span>
            <el-button link type="primary" @click="switchMode('register')">
              立即注册
            </el-button>
          </div>
        </template>

        <!-- 注册表单 -->
        <template v-else>
          <div class="form-header">
            <h2 class="form-title">创建账号</h2>
            <p class="form-subtitle">注册后即可使用全部功能</p>
          </div>

          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            class="auth-form"
            size="large"
            @keyup.enter="handleRegister"
          >
            <el-form-item prop="username">
              <el-input
                v-model="registerForm.username"
                placeholder="请设置用户名（3-50个字符）"
                :prefix-icon="User"
                clearable
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请设置密码（6-100个字符）"
                :prefix-icon="Lock"
                show-password
                clearable
              />
            </el-form-item>

            <el-form-item prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                :prefix-icon="Lock"
                show-password
                clearable
                @keyup.enter="handleRegister"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                class="submit-button"
                :loading="loading"
                :disabled="loading"
                style="width: 100%"
                @click="handleRegister"
              >
                {{ loading ? '注册中...' : '注册' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="form-footer">
            <span class="footer-text">已有账号？</span>
            <el-button link type="primary" @click="switchMode('login')">
              立即登录
            </el-button>
          </div>
        </template>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="error-message">
          <el-icon><WarningFilled /></el-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 注册成功提示 -->
        <div v-if="registerSuccess" class="success-message">
          <el-icon color="#67c23a"><CircleCheck /></el-icon>
          <span>{{ registerSuccess }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, WarningFilled, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { login, register } from '@/api/auth'
import brandLogo from '@/assets/logo.jpg'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 状态
const authMode = ref('login')
const loading = ref(false)
const errorMessage = ref('')
const registerSuccess = ref('')

// 表单引用
const loginFormRef = ref(null)
const registerFormRef = ref(null)

// 登录表单
const loginForm = reactive({
  username: '',
  password: ''
})

// 注册表单
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

// 登录校验规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度为 3-50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 100, message: '密码长度为 6-100 个字符', trigger: 'blur' }
  ]
}

// 注册校验规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度为 3-50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 100, message: '密码长度为 6-100 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 切换模式
const switchMode = (mode) => {
  authMode.value = mode
  errorMessage.value = ''
  registerSuccess.value = ''
  // 重置表单
  if (mode === 'login' && loginFormRef.value) {
    loginFormRef.value.resetFields()
  } else if (mode === 'register' && registerFormRef.value) {
    registerFormRef.value.resetFields()
  }
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMessage.value = ''
    registerSuccess.value = ''

    try {
      await userStore.doLogin({
        username: loginForm.username,
        password: loginForm.password
      })

      ElMessage.success('登录成功')

      // 登录成功后跳转
      const redirect = route.query.redirect || '/'
      router.push(redirect)
    } catch (err) {
      errorMessage.value = err.message || '登录失败，请检查用户名和密码'
    } finally {
      loading.value = false
    }
  })
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMessage.value = ''
    registerSuccess.value = ''

    try {
      await register({
        username: registerForm.username,
        password: registerForm.password
      })

      registerSuccess.value = '注册成功，请使用新账号登录'
      ElMessage.success('注册成功')

      // 注册成功后，3秒后切回登录态
      setTimeout(() => {
        switchMode('login')
        // 预填用户名
        loginForm.username = registerForm.username
      }, 2000)
    } catch (err) {
      errorMessage.value = err.message || '注册失败，请稍后重试'
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  background-color: #fff;
}

/* 左侧品牌展示区 */
.brand-section {
  width: 45%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.brand-content {
  text-align: center;
  color: #fff;
}

.brand-logo {
  margin-bottom: 32px;
}

.logo-image {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  object-fit: cover;
  background-color: rgba(255, 255, 255, 0.2);
}

.brand-title {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: 600;
}

.brand-desc {
  margin: 0 0 40px 0;
  font-size: 16px;
  opacity: 0.9;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  max-width: 300px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  opacity: 0.95;
}

.feature-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #fff;
  flex-shrink: 0;
}

.feature-text {
  text-align: left;
}

/* 右侧认证表单区 */
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: #fafafa;
}

.form-card {
  width: 100%;
  max-width: 420px;
  background-color: #fff;
  border-radius: 8px;
  padding: 40px;
}

/* 切换标签 */
.tab-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  padding: 4px;
  background-color: #f5f7fa;
  border-radius: 6px;
}

.tab-button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.tab-button:hover {
  background-color: #e4e7ed;
}

.tab-button.active {
  background-color: #fff;
  color: #409eff;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 表单头部 */
.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-title {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 500;
  color: #303133;
}

.form-subtitle {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.auth-form {
  margin-bottom: 20px;
}

.submit-button {
  margin-top: 8px;
}

.form-footer {
  text-align: center;
  font-size: 14px;
  color: #606266;
}

.footer-text {
  margin-right: 4px;
}

/* 错误提示 */
.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  font-size: 13px;
  color: #f56c6c;
  margin-top: 16px;
}

/* 成功提示 */
.success-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background-color: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  font-size: 13px;
  color: #67c23a;
  margin-top: 16px;
}
</style>
