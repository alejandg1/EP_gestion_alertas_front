import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://10.10.80.70:3090';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token JWT en todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('segura_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar 401 (token expirado o invalido)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('segura_jwt_token');
      localStorage.removeItem('segura_usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(correo, password) {
    const res = await api.post('/auth/login', { correo, password });
    if (res.data && res.data.token) {
      localStorage.setItem('segura_jwt_token', res.data.token);
      localStorage.setItem('segura_usuario', JSON.stringify(res.data.usuario || { correo }));
    }
    return res.data;
  },

  async registro(correo, password, nombre) {
    const res = await api.post('/auth/registro', { correo, password, nombre });
    return res.data;
  },

  async getPerfil() {
    const res = await api.get('/auth/perfil');
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout error', e);
    } finally {
      localStorage.removeItem('segura_jwt_token');
      localStorage.removeItem('segura_usuario');
    }
  },

  getUsuarioSesion() {
    const raw = localStorage.getItem('segura_usuario');
    if (!raw) return null;
    try {
      const u = JSON.parse(raw);
      if (u.id && !u._id) u._id = u.id;
      if (u._id && !u.id) u.id = u._id;
      return u;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('segura_jwt_token') || '';
  },

  isAuthenticated() {
    return !!localStorage.getItem('segura_jwt_token');
  }
};

export const reportesService = {
  async getAll() {
    const res = await api.get('/reportes');
    return res.data?.reportes || (Array.isArray(res.data) ? res.data : []);
  },

  async getById(id) {
    const res = await api.get(`/reportes/${id}`);
    return res.data?.reporte || res.data;
  },

  async create(reporteData) {
    const res = await api.post('/reportes', reporteData);
    return res.data?.reporte || res.data;
  },

  async addNovedad(reporteId, novedadData) {
    const res = await api.post(`/reportes/${reporteId}/novedades`, novedadData);
    return res.data;
  },

  async uploadFotos(formData) {
    const res = await api.post('/reportes/upload-foto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  async exportarExcel(reporteId) {
    const res = await api.post(`/reportes/${reporteId}/exportar-excel`);
    return res.data;
  }
};

export default api;
