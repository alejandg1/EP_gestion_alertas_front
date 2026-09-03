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

  async registro({ correo, password, nombre, rol }) {
    const res = await api.post('/auth/registro', { correo, password, nombre, rol });
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

  async chpass({ currentPassword, newPassword, usuarioId }) {
    const res = await api.post('/auth/chpass', { currentPassword, newPassword, usuarioId });
    return res.data;
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
  async getAll(params = null) {
    if (!params) {
      const res = await api.get('/reportes');
      return res.data?.reportes || (Array.isArray(res.data) ? res.data : []);
    }
    const res = await api.get('/reportes', { params });
    return res.data;
  },

  async getById(id) {
    const res = await api.get(`/reportes/${id}`);
    return res.data?.reporte || res.data;
  },

  async create(reporteData) {
    const res = await api.post('/reportes', reporteData);
    return res.data?.reporte || res.data;
  },

  async actualizarParametros(id, parametros) {
    const res = await api.put(`/reportes/${id}/parametros`, parametros);
    return res.data;
  },

  async addNovedad(reporteId, novedadData) {
    const res = await api.post(`/reportes/${reporteId}/novedades`, novedadData);
    return res.data;
  },

  async updateNovedad(reporteId, novedadId, novedadData) {
    const res = await api.put(`/reportes/${reporteId}/novedades/${novedadId}`, novedadData);
    return res.data;
  },

  async deleteNovedad(reporteId, novedadId) {
    const res = await api.delete(`/reportes/${reporteId}/novedades/${novedadId}`);
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

  async deleteReporte(id) {
    const res = await api.delete(`/reportes/${id}`);
    return res.data;
  },

  async delete(id) {
    const res = await api.delete(`/reportes/${id}`);
    return res.data;
  },

  async getMetricasTiempos(id) {
    const res = await api.get(`/reportes/${id}/metricas-tiempos`);
    return res.data;
  }
};

export const novedadesService = {
  async getAll(params = null) {
    const res = await api.get('/novedades', { params });
    return res.data;
  },

  async getMetricasTiempos(params = {}) {
    const res = await api.get('/novedades/metricas-tiempos', { params });
    return res.data;
  },

  async getById(id) {
    const res = await api.get(`/novedades/${id}`);
    return res.data?.novedad || res.data;
  },

  async create(formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    const res = await api.post('/novedades', formDataOrJson, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data?.novedad || res.data;
  },

  async update(id, formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    const res = await api.put(`/novedades/${id}`, formDataOrJson, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data?.novedad || res.data;
  },

  async delete(id) {
    const res = await api.delete(`/novedades/${id}`);
    return res.data;
  }
};

export const usuariosService = {
  async listar(params = {}) {
    const res = await api.get('/usuarios', { params });
    return res.data;
  },

  async obtenerPorId(id) {
    const res = await api.get(`/usuarios/${id}`);
    return res.data;
  },

  async crear(datos) {
    const res = await api.post('/usuarios', datos);
    return res.data;
  },

  async actualizar(id, datos) {
    const res = await api.put(`/usuarios/${id}`, datos);
    return res.data;
  },

  async cambiarPassword(id, { newPassword, requiere_cambio_pw }) {
    const res = await api.patch(`/usuarios/${id}/password`, { newPassword, requiere_cambio_pw });
    return res.data;
  },

  async eliminar(id) {
    const res = await api.delete(`/usuarios/${id}`);
    return res.data;
  },

  async restaurar(id) {
    const res = await api.post(`/usuarios/${id}/restaurar`);
    return res.data;
  }
};

export default api;

