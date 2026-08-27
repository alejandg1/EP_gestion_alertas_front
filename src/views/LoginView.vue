<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <img src="/icons/icon_blanco.png" alt="Segura EP" class="login-logo" />
        <h2>Sala Situacional</h2>
        <p>Sistema de gestion de alertas</p>
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/api.js';

const router = useRouter();
const correo = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

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
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: #ffffff;
  border-radius: 10px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  border: 1px solid #cbd5e1;
  overflow: hidden;
}

.login-brand {
  background: #0a3d62;
  color: #ffffff;
  padding: 24px 20px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-logo {
  height: 54px;
  width: auto;
  object-fit: contain;
  margin-bottom: 10px;
}

.institutional-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.login-brand h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffffff;
}

.login-brand p {
  margin: 4px 0 0 0;
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
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-group input:focus {
  border-color: #0984e3;
  outline: none;
}

.btn-block {
  width: 100%;
  padding: 11px;
  font-size: 0.92rem;
  margin-top: 6px;
}

.alert {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 14px;
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}
</style>
