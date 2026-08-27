<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="cerrar" @keydown.esc="cerrar">
    <div class="modal-card">
      <!-- CABECERA INSTITUCIONAL -->
      <div class="modal-header">
        <div class="header-brand-info">
          <img src="/icons/icon_blanco.png" alt="Segura EP" class="modal-logo" />
        </div>
        <button type="button" class="btn-close" @click="cerrar" title="Cerrar modal">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form @submit.prevent="ejecutarRegistro" class="modal-body">
        <div class="title-container">
          <h2 class="modal-subtitle">
            REGISTRO DE USUARIO
          </h2>
        </div>

        <div v-if="errorMsg" class="alert alert-error">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{{ errorMsg }}</span>
        </div>
        <div v-if="successMsg" class="alert alert-success">
          <i class="fa-solid fa-circle-check"></i>
          <span>{{ successMsg }}</span>
        </div>

        <!-- Nombre Completo -->
        <div class="form-group">
          <label for="reg_nombre">Nombre y Apellido</label>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-user input-icon"></i>
            <input
              id="reg_nombre"
              type="text"
              v-model="form.nombre"
              placeholder="Ej: Pedro Morales"
              required
              autofocus
            />
          </div>
        </div>

        <!-- Correo Institucional -->
        <div class="form-group">
          <label for="reg_correo">Correo Institucional</label>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-envelope input-icon"></i>
            <input
              id="reg_correo"
              type="email"
              v-model="form.correo"
              placeholder="operador@seguraep.gob.ec"
              required
            />
          </div>
        </div>

        <!-- Contraseña -->
        <div class="form-group">
          <label for="reg_password">Contraseña</label>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-lock input-icon"></i>
            <input
              id="reg_password"
              :type="showPassword ? 'text' : 'password'"
              v-model="form.password"
              placeholder="Mínimo 6 caracteres"
              required
              minlength="6"
            />
            <button
              type="button"
              class="btn-toggle-pass"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Ocultar' : 'Mostrar'"
              tabindex="-1"
            >
              <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
            </button>
          </div>
        </div>

        <!-- Selector de Rol Visual -->
        <div class="form-group">
          <label>Rol asignado en plataforma</label>
          <div class="role-selector-grid">
            <div
              class="role-card"
              :class="{ active: form.rol === 'operador' }"
              @click="form.rol = 'operador'"
            >
              <div class="role-icon">
                <i class="fa-solid fa-headset"></i>
              </div>
              <div class="role-info">
                <strong>Operador</strong>
                <span>Gestión y registro de novedades</span>
              </div>
              <div class="role-radio">
                <i :class="form.rol === 'operador' ? 'fa-solid fa-circle-dot' : 'fa-regular fa-circle'"></i>
              </div>
            </div>

            <div
              class="role-card"
              :class="{ active: form.rol === 'admin' }"
              @click="form.rol = 'admin'"
            >
              <div class="role-icon admin">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div class="role-info">
                <strong>Administrador</strong>
                <span>Control total y gestión de usuarios</span>
              </div>
              <div class="role-radio">
                <i :class="form.rol === 'admin' ? 'fa-solid fa-circle-dot' : 'fa-regular fa-circle'"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="cerrar" :disabled="loading">
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

const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function resetForm() {
  form.nombre = '';
  form.correo = '';
  form.password = '';
  form.rol = 'operador';
  showPassword.value = false;
  errorMsg.value = '';
  successMsg.value = '';
}

function cerrar() {
  resetForm();
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

    successMsg.value = `Usuario "${form.nombre}" (${form.rol}) registrado con éxito.`;
    resetForm();
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
  background: rgba(15, 39, 68, 0.65);
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
  max-width: 490px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  overflow: hidden;
  animation: modalAppear 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: translateY(-14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 14px 20px;
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid var(--accent-blue);
}

.header-brand-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
}

.header-badge {
  background: rgba(2, 132, 199, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #e0f2fe;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.btn-close {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.85;
  transition: all 0.15s ease;
}

.btn-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}

.modal-body {
  padding: 20px 24px;
}

.title-container {
  margin-bottom: 16px;
}

.modal-subtitle {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--primary-navy);
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-subtitle i {
  color: var(--accent-blue);
}

.modal-description {
  margin: 4px 0 0 0;
  font-size: 0.8rem;
  color: var(--text-faint);
}

.form-group {
  margin-bottom: 14px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 5px;
  margin-top: 0;
}

.input-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  color: var(--text-faint);
  font-size: 0.85rem;
  pointer-events: none;
}

.input-icon-wrapper input {
  width: 100%;
  padding: 8px 10px 8px 32px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.86rem;
  background: #ffffff;
  color: var(--text-main);
  transition: all 0.15s ease;
}

.input-icon-wrapper input.input-invalid {
  border-color: var(--accent-red);
  background-color: #fef2f2;
}

.input-icon-wrapper input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  outline: none;
}

.btn-toggle-pass {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--text-faint);
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.btn-toggle-pass:hover {
  color: var(--primary-navy);
}

.field-error-text {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--accent-red);
  margin-top: -8px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Selector de Roles tipo Tarjeta */
.role-selector-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.role-card {
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.15s ease;
  background: #f8fafc;
  user-select: none;
}

.role-card:hover {
  border-color: var(--accent-blue);
  background: #f0f9ff;
}

.role-card.active {
  border-color: var(--accent-blue);
  background: #e0f2fe;
  box-shadow: 0 0 0 1px var(--accent-blue);
}

.role-icon {
  font-size: 1.1rem;
  color: var(--accent-blue);
  width: 28px;
  height: 28px;
  background: #ffffff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.role-icon.admin {
  color: #0f2744;
}

.role-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.role-info strong {
  font-size: 0.8rem;
  color: var(--primary-navy);
}

.role-info span {
  font-size: 0.68rem;
  color: var(--text-faint);
  line-height: 1.2;
}

.role-radio {
  font-size: 0.85rem;
  color: var(--accent-blue);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.alert {
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
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