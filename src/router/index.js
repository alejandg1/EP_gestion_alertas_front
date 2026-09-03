import { createRouter, createWebHistory } from 'vue-router';
import { authService } from '../services/api.js';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import ReporteView from '../views/ReporteView.vue';
import UsuariosView from '../views/UsuariosView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: UsuariosView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/reportes/nuevo',
    name: 'ReporteNuevo',
    component: ReporteView,
    meta: { requiresAuth: true }
  },
  {
    path: '/reportes/:id',
    name: 'ReporteDetalle',
    component: ReporteView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuth = authService.isAuthenticated();
  const user = authService.getUsuarioSesion();

  if (to.meta.requiresAuth && !isAuth) {
    next('/login');
  } else if (to.meta.guestOnly && isAuth) {
    next('/');
  } else if (to.meta.requiresAdmin && user?.rol !== 'admin') {
    next('/');
  } else {
    next();
  }
});

export default router;
