<script setup>
import MenuBar from '@trevorism/ui-header-bar'
</script>

<template>
  <menu-bar></menu-bar>
  <main class="app-main">
    <router-view></router-view>
  </main>
</template>

<style scoped>
.app-main {
  max-width: 80rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}
</style>
