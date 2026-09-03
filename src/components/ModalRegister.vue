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

      <!-- VISTA DE ÉXITO TRAS REGISTRO -->
      <div v-if="isSuccess" class="success-state-container">
        <div class="success-icon-wrapper">
          <div class="success-circle-outer"></div>
          <div class="success-circle-inner">
            <i class="fa-solid fa-check"></i>
          </div>
        </div>

        <h3 class="success-title">¡Registro Completado con Éxito!</h3>
        <p class="success-subtitle">El nuevo usuario ha sido dado de alta correctamente en la plataforma.</p>

        <!-- Tarjeta de confirmación del operador registrado -->
        <div class="registered-user-card">
          <div class="user-card-avatar" :class="{ 'admin-avatar': lastRegisteredUser.rol === 'admin' }">
            <i :class="lastRegisteredUser.rol === 'admin' ? 'fa-solid fa-shield-halved' : 'fa-solid fa-user-check'"></i>
          </div>
          <div class="user-card-details">
            <span class="user-card-name">{{ lastRegisteredUser.nombre }}</span>
            <span class="user-card-email"><i class="fa-regular fa-envelope"></i> {{ lastRegisteredUser.correo }}</span>
            <div class="user-card-badge-row">
              <span class="role-pill" :class="lastRegisteredUser.rol">
                <i :class="lastRegisteredUser.rol === 'admin' ? 'fa-solid fa-shield' : 'fa-solid fa-headset'"></i>
                {{ lastRegisteredUser.rol === 'admin' ? 'Administrador' : 'Operador de Sala' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botones de Acción Posterior -->
        <div class="success-actions">
          <button type="button" class="btn btn-outline" @click="registrarOtro">
            <i class="fa-solid fa-user-plus"></i> Registrar otro operador
          </button>
          <button type="button" class="btn btn-primary" @click="cerrar">
            <i class="fa-solid fa-check"></i> Finalizar y Salir
          </button>
        </div>
      </div>

      <!-- FORMULARIO DE REGISTRO -->
      <form v-else @submit.prevent="ejecutarRegistro" class="modal-body">
        <div class="title-container">
          <h2 class="modal-subtitle">
            REGISTRO DE USUARIO
          </h2>
        </div>

        <!-- Alerta de Error -->
        <div v-if="errorMsg" class="alert alert-error">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{{ errorMsg }}</span>
        </div>

        <!-- Nombre Completo -->
        <div class="form-group">
          <label for="reg_nombre">
            Nombre y Apellido <span class="required-mark">*</span>
          </label>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-user input-icon"></i>
            <input
              id="reg_nombre"
              type="text"
              v-model="form.nombre"
              placeholder="Ej: Pedro Morales"
              required
              autofocus
              :disabled="loading"
            />
            <span v-if="form.nombre.trim().length >= 3" class="input-valid-icon" title="Válido">
              <i class="fa-solid fa-circle-check"></i>
            </span>
          </div>
        </div>

        <!-- Correo Institucional -->
        <div class="form-group">
          <label for="reg_correo">
            Correo Institucional <span class="required-mark">*</span>
          </label>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-envelope input-icon"></i>
            <input
              id="reg_correo"
              type="email"
              v-model="form.correo"
              placeholder="operador@seguraep.gob.ec"
              required
              :disabled="loading"
            />
            <span v-if="esCorreoValido" class="input-valid-icon" title="Correo válido">
              <i class="fa-solid fa-circle-check"></i>
            </span>
          </div>
        </div>

        <!-- Contraseña -->
        <div class="form-group">
          <div class="label-row">
            <label for="reg_password">
              Contraseña <span class="required-mark">*</span>
            </label>
            <span class="pass-hint" :class="{ 'pass-hint-valid': form.password.length >= 6 }">
              <i :class="form.password.length >= 6 ? 'fa-solid fa-check' : 'fa-solid fa-circle-info'"></i>
              Mínimo 6 caracteres
            </span>
          </div>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-lock input-icon"></i>
            <input
              id="reg_password"
              :type="showPassword ? 'text' : 'password'"
              v-model="form.password"
              placeholder="Ingrese contraseña segura"
              required
              minlength="6"
              :disabled="loading"
            />
            <button
              type="button"
              class="btn-toggle-pass"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Ocultar' : 'Mostrar'"
              tabindex="-1"
              :disabled="loading"
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
              :class="{ active: form.rol === 'operador', disabled: loading }"
              @click="!loading && (form.rol = 'operador')"
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
              :class="{ active: form.rol === 'admin', disabled: loading }"
              @click="!loading && (form.rol = 'admin')"
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
          <button type="submit" class="btn btn-primary" :disabled="loading || !formularioValido">
            <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-user-check"></i>
            {{ loading ? 'Registrando en plataforma...' : 'Registrar Operador' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { authService } from '../services/api.js';
import { toast } from '../services/toast.js';

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
const isSuccess = ref(false);
const lastRegisteredUser = ref({
  nombre: '',
  correo: '',
  rol: 'operador'
});

const esCorreoValido = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim());
});

const formularioValido = computed(() => {
  return (
    form.nombre.trim().length >= 3 &&
    esCorreoValido.value &&
    form.password.length >= 6
  );
});

function resetForm() {
  form.nombre = '';
  form.correo = '';
  form.password = '';
  form.rol = 'operador';
  showPassword.value = false;
  errorMsg.value = '';
}

function registrarOtro() {
  resetForm();
  isSuccess.value = false;
}

function cerrar() {
  resetForm();
  isSuccess.value = false;
  emit('update:modelValue', false);
}

async function ejecutarRegistro() {
  if (!formularioValido.value) return;

  loading.value = true;
  errorMsg.value = '';

  const datosAEnviar = {
    nombre: form.nombre.trim(),
    correo: form.correo.trim(),
    password: form.password,
    rol: form.rol
  };

  try {
    const res = await authService.registro(datosAEnviar);

    // Guardar detalles del usuario para la pantalla de confirmación
    lastRegisteredUser.value = {
      nombre: datosAEnviar.nombre,
      correo: datosAEnviar.correo,
      rol: datosAEnviar.rol
    };

    // Feedback visual inmediato
    isSuccess.value = true;
    toast.success(`Operador "${datosAEnviar.nombre}" (${datosAEnviar.rol}) registrado con éxito.`);
    
    emit('registered', res);
  } catch (err) {
    const msg = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error al registrar el usuario en el sistema';
    errorMsg.value = msg;
    toast.error(msg);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 39, 68, 0.7);
  backdrop-filter: blur(5px);
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
  max-width: 500px;
  box-shadow: 0 20px 30px -5px rgba(0, 0, 0, 0.35), 0 10px 15px -5px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  animation: modalAppear 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: translateY(-16px) scale(0.97);
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
  gap: 12px;
}

.modal-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
}

.header-badge {
  background: rgba(2, 132, 199, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.35);
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
  padding: 22px 24px;
}

.title-container {
  margin-bottom: 16px;
}

.modal-subtitle {
  margin: 0;
  font-size: 1.1rem;
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
  margin-bottom: 15px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
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

.label-row label {
  margin-bottom: 0;
}

.required-mark {
  color: var(--accent-red);
}

.pass-hint {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s ease;
}

.pass-hint-valid {
  color: #16a34a;
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

.input-valid-icon {
  position: absolute;
  right: 10px;
  color: #16a34a;
  font-size: 0.85rem;
  pointer-events: none;
  animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popIn {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.input-icon-wrapper input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.86rem;
  background: #ffffff;
  color: var(--text-main);
  transition: all 0.15s ease;
}

.input-icon-wrapper input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  outline: none;
}

.input-icon-wrapper input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.75;
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

.role-card:hover:not(.disabled) {
  border-color: var(--accent-blue);
  background: #f0f9ff;
}

.role-card.active {
  border-color: var(--accent-blue);
  background: #e0f2fe;
  box-shadow: 0 0 0 1px var(--accent-blue);
}

.role-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  animation: shakeAlert 0.3s ease;
}

@keyframes shakeAlert {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: var(--accent-red);
}

/* ESTADO DE ÉXITO VISUAL */
.success-state-container {
  padding: 32px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: modalAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.success-icon-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.success-circle-outer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.2);
  animation: pulseOuter 2s infinite ease-out;
}

.success-circle-inner {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #10b981;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
  animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pulseOuter {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 0.3; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

.success-title {
  margin: 0 0 6px 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--primary-navy);
}

.success-subtitle {
  margin: 0 0 20px 0;
  font-size: 0.84rem;
  color: var(--text-muted);
  max-width: 360px;
}

.registered-user-card {
  width: 100%;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  text-align: left;
}

.user-card-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e0f2fe;
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  border: 1px solid #bae6fd;
}

.user-card-avatar.admin-avatar {
  background: #0f2744;
  color: #facc15;
  border-color: #1e3a8a;
}

.user-card-details {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-card-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary-navy);
}

.user-card-email {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}

.user-card-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.role-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.role-pill.operador {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.role-pill.admin {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.status-pill-active {
  font-size: 0.68rem;
  font-weight: 700;
  color: #16a34a;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-pill-active i {
  font-size: 0.45rem;
}

.success-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.btn-outline {
  background: #ffffff;
  border: 1.5px solid var(--border-strong);
  color: var(--text-main);
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.btn-outline:hover {
  background: #f1f5f9;
  border-color: var(--primary-navy);
}
</style>