<template>
  <div class="usuarios-page">
    <div class="container-fluid">
      <!-- CABECERA INSTITUCIONAL -->
      <header class="app-header">
        <div class="header-main">
          <div class="brand-section">
            <router-link to="/" class="brand-title">
              <img src="/icons/icon_blanco.png" alt="Segura EP" class="header-logo" />
              <div class="brand-text">
                <h2>Sistema Integral de Reporte de Emergencias</h2>
              </div>
            </router-link>
          </div>

          <div class="user-controls">
            <span class="user-badge" :title="usuarioActual?.correo">
              <i class="fa-solid fa-shield-halved"></i> {{ usuarioActual?.nombre || usuarioActual?.correo }} (Admin)
            </span>
            <router-link to="/" class="btn btn-sm btn-outline-white">
              <i class="fa-solid fa-arrow-left"></i> Volver a Sala Situacional
            </router-link>
            <button type="button" class="btn btn-sm btn-danger" @click="cerrarSesion">
              <i class="fa-solid fa-right-from-bracket"></i> Salir
            </button>
          </div>
        </div>
      </header>

      <!-- PANEL PRINCIPAL DE GESTIÓN -->
      <div class="main-panel">
        <!-- BARRA DE HERRAMIENTAS -->
        <div class="panel-toolbar">
          <div class="toolbar-left">
            <div class="search-input-wrapper">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                v-model="filtroBusqueda"
                @input="debouncedCargar"
                placeholder="Buscar por nombre o correo institucional..."
                class="search-field"
              />
              <button v-if="filtroBusqueda" class="btn-clear-search" @click="filtroBusqueda = ''; cargarUsuarios()">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <!-- Filtro de Rol -->
            <div class="filter-group">
              <label class="filter-label">Rol:</label>
              <select v-model="filtroRol" @change="cargarUsuarios(1)" class="filter-select">
                <option value="">Todos los roles</option>
                <option value="operador">Operadores</option>
                <option value="admin">Administradores</option>
              </select>
            </div>

            <!-- Filtro de Eliminados -->
            <div class="filter-checkbox-wrapper">
              <label class="custom-checkbox-label">
                <input
                  type="checkbox"
                  v-model="incluirEliminados"
                  @change="cargarUsuarios(1)"
                />
                <span>Incluir usuarios desactivados</span>
              </label>
            </div>
          </div>

          <div class="toolbar-right">
            <button type="button" class="btn btn-outline-secondary" @click="cargarUsuarios(paginaActual)" :disabled="cargando">
              <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': cargando }"></i> Actualizar
            </button>
            <button type="button" class="btn btn-primary" @click="abrirModalCrear">
              <i class="fa-solid fa-user-plus"></i> Nuevo Usuario
            </button>
          </div>
        </div>

        <!-- TABLA DE USUARIOS -->
        <div class="table-responsive">
          <table class="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Seguridad</th>
                <th>Fecha Creación</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="cargando && usuarios.length === 0">
                <td colspan="6" class="table-loading-cell">
                  <div class="loading-state">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Cargando listado de usuarios...</span>
                  </div>
                </td>
              </tr>

              <tr v-else-if="usuarios.length === 0">
                <td colspan="6" class="table-empty-cell">
                  <div class="empty-state">
                    <i class="fa-solid fa-user-xmark"></i>
                    <p>No se encontraron usuarios con los criterios de búsqueda seleccionados.</p>
                  </div>
                </td>
              </tr>

              <tr
                v-for="u in usuarios"
                :key="u.id"
                :class="{ 'row-disabled': u.deletedAt }"
              >
                <!-- Usuario / Avatar / Nombre / Correo -->
                <td>
                  <div class="user-identity">
                    <div
                      class="user-avatar"
                      :class="{ 'admin-avatar': u.rol === 'admin', 'disabled-avatar': u.deletedAt }"
                    >
                      <i :class="u.rol === 'admin' ? 'fa-solid fa-shield-halved' : 'fa-solid fa-user'"></i>
                    </div>
                    <div class="user-meta">
                      <strong class="user-fullname">
                        {{ u.nombre || 'Sin nombre registrado' }}
                        <span v-if="Number(u.id) === Number(usuarioActual?.id)" class="badge-current-user">
                          (Tú)
                        </span>
                      </strong>
                      <span class="user-email">
                        <i class="fa-regular fa-envelope"></i> {{ u.correo }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Rol -->
                <td>
                  <span class="role-badge" :class="u.rol">
                    <i :class="u.rol === 'admin' ? 'fa-solid fa-shield' : 'fa-solid fa-headset'"></i>
                    {{ u.rol === 'admin' ? 'Administrador' : 'Operador' }}
                  </span>
                </td>

                <!-- Estado -->
                <td>
                  <span v-if="!u.deletedAt" class="status-badge active">
                    <i class="fa-solid fa-circle-check"></i> Activo
                  </span>
                  <span v-else class="status-badge inactive" title="Usuario dado de baja">
                    <i class="fa-solid fa-ban"></i> Desactivado
                  </span>
                </td>

                <!-- Seguridad / Clave pendiente -->
                <td>
                  <span v-if="u.requiere_cambio_pw" class="security-badge warning" title="El usuario debe cambiar su clave en el próximo inicio">
                    <i class="fa-solid fa-key"></i> Clave temporal
                  </span>
                  <span v-else class="security-badge normal">
                    <i class="fa-solid fa-lock"></i> Al día
                  </span>
                </td>

                <!-- Fecha de creación -->
                <td class="date-cell">
                  {{ formatearFecha(u.createdAt) }}
                </td>

                <!-- Acciones -->
                <td class="text-right">
                  <div class="action-buttons-group">
                    <!-- Editar (solo activos) -->
                    <button
                      v-if="!u.deletedAt"
                      type="button"
                      class="btn-icon-action btn-edit"
                      @click="abrirModalEditar(u)"
                      title="Editar datos del usuario"
                    >
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>

                    <!-- Restablecer Contraseña (solo activos) -->
                    <button
                      v-if="!u.deletedAt"
                      type="button"
                      class="btn-icon-action btn-key"
                      @click="abrirModalPassword(u)"
                      title="Restablecer contraseña"
                    >
                      <i class="fa-solid fa-key"></i>
                    </button>

                    <!-- Desactivar (si activo y no es el usuario actual) -->
                    <button
                      v-if="!u.deletedAt && Number(u.id) !== Number(usuarioActual?.id)"
                      type="button"
                      class="btn-icon-action btn-delete"
                      @click="confirmarDesactivar(u)"
                      title="Desactivar usuario"
                    >
                      <i class="fa-solid fa-user-slash"></i>
                    </button>

                    <!-- Restaurar (si desactivado) -->
                    <button
                      v-if="u.deletedAt"
                      type="button"
                      class="btn-icon-action btn-restore"
                      @click="confirmarRestaurar(u)"
                      title="Reactivar usuario"
                    >
                      <i class="fa-solid fa-rotate-left"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINACIÓN -->
        <div class="pagination-footer" v-if="totalPaginas > 1">
          <div class="pagination-info">
            Mostrando página <strong>{{ paginaActual }}</strong> de <strong>{{ totalPaginas }}</strong> (Total: {{ totalUsuarios }} usuarios)
          </div>
          <div class="pagination-controls">
            <button
              class="btn-page"
              :disabled="paginaActual <= 1"
              @click="cargarUsuarios(paginaActual - 1)"
            >
              <i class="fa-solid fa-chevron-left"></i> Anterior
            </button>
            <span class="current-page-pill">{{ paginaActual }}</span>
            <button
              class="btn-page"
              :disabled="paginaActual >= totalPaginas"
              @click="cargarUsuarios(paginaActual + 1)"
            >
              Siguiente <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL CREAR USUARIO -->
    <div v-if="modalCrearVisible" class="modal-backdrop" @click.self="modalCrearVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="header-brand-info">
            <img src="/icons/icon_blanco.png" alt="Segura EP" class="modal-logo" />
            <span class="header-badge">ALTA DE USUARIO</span>
          </div>
          <button type="button" class="btn-close" @click="modalCrearVisible = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form @submit.prevent="guardarNuevoUsuario" class="modal-body">
          <div class="title-container">
            <h2 class="modal-subtitle">
              <i class="fa-solid fa-user-plus"></i> Crear Nuevo Usuario
            </h2>
            <p class="modal-description">Ingrese los datos para autorizar el acceso a la plataforma.</p>
          </div>

          <div v-if="modalError" class="alert alert-error">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{{ modalError }}</span>
          </div>

          <div class="form-group">
            <label>Nombre y Apellido <span class="required">*</span></label>
            <input
              type="text"
              v-model="formCrear.nombre"
              placeholder="Ej: Pedro Morales"
              required
              :disabled="guardando"
            />
          </div>

          <div class="form-group">
            <label>Correo Institucional (@seguraep.gob.ec) <span class="required">*</span></label>
            <input
              type="email"
              v-model="formCrear.correo"
              placeholder="ejemplo@seguraep.gob.ec"
              required
              :disabled="guardando"
            />
          </div>

          <div class="form-group">
            <div class="label-row">
              <label>Contraseña Inicial <span class="required">*</span></label>
              <span class="pass-hint" :class="{ 'pass-hint-valid': formCrear.password.length >= 6 }">
                <i :class="formCrear.password.length >= 6 ? 'fa-solid fa-check' : 'fa-solid fa-circle-info'"></i>
                Mínimo 6 caracteres
              </span>
            </div>
            <div class="input-icon-wrapper">
              <input
                :type="showPassCrear ? 'text' : 'password'"
                v-model="formCrear.password"
                placeholder="Ingrese contraseña temporal"
                required
                minlength="6"
                :disabled="guardando"
              />
              <button
                type="button"
                class="btn-toggle-pass"
                @click="showPassCrear = !showPassCrear"
                tabindex="-1"
              >
                <i :class="showPassCrear ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Rol en el Sistema</label>
            <div class="role-selector-grid">
              <div
                class="role-card"
                :class="{ active: formCrear.rol === 'operador' }"
                @click="formCrear.rol = 'operador'"
              >
                <div class="role-icon">
                  <i class="fa-solid fa-headset"></i>
                </div>
                <div class="role-info">
                  <strong>Operador</strong>
                  <span>Registro y novedades de sala</span>
                </div>
              </div>

              <div
                class="role-card"
                :class="{ active: formCrear.rol === 'admin' }"
                @click="formCrear.rol = 'admin'"
              >
                <div class="role-icon admin">
                  <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div class="role-info">
                  <strong>Administrador</strong>
                  <span>Control total del sistema</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label class="custom-checkbox-label">
              <input type="checkbox" v-model="formCrear.requiere_cambio_pw" :disabled="guardando" />
              <span>Exigir cambio de contraseña en el próximo inicio de sesión</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="modalCrearVisible = false" :disabled="guardando">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" :disabled="guardando">
              <i v-if="guardando" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-check"></i>
              {{ guardando ? 'Guardando...' : 'Crear Usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL EDITAR USUARIO -->
    <div v-if="modalEditarVisible" class="modal-backdrop" @click.self="modalEditarVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="header-brand-info">
            <img src="/icons/icon_blanco.png" alt="Segura EP" class="modal-logo" />
            <span class="header-badge">EDICIÓN DE USUARIO</span>
          </div>
          <button type="button" class="btn-close" @click="modalEditarVisible = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form @submit.prevent="guardarEdicionUsuario" class="modal-body">
          <div class="title-container">
            <h2 class="modal-subtitle">
              <i class="fa-solid fa-user-pen"></i> Modificar Datos de Usuario
            </h2>
            <p class="modal-description">Actualice la información del perfil o modifique sus permisos.</p>
          </div>

          <div v-if="modalError" class="alert alert-error">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{{ modalError }}</span>
          </div>

          <div class="form-group">
            <label>Nombre y Apellido <span class="required">*</span></label>
            <input
              type="text"
              v-model="formEditar.nombre"
              required
              :disabled="guardando"
            />
          </div>

          <div class="form-group">
            <label>Correo Institucional <span class="required">*</span></label>
            <input
              type="email"
              v-model="formEditar.correo"
              required
              :disabled="guardando"
            />
          </div>

          <div class="form-group">
            <label>Rol en el Sistema</label>
            <div class="role-selector-grid">
              <div
                class="role-card"
                :class="{ active: formEditar.rol === 'operador' }"
                @click="formEditar.rol = 'operador'"
              >
                <div class="role-icon">
                  <i class="fa-solid fa-headset"></i>
                </div>
                <div class="role-info">
                  <strong>Operador</strong>
                  <span>Operador de Sala</span>
                </div>
              </div>

              <div
                class="role-card"
                :class="{ active: formEditar.rol === 'admin' }"
                @click="formEditar.rol = 'admin'"
              >
                <div class="role-icon admin">
                  <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div class="role-info">
                  <strong>Administrador</strong>
                  <span>Control Total</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label class="custom-checkbox-label">
              <input type="checkbox" v-model="formEditar.requiere_cambio_pw" :disabled="guardando" />
              <span>Forzar cambio de clave en el siguiente acceso</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="modalEditarVisible = false" :disabled="guardando">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" :disabled="guardando">
              <i v-if="guardando" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ guardando ? 'Actualizando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL RESTABLECER CONTRASEÑA -->
    <div v-if="modalPasswordVisible" class="modal-backdrop" @click.self="modalPasswordVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="header-brand-info">
            <img src="/icons/icon_blanco.png" alt="Segura EP" class="modal-logo" />
            <span class="header-badge">SEGURIDAD</span>
          </div>
          <button type="button" class="btn-close" @click="modalPasswordVisible = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form @submit.prevent="ejecutarCambioPassword" class="modal-body">
          <div class="title-container">
            <h2 class="modal-subtitle">
              <i class="fa-solid fa-key"></i> Restablecer Contraseña
            </h2>
            <p class="modal-description">
              Asignar una nueva clave de acceso para <strong>{{ usuarioSeleccionado?.nombre }}</strong> ({{ usuarioSeleccionado?.correo }}).
            </p>
          </div>

          <div v-if="modalError" class="alert alert-error">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{{ modalError }}</span>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label>Nueva Contraseña <span class="required">*</span></label>
              <span class="pass-hint" :class="{ 'pass-hint-valid': formPassword.newPassword.length >= 6 }">
                <i :class="formPassword.newPassword.length >= 6 ? 'fa-solid fa-check' : 'fa-solid fa-circle-info'"></i>
                Mínimo 6 caracteres
              </span>
            </div>
            <div class="input-icon-wrapper">
              <input
                :type="showPassReset ? 'text' : 'password'"
                v-model="formPassword.newPassword"
                placeholder="Ingrese nueva contraseña"
                required
                minlength="6"
                :disabled="guardando"
              />
              <button
                type="button"
                class="btn-toggle-pass"
                @click="showPassReset = !showPassReset"
                tabindex="-1"
              >
                <i :class="showPassReset ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label class="custom-checkbox-label">
              <input type="checkbox" v-model="formPassword.requiere_cambio_pw" :disabled="guardando" />
              <span>Solicitar al usuario que cambie esta contraseña temporal al iniciar</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="modalPasswordVisible = false" :disabled="guardando">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" :disabled="guardando || formPassword.newPassword.length < 6">
              <i v-if="guardando" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-shield-check"></i>
              {{ guardando ? 'Restableciendo...' : 'Restablecer Clave' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL CONFIRMACIÓN (DESACTIVAR / RESTAURAR) -->
    <div v-if="modalConfirmarVisible" class="modal-backdrop" @click.self="modalConfirmarVisible = false">
      <div class="modal-card modal-confirm">
        <div class="confirm-icon-wrapper" :class="accionConfirmar.tipo">
          <i :class="accionConfirmar.tipo === 'delete' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-rotate-left'"></i>
        </div>
        <h3 class="confirm-title">{{ accionConfirmar.titulo }}</h3>
        <p class="confirm-text">{{ accionConfirmar.mensaje }}</p>

        <div class="modal-actions confirm-actions">
          <button type="button" class="btn btn-secondary" @click="modalConfirmarVisible = false" :disabled="guardando">
            Cancelar
          </button>
          <button
            type="button"
            class="btn"
            :class="accionConfirmar.tipo === 'delete' ? 'btn-danger' : 'btn-success'"
            @click="ejecutarAccionConfirmada"
            :disabled="guardando"
          >
            <i v-if="guardando" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else :class="accionConfirmar.tipo === 'delete' ? 'fa-solid fa-user-slash' : 'fa-solid fa-check'"></i>
            {{ guardando ? 'Procesando...' : accionConfirmar.botonTexto }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService, usuariosService } from '../services/api.js';
import { toast } from '../services/toast.js';

const router = useRouter();
const usuarioActual = computed(() => authService.getUsuarioSesion());

// Estado de listado
const usuarios = ref([]);
const totalUsuarios = ref(0);
const paginaActual = ref(1);
const totalPaginas = ref(1);
const cargando = ref(false);

// Filtros
const filtroBusqueda = ref('');
const filtroRol = ref('');
const incluirEliminados = ref(false);

// Métricas
const totalOperadores = computed(() => usuarios.value.filter(u => u.rol === 'operador' && !u.deletedAt).length);
const totalAdmins = computed(() => usuarios.value.filter(u => u.rol === 'admin' && !u.deletedAt).length);
const totalDesactivados = computed(() => usuarios.value.filter(u => !!u.deletedAt).length);

// Modales y formularios
const modalCrearVisible = ref(false);
const modalEditarVisible = ref(false);
const modalPasswordVisible = ref(false);
const modalConfirmarVisible = ref(false);
const guardando = ref(false);
const modalError = ref('');

const showPassCrear = ref(false);
const showPassReset = ref(false);

const formCrear = reactive({
  nombre: '',
  correo: '',
  password: '',
  rol: 'operador',
  requiere_cambio_pw: false
});

const formEditar = reactive({
  id: null,
  nombre: '',
  correo: '',
  rol: 'operador',
  requiere_cambio_pw: false
});

const formPassword = reactive({
  id: null,
  newPassword: '',
  requiere_cambio_pw: false
});

const usuarioSeleccionado = ref(null);
const accionConfirmar = reactive({
  tipo: 'delete', // 'delete' o 'restore'
  titulo: '',
  mensaje: '',
  botonTexto: ''
});

let debounceTimer = null;
function debouncedCargar() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cargarUsuarios(1);
  }, 350);
}

async function cargarUsuarios(page = 1) {
  cargando.value = true;
  paginaActual.value = page;

  try {
    const params = {
      page,
      limit: 15,
      incluirEliminados: incluirEliminados.value
    };

    if (filtroBusqueda.value.trim()) {
      params.search = filtroBusqueda.value.trim();
    }

    if (filtroRol.value) {
      params.rol = filtroRol.value;
    }

    const data = await usuariosService.listar(params);

    if (data && data.ok) {
      usuarios.value = data.usuarios || [];
      totalUsuarios.value = data.total || 0;
      totalPaginas.value = data.totalPaginas || 1;
    } else {
      usuarios.value = data.usuarios || [];
    }
  } catch (err) {
    const msg = err.response?.data?.mensaje || err.message || 'Error al cargar usuarios';
    toast.error(msg);
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  formCrear.nombre = '';
  formCrear.correo = '';
  formCrear.password = '';
  formCrear.rol = 'operador';
  formCrear.requiere_cambio_pw = false;
  showPassCrear.value = false;
  modalError.value = '';
  modalCrearVisible.value = true;
}

async function guardarNuevoUsuario() {
  modalError.value = '';
  guardando.value = true;

  try {
    const res = await usuariosService.crear({
      nombre: formCrear.nombre.trim(),
      correo: formCrear.correo.trim(),
      password: formCrear.password,
      rol: formCrear.rol,
      requiere_cambio_pw: formCrear.requiere_cambio_pw
    });

    toast.success(`Usuario "${res.usuario?.nombre || formCrear.nombre}" creado con éxito.`);
    modalCrearVisible.value = false;
    cargarUsuarios(paginaActual.value);
  } catch (err) {
    modalError.value = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error al crear usuario';
  } finally {
    guardando.value = false;
  }
}

function abrirModalEditar(u) {
  usuarioSeleccionado.value = u;
  formEditar.id = u.id;
  formEditar.nombre = u.nombre || '';
  formEditar.correo = u.correo || '';
  formEditar.rol = u.rol || 'operador';
  formEditar.requiere_cambio_pw = !!u.requiere_cambio_pw;
  modalError.value = '';
  modalEditarVisible.value = true;
}

async function guardarEdicionUsuario() {
  modalError.value = '';
  guardando.value = true;

  try {
    const res = await usuariosService.actualizar(formEditar.id, {
      nombre: formEditar.nombre.trim(),
      correo: formEditar.correo.trim(),
      rol: formEditar.rol,
      requiere_cambio_pw: formEditar.requiere_cambio_pw
    });

    toast.success(`Usuario "${res.usuario?.nombre || formEditar.nombre}" actualizado.`);
    modalEditarVisible.value = false;
    cargarUsuarios(paginaActual.value);
  } catch (err) {
    modalError.value = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error al actualizar usuario';
  } finally {
    guardando.value = false;
  }
}

function abrirModalPassword(u) {
  usuarioSeleccionado.value = u;
  formPassword.id = u.id;
  formPassword.newPassword = '';
  formPassword.requiere_cambio_pw = false;
  showPassReset.value = false;
  modalError.value = '';
  modalPasswordVisible.value = true;
}

async function ejecutarCambioPassword() {
  modalError.value = '';
  guardando.value = true;

  try {
    await usuariosService.cambiarPassword(formPassword.id, {
      newPassword: formPassword.newPassword,
      requiere_cambio_pw: formPassword.requiere_cambio_pw
    });

    toast.success(`Contraseña actualizada para el usuario ${usuarioSeleccionado.value?.correo}`);
    modalPasswordVisible.value = false;
    cargarUsuarios(paginaActual.value);
  } catch (err) {
    modalError.value = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error al restablecer contraseña';
  } finally {
    guardando.value = false;
  }
}

function confirmarDesactivar(u) {
  usuarioSeleccionado.value = u;
  accionConfirmar.tipo = 'delete';
  accionConfirmar.titulo = '¿Desactivar usuario?';
  accionConfirmar.mensaje = `El usuario "${u.nombre}" (${u.correo}) no podrá iniciar sesión en la plataforma. Puede reactivarse posteriormente.`;
  accionConfirmar.botonTexto = 'Sí, Desactivar Usuario';
  modalConfirmarVisible.value = true;
}

function confirmarRestaurar(u) {
  usuarioSeleccionado.value = u;
  accionConfirmar.tipo = 'restore';
  accionConfirmar.titulo = '¿Reactivar usuario?';
  accionConfirmar.mensaje = `Se reactivará la cuenta de "${u.nombre}" (${u.correo}) permitiéndole acceder nuevamente al sistema.`;
  accionConfirmar.botonTexto = 'Sí, Reactivar Cuenta';
  modalConfirmarVisible.value = true;
}

async function ejecutarAccionConfirmada() {
  if (!usuarioSeleccionado.value) return;

  guardando.value = true;

  try {
    if (accionConfirmar.tipo === 'delete') {
      await usuariosService.eliminar(usuarioSeleccionado.value.id);
      toast.success(`Usuario ${usuarioSeleccionado.value.correo} desactivado.`);
    } else {
      await usuariosService.restaurar(usuarioSeleccionado.value.id);
      toast.success(`Usuario ${usuarioSeleccionado.value.correo} reactivado.`);
    }

    modalConfirmarVisible.value = false;
    cargarUsuarios(paginaActual.value);
  } catch (err) {
    const msg = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error al procesar la solicitud';
    toast.error(msg);
  } finally {
    guardando.value = false;
  }
}

function formatearFecha(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return iso;
  }
}

async function cerrarSesion() {
  if (confirm('¿Desea cerrar la sesión actual?')) {
    await authService.logout();
    router.push('/login');
  }
}

onMounted(() => {
  // Verificar si es admin
  const u = authService.getUsuarioSesion();
  if (!u || u.rol !== 'admin') {
    toast.warning('Acceso denegado: este módulo es exclusivo para administradores.');
    router.push('/');
    return;
  }

  cargarUsuarios(1);
});
</script>

<style scoped>
.usuarios-page {
  padding: 16px;
  max-width: 1440px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
}

.container-fluid {
  width: 100%;
}

/* CABECERA */
.app-header {
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  padding: 14px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 18px;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.brand-section {
  display: flex;
  align-items: center;
}

.brand-title {
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-logo {
  height: 42px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.brand-text h2 {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #ffffff;
}

.header-subtitle {
  font-size: 0.76rem;
  color: #93c5fd;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.user-badge {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-outline-white {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

.btn-outline-white:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.7);
}

/* MÉTRICAS */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.metric-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.metric-icon.total {
  background: #e0f2fe;
  color: var(--accent-blue);
}

.metric-icon.operadores {
  background: #dcfce7;
  color: #16a34a;
}

.metric-icon.admins {
  background: #fef3c7;
  color: #d97706;
}

.metric-icon.inactivos {
  background: #fee2e2;
  color: #dc2626;
}

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-value {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--primary-navy);
  line-height: 1.1;
}

/* PANEL PRINCIPAL */
.main-panel {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* TOOLBAR */
.panel-toolbar {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 280px;
  flex: 1;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-faint);
  font-size: 0.85rem;
}

.search-field {
  width: 100%;
  padding: 7px 30px 7px 32px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.84rem;
  background: #ffffff;
}

.btn-clear-search {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 2px 4px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-muted);
}

.filter-select {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  font-size: 0.82rem;
  background: #ffffff;
  width: auto;
}

.filter-checkbox-wrapper {
  display: flex;
  align-items: center;
}

.custom-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.custom-checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* TABLA */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.85rem;
}

.users-table th {
  background: #f1f5f9;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 14px;
  border-bottom: 2px solid var(--border);
}

.users-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.users-table tbody tr {
  transition: background-color 0.12s ease;
}

.users-table tbody tr:hover {
  background-color: #f8fafc;
}

.row-disabled {
  background-color: #f8fafc;
  opacity: 0.75;
}

.user-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0f2fe;
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
  border: 1px solid #bae6fd;
}

.user-avatar.admin-avatar {
  background: #0f2744;
  color: #facc15;
  border-color: #1e3a8a;
}

.user-avatar.disabled-avatar {
  background: #e2e8f0;
  color: #94a3b8;
  border-color: #cbd5e1;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-fullname {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--primary-navy);
}

.badge-current-user {
  font-size: 0.7rem;
  background: #e0f2fe;
  color: #0369a1;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  margin-left: 4px;
}

.user-email {
  font-size: 0.78rem;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Badges */
.role-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.role-badge.operador {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.role-badge.admin {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.security-badge {
  font-size: 0.72rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.security-badge.warning {
  color: #d97706;
  background: #fffbeb;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #fde68a;
}

.security-badge.normal {
  color: var(--text-faint);
}

.date-cell {
  font-size: 0.8rem;
  color: var(--text-faint);
}

.text-right {
  text-align: right;
}

/* Botones de acción */
.action-buttons-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.btn-icon-action {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.15s ease;
}

.btn-icon-action:hover {
  transform: translateY(-1px);
}

.btn-edit:hover {
  background: #e0f2fe;
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.btn-key:hover {
  background: #fef3c7;
  color: #d97706;
  border-color: #d97706;
}

.btn-delete:hover {
  background: #fee2e2;
  color: var(--accent-red);
  border-color: var(--accent-red);
}

.btn-restore:hover {
  background: #dcfce7;
  color: var(--accent-green);
  border-color: var(--accent-green);
}

/* Loading & Empty state */
.table-loading-cell,
.table-empty-cell {
  padding: 40px 20px;
  text-align: center;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-faint);
}

.empty-state i {
  font-size: 2rem;
  color: var(--text-faint);
}

/* PAGINACIÓN */
.pagination-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.pagination-info {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-page {
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid var(--border-strong);
  background: #ffffff;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-page-pill {
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--accent-blue);
  color: #ffffff;
  padding: 3px 9px;
  border-radius: 4px;
}

/* MODALES */
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
  max-width: 480px;
  box-shadow: 0 20px 30px -5px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  animation: modalAppear 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalAppear {
  from { opacity: 0; transform: translateY(-16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
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
  height: 28px;
  width: auto;
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
  padding: 4px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-description {
  margin: 4px 0 0 0;
  font-size: 0.8rem;
  color: var(--text-faint);
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
  margin-bottom: 5px;
  margin-top: 0;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.label-row label {
  margin-bottom: 0;
}

.required {
  color: var(--accent-red);
}

.pass-hint {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  gap: 4px;
}

.pass-hint-valid {
  color: #16a34a;
}

.input-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-toggle-pass {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--text-faint);
  padding: 4px 6px;
  cursor: pointer;
}

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
  background: #f8fafc;
  user-select: none;
  transition: all 0.15s ease;
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
  flex-shrink: 0;
}

.role-icon.admin {
  color: #0f2744;
}

.role-info strong {
  font-size: 0.8rem;
  color: var(--primary-navy);
  display: block;
}

.role-info span {
  font-size: 0.68rem;
  color: var(--text-faint);
}

.checkbox-group {
  margin-top: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: var(--accent-red);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* MODAL DE CONFIRMACIÓN */
.modal-confirm {
  max-width: 400px;
  padding: 24px;
  text-align: center;
}

.confirm-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}

.confirm-icon-wrapper.delete {
  background: #fee2e2;
  color: var(--accent-red);
}

.confirm-icon-wrapper.restore {
  background: #dcfce7;
  color: var(--accent-green);
}

.confirm-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--primary-navy);
  margin-bottom: 8px;
}

.confirm-text {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 20px;
}

.confirm-actions {
  justify-content: center;
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
</style>
