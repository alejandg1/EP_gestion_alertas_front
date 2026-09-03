<template>
  <div class="top-nav-bar">
    <div class="nav-left">
      <router-link to="/reportes" class="btn btn-secondary btn-sm">
        <i class="fa-solid fa-arrow-left"></i> Volver a Reportes
      </router-link>
      <img src="/icons/icon_blanco.png" alt="Segura EP" class="report-nav-logo" />
      <span class="report-current-tag">
        <b>RDS:</b> {{ numeroRds || 'Cargando...' }}
      </span>
    </div>

    <div class="nav-right">
      <!-- Indicador de Colaboradores Conectados en Tiempo Real -->
      <div v-if="colaboradores && colaboradores.length > 0" class="collab-presence-bar">
        <span class="collab-presence-label">
          <span class="live-dot pulse"></span>
          <i class="fa-solid fa-users"></i> Colaborando:
        </span>
        <div class="collab-chips">
          <span
            v-for="c in colaboradores"
            :key="c.usuarioId || c.correo"
            class="collab-chip"
            :title="c.correo"
          >
            {{ c.nombre || c.correo }}
          </span>
        </div>
      </div>

      <button
        v-if="puedeEliminar"
        type="button"
        class="btn btn-danger btn-m btn-del-report-nav"
        @click="$emit('eliminar')"
        title="Eliminar este reporte"
      >
        <i class="fa-solid fa-trash-can"></i> Eliminar Reporte
      </button>
      <span v-if="usuario" class="user-pill">
        <i class="fa-solid fa-user-shield"></i>{{ usuario.nombre || usuario.correo }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  numeroRds: {
    type: String,
    default: ''
  },
  colaboradores: {
    type: Array,
    default: () => []
  },
  puedeEliminar: {
    type: Boolean,
    default: false
  },
  usuario: {
    type: Object,
    default: null
  }
});

defineEmits(['eliminar']);
</script>

<style scoped>
.top-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.report-nav-logo {
  height: 34px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.report-current-tag {
  font-size: 0.82rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}

.user-pill {
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.collab-presence-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 20px;
}

.collab-presence-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  display: inline-block;
}

.live-dot.pulse {
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.collab-chips {
  display: flex;
  gap: 6px;
}

.collab-chip {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #ffffff;
}

.btn-del-report-nav {
  margin: 0;
}
</style>
