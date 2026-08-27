<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="cerrar">
    <div class="modal-card">
      <!-- BARRA SUPERIOR (RECUADRO ROJO): LOGO E ÍCONO DE CERRAR -->
      <div class="modal-header">
        <img src="/icons/icon_blanco.png" alt="Segura EP" class="modal-logo" />
        <button type="button" class="btn-close" @click="cerrar" title="Cerrar modal">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form @submit.prevent="ejecutarRegistro" class="modal-body">
        <!-- TÍTULO EN CUERPO DEL MODAL (RECUADRO VERDE) -->
        <h2 class="modal-subtitle">NUEVO OPERADOR</h2>

        <div v-if="errorMsg" class="alert alert-error">
          {{ errorMsg }}
        </div>
        <div v-if="successMsg" class="alert alert-success">
          {{ successMsg }}
        </div>

        <div class="form-group">
          <label for="reg_nombre">Nombre Completo:</label>
          <input
            id="reg_nombre"
            type="text"
            v-model="form.nombre"
            placeholder="Ej: Operador Sala 1"
            required
          />
        </div>

        <div class="form-group">
          <label for="reg_correo">Correo Institucional:</label>
          <input
            id="reg_correo"
            type="email"
            v-model="form.correo"
            placeholder="operador@seguraep.gob.ec"
            required
          />
        </div>

        <div class="form-group">
          <label for="reg_password">Contraseña:</label>
          <input
            id="reg_password"
            type="password"
            v-model="form.password"
            placeholder="Minimo 6 caracteres"
            required
            minlength="6"
          />
        </div>

        <div class="form-group">
          <label for="reg_rol">Rol de Usuario:</label>
          <select id="reg_rol" v-model="form.rol" class="select-rol">
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="cerrar">
            <i class="fa-solid fa-ban"></i> Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-user-check"></i>
            {{ loading ? 'Registrando...' : 'Registrar Usuario' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { authService } from '../services/api.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'registered']);

const form = reactive({
  nombre: '',
  correo: '',
  password: '',
  rol: 'operador'
});

const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function cerrar() {
  errorMsg.value = '';
  successMsg.value = '';
  emit('update:modelValue', false);
}

async function ejecutarRegistro() {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const res = await authService.registro({
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      password: form.password,
      rol: form.rol
    });

    successMsg.value = `Usuario (${form.rol}) registrado con éxito.`;
    form.nombre = '';
    form.correo = '';
    form.password = '';
    form.rol = 'operador';
    emit('registered', res);

    setTimeout(() => {
      cerrar();
    }, 1200);
  } catch (err) {
    const msg = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error al registrar usuario';
    errorMsg.value = msg;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 39, 68, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.modal-header {
  padding: 14px 20px;
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-logo {
  height: 28px;
  width: auto;
  object-fit: contain;
}

.btn-close {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.15s ease;
}

.btn-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 22px 24px;
}

.modal-subtitle {
  margin: 0 0 16px 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--primary-navy);
  letter-spacing: -0.01em;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  background: #ffffff;
  color: var(--text-main);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.alert {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: var(--accent-red);
}

.alert-success {
  background: #dcfce7;
  border: 1px solid #86efac;
  color: #166534;
}
</style>