<template>
  <div class="login-page" :style="pageBackgroundStyle">
    <div class="login-card">
      <div class="login-brand">
        <img src="/icons/icon_blanco.png" alt="Segura EP" class="login-logo" />
        <h2>Sistema Integral de Reporte de Emergencias</h2>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="errorMsg" class="alert alert-error">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{{ errorMsg }}</span>
        </div>

        <div class="form-group">
          <label for="login_email">Correo Institucional</label>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-envelope input-icon"></i>
            <input
              id="login_email"
              type="email"
              v-model="correo"
              placeholder="operador@seguraep.gob.ec"
              required
              autocomplete="username"
              autofocus
            />
          </div>
        </div>

        <div class="form-group">
          <label for="login_pass">Contraseña</label>
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-lock input-icon"></i>
            <input
              id="login_pass"
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="Ingrese su contraseña"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="btn-toggle-pass"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
              tabindex="-1"
            >
              <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-right-to-bracket"></i>
          {{ loading ? 'Iniciando sesión...' : 'Ingresar a Sala Situacional' }}
        </button>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/api.js';

const router = useRouter();
const correo = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref('');

// Ruta directa garantizada desde la carpeta public
const bgImageUrl = '/icons/Gemini_Generated_Image_uhi1ycuhi1ycuhi1.jpg';

const pageBackgroundStyle = computed(() => ({
  backgroundImage: `linear-gradient(rgba(15, 39, 68, 0.4), rgba(15, 39, 68, 0.75)), url("${bgImageUrl}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center center',
  backgroundSize: 'cover'
}));

async function handleLogin() {
  if (!correo.value || !password.value) return;
  
  loading.value = true;
  errorMsg.value = '';

  try {
    await authService.login(correo.value.trim(), password.value);
    router.push('/');
  } catch (err) {
    const msg = err.response?.data?.error || err.response?.data?.mensaje || err.message || 'Credenciales inválidas o error de conexión';
    errorMsg.value = msg;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  backdrop-filter: blur(2px);
}

.login-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 430px;
  box-shadow: 0 25px 35px -5px rgba(0, 0, 0, 0.35), 0 12px 16px -6px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
  position: relative;
  z-index: 10;
  animation: fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-brand {
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  padding: 28px 24px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 3px solid var(--accent-blue);
}

.login-logo {
  height: 52px;
  width: auto;
  object-fit: contain;
  margin-bottom: 10px;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.3));
}

.institutional-badge {
  display: inline-block;
  background: rgba(2, 132, 199, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #e0f2fe;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.login-brand h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.login-brand p {
  margin: 5px 0 0 0;
  font-size: 0.8rem;
  color: #cbd5e1;
}

.login-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.73rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
  margin-top: 0;
}

.input-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: var(--text-faint);
  font-size: 0.95rem;
  pointer-events: none;
}

.input-icon-wrapper input {
  width: 100%;
  padding: 10px 38px 10px 36px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  background: #ffffff;
  color: var(--text-main);
  transition: all 0.15s ease;
}

.input-icon-wrapper input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.18);
  outline: none;
}

.btn-toggle-pass {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-faint);
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}

.btn-toggle-pass:hover {
  color: var(--primary-navy);
}

.btn-block {
  width: 100%;
  padding: 11px;
  font-size: 0.92rem;
  font-weight: 700;
  margin-top: 8px;
  gap: 8px;
  box-shadow: var(--shadow-sm);
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  color: var(--text-faint);
  font-size: 0.75rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.alert {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.35;
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: var(--accent-red);
}
</style>