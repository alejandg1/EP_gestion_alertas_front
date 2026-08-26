<template>
  <header class="app-header">
    <div class="header-main">
      <div class="brand-section">
        <router-link to="/" class="brand-title">
          <img src="/icons/icon_blanco.png" alt="Segura EP" class="header-logo" />
          <div class="brand-text">
            <h2>Sala Situacional - Sistema de gestión de alertas</h2>
          </div>
        </router-link>
      </div>

      <div class="user-controls">
        <template v-if="usuario">
          <span class="user-badge" :title="usuario.correo">
            {{ usuario.nombre || usuario.correo }}
          </span>

          <button type="button" class="btn btn-sm btn-outline-white" @click="$emit('open-register')">
            Registrar Operador
          </button>

          <button type="button" class="btn btn-sm btn-danger" @click="cerrarSesion">
            Cerrar Sesion
          </button>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-sm btn-primary">
            Iniciar Sesion
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/api.js';

const emit = defineEmits(['open-register']);
const router = useRouter();

const usuario = computed(() => authService.getUsuarioSesion());

async function cerrarSesion() {
  if (confirm('Desea cerrar la sesion del operador actual?')) {
    await authService.logout();
    router.push('/login');
  }
}
</script>

<style scoped>
.app-header {
  background: #0a3d62;
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(10, 61, 98, 0.15);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.brand-title {
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo {
  height: 44px;
  width: auto;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title h2 {
  font-size: 1.05rem;
  margin: 0;
  font-weight: 700;
  color: #ffffff;
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.user-badge {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.btn-outline-white {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: #ffffff;
}

.btn-outline-white:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
