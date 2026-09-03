import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/api.js';

export function useAuth() {
  const router = useRouter();
  const usuario = ref(authService.getUsuarioSesion());

  const estaAutenticado = computed(() => !!usuario.value);
  const esAdmin = computed(() => usuario.value?.rol === 'admin');

  function refrescarSesion() {
    usuario.value = authService.getUsuarioSesion();
  }

  async function cerrarSesion(confirmar = true) {
    if (!confirmar || confirm('¿Desea cerrar la sesión del operador actual?')) {
      await authService.logout();
      usuario.value = null;
      if (router) {
        router.push('/login');
      }
    }
  }

  return {
    usuario,
    estaAutenticado,
    esAdmin,
    refrescarSesion,
    cerrarSesion
  };
}
