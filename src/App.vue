<template>
  <div class="app-layout">
    <router-view />
    <ToastContainer />
    <footer class="institutional-credit">
      <img src="/icons/escudo.png" alt="Escudo Guayaquil" class="credit-logo" />
      <span>Gestionado por la <strong>Sala Situacional de Segura EP</strong> — Sistema Integral de Reporte de Emergencias</span>
    </footer>
  </div>
</template>

<script setup>
import ToastContainer from './components/ToastContainer.vue';
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.institutional-credit {
  margin-top: auto;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 0.76rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.institutional-credit strong {
  color: var(--primary-navy);
  font-weight: 700;
}

.credit-logo {
  height: 20px;
  width: auto;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .institutional-credit {
    font-size: 0.72rem;
    padding: 12px 14px;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
