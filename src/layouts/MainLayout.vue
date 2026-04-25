<template>
  <div class="main-layout">
    <AppHeader />
    <main class="layout-main">
      <section class="layout-content">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup>
import AppHeader from "@/components/AppHeader.vue";
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  background-color: var(--bg-page, #fff8f3);
}

.layout-main {
  padding-top: 60px;
  min-height: 100vh;
}

.layout-content {
  padding: 24px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .layout-content {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .layout-content {
    padding: 12px;
  }
}
</style>
