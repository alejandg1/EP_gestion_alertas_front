<template>
  <div class="app-layout">
    <router-view />
    <ToastContainer />
    <div class="institutional-credit">
      <img src="/icons/escudo.png" alt="Escudo Guayaquil" class="credit-logo" />
      <span>Elaborado y gestionado por: <strong>Sala Situacional de Segura EP.</strong></span>
    </div>
  </div>
</template>

<script setup>
import ToastContainer from './components/ToastContainer.vue';
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  position: relative;
  padding-bottom: 50px;
}

.institutional-credit {
  position: fixed;
  right: 14px;
  bottom: 12px;
  z-index: 1000;
  max-width: 340px;
  padding: 6px 12px;
  border: 1px solid rgba(10, 61, 98, 0.22);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  color: #0a3d62;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  backdrop-filter: blur(4px);
}

.credit-logo {
  height: 20px;
  width: auto;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .institutional-credit {
    right: 8px;
    bottom: 8px;
    max-width: calc(100% - 16px);
  }
}
</style>
