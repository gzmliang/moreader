<template>
  <Reader />
</template>

<script setup lang="ts">
import Reader from './components/Reader.vue'
</script>

<style>
/* Tailwind CSS base styles */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* MoRead - Immersive Reader styles */
body {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  background-color: #F7F7F7;
  color: #1A1A1A;
}
</style>
