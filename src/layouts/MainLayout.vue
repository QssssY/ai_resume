<template>
  <div class="main-layout">
    <header class="layout-header">
      <div class="header-content">
        <div class="header-left">
          <div class="logo">智能模拟面试与简历诊断系统</div>
        </div>
        <div class="header-right">
          <template v-if="userStore.isLoggedIn()">
            <span class="user-name">{{ userStore.userInfo?.username || '用户' }}</span>
            <el-button link type="primary" size="small" @click="handleLogout">退出</el-button>
          </template>
          <template v-else>
            <router-link to="/login" class="login-link">登录</router-link>
          </template>
        </div>
      </div>
    </header>
    <main class="layout-main">
      <aside class="layout-sidebar">
        <nav class="sidebar-nav">
          <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }">
            <span class="nav-icon">首</span>
            <span>首页</span>
          </router-link>
          <router-link to="/resume/upload" class="nav-item" :class="{ active: isResumeDiagnosisActive }">
            <span class="nav-icon">简</span>
            <span>简历诊断</span>
          </router-link>
          <router-link to="/interview/entry" class="nav-item" :class="{ active: isInterviewActive }">
            <span class="nav-icon">面</span>
            <span>模拟面试</span>
          </router-link>

          <!-- 历史记录子菜单 - 纯自定义实现 -->
          <div class="nav-group">
            <div
              class="nav-item nav-group-title"
              :class="{ active: isHistoryActive }"
              @click="toggleHistoryMenu"
            >
              <span class="nav-icon">历</span>
              <span>历史记录</span>
              <span class="expand-icon" :class="{ expanded: isHistoryExpanded }">▼</span>
            </div>
            <div v-show="isHistoryExpanded" class="nav-group-content">
              <router-link to="/resume/history" class="nav-subitem" :class="{ active: $route.path === '/resume/history' }">
                <span>简历诊断历史</span>
              </router-link>
              <router-link to="/interview/history" class="nav-subitem" :class="{ active: $route.path === '/interview/history' }">
                <span>模拟面试历史</span>
              </router-link>
            </div>
          </div>
        </nav>
      </aside>
      <section class="layout-content">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 简历诊断菜单激活判断
// 仅当路由以 /resume 开头，但不以 /resume/history 开头时激活
const isResumeDiagnosisActive = computed(() => {
  const path = route.path
  return path.startsWith('/resume') && !path.startsWith('/resume/history')
})

// 模拟面试菜单激活判断
// 当路由以 /interview 开头，但不以 /interview/history 开头时激活
const isInterviewActive = computed(() => {
  const path = route.path
  return path.startsWith('/interview') && !path.startsWith('/interview/history')
})

// 历史记录菜单激活判断
// 当路由是 /resume/history 或 /interview/history 时激活
const isHistoryActive = computed(() => {
  const path = route.path
  return path === '/resume/history' || path === '/interview/history'
})

// 历史记录子菜单展开状态（默认展开，如果当前在历史记录相关页面）
const isHistoryExpanded = ref(isHistoryActive.value)

// 切换历史记录菜单展开状态
const toggleHistoryMenu = () => {
  isHistoryExpanded.value = !isHistoryExpanded.value
}

// 初始化时获取用户信息
if (userStore.isLoggedIn() && !userStore.userInfo) {
  userStore.fetchUserInfo()
}

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.doLogout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.layout-header {
  height: 56px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-content {
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  font-size: 14px;
  color: #606266;
}

.login-link {
  font-size: 14px;
  color: #409eff;
  text-decoration: none;
}

.layout-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.layout-sidebar {
  width: 200px;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.sidebar-nav {
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 14px;
  text-decoration: none;
}

.nav-item:hover {
  background-color: #f5f7fa;
  color: #303133;
}

.nav-item.active {
  background-color: #ecf5ff;
  color: #409eff;
  border-right: 3px solid #409eff;
}

.nav-icon {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  background-color: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #606266;
  flex-shrink: 0;
}

.nav-item.active .nav-icon {
  background-color: #409eff;
  color: #fff;
}

/* 导航组样式 */
.nav-group {
  border-bottom: none;
}

.nav-group-title {
  position: relative;
  user-select: none;
}

.expand-icon {
  position: absolute;
  right: 16px;
  font-size: 10px;
  color: #909399;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.nav-group-content {
  background-color: #fafafa;
  padding: 4px 0;
}

.nav-subitem {
  display: block;
  padding: 10px 20px 10px 50px;
  color: #606266;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.15s;
}

.nav-subitem:hover {
  color: #409eff;
  background-color: #f0f2f5;
}

.nav-subitem.active {
  color: #409eff;
  background-color: #e6f2ff;
}

.layout-content {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
</style>
