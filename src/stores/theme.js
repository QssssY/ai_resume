import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 用户选择的主题：'light' / 'dark' / 'system'
  const theme = ref(localStorage.getItem('theme') || 'system')

  // 系统是否处于暗色模式
  const systemDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

  // 最终解析的主题：始终为 'light' 或 'dark'
  const resolvedTheme = computed(() => {
    if (theme.value === 'system') {
      return systemDark.value ? 'dark' : 'light'
    }
    return theme.value
  })

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemThemeChange = (e) => {
    systemDark.value = e.matches
  }
  mediaQuery.addEventListener('change', onSystemThemeChange)

  // 将主题应用到 DOM
  const applyTheme = (resolved) => {
    document.documentElement.setAttribute('data-theme', resolved)
  }

  // 设置主题
  const setTheme = (value) => {
    theme.value = value
    localStorage.setItem('theme', value)
    applyTheme(resolvedTheme.value)
  }

  // 三态切换：system → dark → light → system
  const toggleTheme = () => {
    if (theme.value === 'system') {
      setTheme('dark')
    } else if (theme.value === 'dark') {
      setTheme('light')
    } else {
      setTheme('system')
    }
  }

  // 初始化：应用当前主题
  applyTheme(resolvedTheme.value)

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  }
})
