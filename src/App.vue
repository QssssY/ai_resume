<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useUserStore } from '@/stores/user'
import { getToken, removeToken } from '@/utils/auth'

const route = useRoute()
const userStore = useUserStore()

const layoutComponent = computed(() => {
  if (route.meta.useLayout) {
    return MainLayout
  }

  return 'div'
})

onMounted(async () => {
  const token = localStorage.getItem('token') || getToken()

  if (!token) return

  try {
    await userStore.fetchUserInfo()
  } catch (err) {
    localStorage.removeItem('token')
    removeToken()
    userStore.clearUserInfo()
  }
})
</script>

<style>
</style>
