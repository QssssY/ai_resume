<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <div class="brand-title">管理端</div>
        <div class="brand-subtitle">AI 面试与简历系统</div>
      </div>

      <nav class="admin-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="admin-nav-item"
          :class="{ active: isNavActive(item.path) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <div class="admin-main">
      <header class="admin-header">
        <div class="admin-header-title">后台管理</div>
        <div class="admin-header-right">
          <span class="admin-user-name">
            {{ adminStore.adminInfo?.username || '管理员' }}
          </span>
          <el-button text type="danger" @click="handleLogout">退出</el-button>
        </div>
      </header>

      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAdminUserStore } from '@/stores/adminUser'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminUserStore()

// 管理端侧边导航：先覆盖当前核心可用模块。
const navItems = computed(() => [
  { path: '/admin/dashboard', label: '数据看板' },
  // 监控入口放在看板下方，便于先看业务指标再看运行态。
  { path: '/admin/monitor', label: '监控总览' },
  { path: '/admin/job-roles', label: '岗位配置' },
  { path: '/admin/prompts', label: 'Prompt 管理' },
  { path: '/admin/ai-engines', label: 'AI 引擎' },
  { path: '/admin/users', label: '用户权益' }
])

/**
 * 导航高亮判断。
 * 作用：进入子模块后侧栏菜单保持正确高亮。
 * @param {string} navPath
 * @returns {boolean}
 */
const isNavActive = (navPath) => route.path.startsWith(navPath)

/**
 * 页面刷新后如果 Pinia 内存态丢失，主动补拉管理员信息。
 * 作用：确保头部用户名与权限状态不依赖单页内存。
 */
onMounted(async () => {
  if (adminStore.adminInfo) return
  try {
    await adminStore.fetchAdminInfo()
  } catch (error) {
    adminStore.doAdminLogout()
    ElMessage.error(error?.message || '管理员登录态已失效，请重新登录')
    router.push('/admin/login')
  }
})

/**
 * 管理端退出逻辑。
 * 说明：仅清理管理端会话，不影响用户端 token。
 */
const handleLogout = () => {
  adminStore.doAdminLogout()
  router.push('/admin/login')
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 220px 1fr;
  background: #fff7ef;
}

.admin-sidebar {
  background: linear-gradient(180deg, #ffb075 0%, #ff8f42 100%);
  color: #fff;
  padding: 22px 16px;
}

.admin-brand {
  margin-bottom: 24px;
}

.brand-title {
  font-size: 24px;
  font-weight: 700;
}

.brand-subtitle {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.9;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-nav-item {
  color: #fff;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.admin-nav-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.admin-nav-item.active {
  background: #fff;
  color: #e5762b;
  font-weight: 600;
}

.admin-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-header {
  height: 60px;
  padding: 0 20px;
  border-bottom: 1px solid #f1d7c2;
  background: #fffdfb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-header-title {
  font-size: 18px;
  font-weight: 600;
  color: #7a3a12;
}

.admin-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-user-name {
  font-size: 13px;
  color: #a15b2f;
}

.admin-content {
  padding: 16px 18px;
}

@media (max-width: 900px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    padding: 12px 14px;
  }

  .admin-brand {
    margin-bottom: 10px;
  }

  .admin-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .admin-nav-item {
    text-align: center;
  }
}
</style>
