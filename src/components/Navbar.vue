<template>
  <header class="app-header">
    <div class="header-main">
      <div class="brand-section">
        <router-link to="/" class="brand-title">
          <img src="/icons/icon_blanco.png" alt="Segura EP" class="header-logo" />
          <div class="brand-text">
            <h2>Sistema Integral de Reporte de Emergencias</h2>
          </div>
        </router-link>
      </div>

      <div class="user-controls">
        <template v-if="usuario">
          <span class="user-badge" :title="usuario.correo">
            <i class="fa-solid fa-user-circle"></i> {{ usuario.nombre || usuario.correo }}
          </span>

          <router-link v-if="usuario.rol === 'admin'" to="/usuarios" class="btn btn-sm btn-outline-white" title="Administración de cuentas y roles">
            <i class="fa-solid fa-users-gear"></i> Gestión de Usuarios
          </router-link>

          <button type="button" class="btn btn-sm btn-danger" @click="cerrarSesion">
            <i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
          </button>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-sm btn-primary">
            <i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuth } from '../composables/useAuth.js';

const emit = defineEmits(['open-register']);
const { usuario, cerrarSesion } = useAuth();
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  padding: 12px 18px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.brand-title {
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-logo {
  height: 42px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title h2 {
  font-size: 1.08rem;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #ffffff;
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.user-badge {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Switch de Confort */
.btn-outline-white {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

.btn-outline-white:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.6);
}
</style>
