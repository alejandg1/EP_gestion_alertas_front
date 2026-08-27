<template>
  <div class="login-page" :style="pageBackgroundStyle">
    <div class="login-card">
      <div class="login-brand">
        <img src="/icons/icon_blanco.png" alt="Segura EP" class="login-logo" />
        <h2>Sistema Integral de Reporte de Emergencias</h2>
        <p>Sala Situacional - Segura EP</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="errorMsg" class="alert alert-error">
          {{ errorMsg }}
        </div>

        <div class="form-group">
          <label for="login_email">Correo Institucional:</label>
          <input
            id="login_email"
            type="email"
            v-model="correo"
            placeholder="operador@seguraep.gob.ec"
            required
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="login_pass">Contraseña:</label>
          <input
            id="login_pass"
            type="password"
            v-model="password"
            placeholder="Ingrese su contraseña"
            required
            autocomplete="current-password"
          />
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
const loading = ref(false);
const errorMsg = ref('');

// Ruta directa garantizada desde la carpeta public
const bgImageUrl = '/icons/Gemini_Generated_Image_uhi1ycuhi1ycuhi1.jpg';

const pageBackgroundStyle = computed(() => ({
  backgroundImage: `linear-gradient(rgba(10, 61, 98, 0.2), rgba(10, 61, 98, 0.45)), url("${bgImageUrl}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center center',
  backgroundSize: 'cover'
}));

async function handleLogin() {
  loading.value = true;
  errorMsg.value = '';

  try {
    await authService.login(correo.value.trim(), password.value);
    router.push('/');
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Credenciales invalidas';
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
  width: 100%;
  height: 100vh;
  z-index: 999;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  overflow: hidden;
  position: relative;
  z-index: 10;
}

.login-brand {
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  padding: 28px 24px 22px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-logo {
  height: 50px;
  width: auto;
  object-fit: contain;
  margin-bottom: 12px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.institutional-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.login-brand h2 {
  margin: 0;
  font-size: 1.18rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.login-brand p {
  margin: 4px 0 0 0;
  font-size: 0.82rem;
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
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.form-group input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
}

.form-group input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  outline: none;
}

.btn-block {
  width: 100%;
  padding: 11px;
  font-size: 0.9rem;
  font-weight: 700;
  margin-top: 6px;
}

.alert {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 14px;
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: var(--accent-red);
}
</style>