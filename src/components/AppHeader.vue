<template>
  <header class="app-header">
    <div class="header-left">
      <img src="@/assets/logo.jpg" class="logo-img" />
      <span class="logo-text">智能模拟面试与简历诊断系统</span>
    </div>

    <nav class="header-nav">
      <!-- 首页始终显示 -->
      <router-link to="/" class="nav-link" :class="{ active: isHomeActive }">
        首页
      </router-link>

      <!-- 已登录才显示简历诊断 -->
      <router-link
        v-if="userStore.isLoggedIn()"
        to="/resume/upload"
        class="nav-link"
        :class="{ active: isResumeActive }"
      >
        简历诊断
      </router-link>

      <!-- 已登录才显示模拟面试 -->
      <router-link
        v-if="userStore.isLoggedIn()"
        to="/interview/entry"
        class="nav-link"
        :class="{ active: isInterviewActive }"
      >
        模拟面试
      </router-link>

      <!-- 已登录才显示历史记录下拉菜单 -->
      <div v-if="userStore.isLoggedIn()" class="history-dropdown-wrapper">
        <el-dropdown trigger="click" @command="handleHistoryCommand">
          <span
            class="nav-link history-trigger"
            :class="{ active: isHistoryActive }"
          >
            历史记录
            <svg
              class="dropdown-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
          <template #dropdown>
            <el-dropdown-menu class="history-dropdown-menu">
              <el-dropdown-item
                command="resume"
                class="dropdown-item"
                :class="{ active: isResumeHistoryActive }"
              >
                <svg
                  class="dropdown-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                简历诊断历史
              </el-dropdown-item>
              <el-dropdown-item
                command="interview"
                class="dropdown-item"
                :class="{ active: isInterviewHistoryActive }"
              >
                <svg
                  class="dropdown-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                模拟面试历史
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </nav>

    <div class="header-right">
      <!-- 已登录状态：显示头像和下拉菜单 -->
      <template v-if="userStore.isLoggedIn()">
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-avatar-wrapper">
            <img src="@/assets/user.png" class="user-avatar" />
          </div>
          <template #dropdown>
            <el-dropdown-menu class="user-dropdown-menu">
              <!-- 个人中心入口 -->
              <el-dropdown-item command="profile" class="dropdown-item">
                <svg
                  class="dropdown-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                个人中心
              </el-dropdown-item>
              <!-- 退出登录 -->
              <el-dropdown-item
                command="logout"
                class="dropdown-item logout-item"
              >
                <svg
                  class="dropdown-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
      <!-- 未登录状态：显示登录/注册链接 -->
      <template v-else>
        <router-link to="/login" class="login-link">登录/注册</router-link>
      </template>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 首页激活状态
const isHomeActive = computed(() => {
  return route.path === "/";
});

// 简历诊断激活状态
const isResumeActive = computed(() => {
  const path = route.path;
  return path.startsWith("/resume") && !path.startsWith("/resume/history");
});

// 模拟面试激活状态
const isInterviewActive = computed(() => {
  const path = route.path;
  return (
    path.startsWith("/interview") && !path.startsWith("/interview/history")
  );
});

// 历史记录父级激活状态
const isHistoryActive = computed(() => {
  const path = route.path;
  return path === "/resume/history" || path === "/interview/history";
});

// 简历诊断历史激活状态
const isResumeHistoryActive = computed(() => {
  return route.path === "/resume/history";
});

// 模拟面试历史激活状态
const isInterviewHistoryActive = computed(() => {
  return route.path === "/interview/history";
});

// 处理历史记录下拉菜单命令
const handleHistoryCommand = (command) => {
  if (command === "resume") {
    router.push("/resume/history");
  } else if (command === "interview") {
    router.push("/interview/history");
  }
};

// 处理头像下拉菜单命令
const handleCommand = (command) => {
  if (command === "profile") {
    router.push("/dashboard");
  } else if (command === "logout") {
    userStore.doLogout();
    ElMessage.success("已退出登录");
    router.push("/");
  }
};
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #ff8c42;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-img {
  height: 36px;
  border-radius: 6px;
  object-fit: contain;
}

.logo-text {
  font-size: 16px;
  font-weight: 500;
  color: #333333;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  padding: 8px 16px;
  font-size: 14px;
  color: #666666;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link:hover {
  color: #ff8c42;
}

.nav-link.active {
  color: #ff8c42;
  border-bottom-color: #ff8c42;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-avatar-wrapper {
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  transition: opacity 0.2s;
}

.user-avatar-wrapper:hover {
  opacity: 0.8;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.login-link {
  font-size: 14px;
  color: #ff8c42;
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}

/* 历史记录下拉菜单 */
.history-dropdown-wrapper {
  position: relative;
}

.history-trigger {
  user-select: none;
}

.dropdown-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
}

.history-dropdown-wrapper:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.history-dropdown-menu {
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #f0f0f0;
  padding: 6px 0;
  min-width: 180px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 14px;
  color: #555555;
  transition: all 0.2s;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #fff8f3;
  color: #ff8c42;
}

.dropdown-item.active {
  background-color: #fff8f3;
  color: #ff8c42;
  font-weight: 500;
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 用户下拉菜单样式 */
.user-dropdown-menu {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
  padding: 4px 0;
}

.user-dropdown-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  color: #333333;
  transition: background-color 0.2s;
}

.user-dropdown-menu .dropdown-item:hover {
  background-color: #fff8f3;
  color: #ff8c42;
}

.logout-item {
  color: #666666;
  border-top: 1px solid #f0f0f0;
  margin-top: 4px;
  padding-top: 10px;
}

.logout-item:hover {
  background-color: #fff8f3;
  color: #ff8c42;
}
</style>
