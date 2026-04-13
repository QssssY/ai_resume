<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import MainLayout from "@/layouts/MainLayout.vue";

const route = useRoute();

const layoutComponent = computed(() => {
  if (route.meta.useLayout) {
    return MainLayout;
  }
  return "div";
});
</script>

<style>
</style>
