<template>
  <div class="admin-login-page">
    <div class="admin-login-card">
      <div class="login-title">管理端登录</div>
      <div class="login-subtitle">仅管理员账号可访问 /admin 路由</div>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入管理员用户名"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-button
          type="primary"
          class="login-btn"
          :loading="adminStore.loading"
          @click="handleLogin"
        >
          登录管理端
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAdminUserStore } from '@/stores/adminUser'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminUserStore()

const formRef = ref(null)
const formData = reactive({
  username: '',
  password: ''
})

// 管理端登录表单校验，保持最小可用规则。
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!formRef.value) return

  const isValid = await formRef.value.validate().catch(() => false)
  if (!isValid) return

  try {
    await adminStore.doAdminLogin(formData)
    ElMessage.success('管理端登录成功')
    const redirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : '/admin/dashboard'
    router.push(redirect)
  } catch (error) {
    ElMessage.error(error?.message || '管理端登录失败')
  }
}
</script>

<style scoped>
.admin-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 20%, #ffd8bb 0%, #fff6ee 45%, #fff 100%);
  padding: 24px;
}

.admin-login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 26px 22px;
  box-shadow: 0 12px 30px rgba(217, 117, 47, 0.15);
  border: 1px solid #f5d6be;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #8f451b;
}

.login-subtitle {
  margin-top: 6px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #b17149;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
