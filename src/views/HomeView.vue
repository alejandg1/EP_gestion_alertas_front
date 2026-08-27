// HomeView.vue

<template>
  <div class="home-wrapper" :style="pageBackgroundStyle">
    <div class="home-container">
      <Navbar @open-register="showModalRegister = true" />

      <div class="dashboard-header">
        <div class="dashboard-title">
          <h2>Reportes de Sala Situacional</h2>
        </div>

        <div class="dashboard-actions">
          <button
            type="button"
            class="btn btn-primary"
            @click="crearNuevoReporte"
            :disabled="creandoReporte"
          >
            <i v-if="creandoReporte" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-file-circle-plus"></i>
            {{ creandoReporte ? 'Creando Reporte...' : 'Crear Nuevo Reporte' }}
          </button>
        </div>
      </div>

      <!-- Filtro y Estadisticas Rapidas -->
      <div class="filter-bar">
        <div class="search-box">
          <input
            type="text"
            v-model="busqueda"
            placeholder="Buscar por RDS, titulo o colaborador..."
            @input="onBusquedaInput"
          />
          <button v-if="busqueda" class="btn-clear" @click="limpiarBusqueda" title="Limpiar busqueda">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="stats-group">
          <span class="stat-pill">
            <i class="fa-solid fa-folder-open"></i> Total: <b>{{ totalReportes }}</b>
          </span>
          <span class="stat-pill">
            <i class="fa-solid fa-triangle-exclamation"></i> Novedades: <b>{{ totalNovedadesCount }}</b>
          </span>
          <button class="btn btn-sm btn-primary" @click="cargarReportes" :disabled="loading" title="Recargar lista">
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': loading }"></i>
            {{ loading ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>
      </div>

      <!-- Estado de Carga / Vacio -->
      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando reportes de la Sala Situacional...</p>
      </div>

      <div v-else-if="reportes.length === 0" class="empty-state">
        <h3>No se encontraron reportes</h3>
        <p v-if="busqueda">No hay resultados que coincidan con "{{ busqueda }}"</p>
        <p v-else>No hay reportes registrados aún en la plataforma.</p>
      </div>

      <!-- Grid de Reportes -->
      <div v-else class="reports-grid">
        <div
          v-for="rep in reportes"
          :key="rep._id"
          class="report-card"
          @click="abrirReporte(rep._id)"
        >
          <div class="card-top">
            <span class="rds-badge">{{ rep.numero_rds || 'RDS SIN CODIGO' }}</span>
            <span class="date-badge">{{ formatearFecha(rep.fecha_reporte) }}</span>
          </div>

          <h3 class="card-title">{{ rep.titulo }}</h3>

          <div class="card-details">
            <div class="detail-row">
              <span class="label">Horario de corte:</span>
              <span class="value">{{ rep.hora_inicio || '00:00' }} - {{ rep.hora_fin || '23:59' }}</span>
            </div>

            <div class="detail-row">
              <span class="label">Elaborado por:</span>
              <span class="value" :title="obtenerTextoColaboradores(rep)">
                {{ obtenerTextoColaboradores(rep) }}
              </span>
            </div>

            <div class="detail-row">
              <span class="label">Revisado por:</span>
              <span class="value">{{ rep.revisado_por || 'Jefatura de Sala' }}</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="events-badge">
              <i class="fa-solid fa-list-check"></i> {{ (rep.novedades || []).length }} Novedades
            </span>
            <div class="card-footer-actions">
              <button
                type="button"
                class="btn btn-sm btn-danger btn-del-report"
                @click.stop="eliminarReporte(rep)"
                title="Eliminar este reporte"
              >
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <button type="button" class="btn btn-sm btn-primary" @click.stop="abrirReporte(rep._id)">
                Abrir Reporte <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Paginación y Límites -->
      <div v-if="totalReportes > 0" class="pagination-bar">
        <div class="pagination-info">
          <span>
            Mostrando página <b>{{ paginacion.page || page }}</b> de <b>{{ paginacion.totalPages || 1 }}</b> (Total: <b>{{ totalReportes }}</b> reportes)
          </span>
        </div>

        <div class="pagination-controls">
          <div class="limit-selector">
            <label for="limit-select">Límite:</label>
            <select id="limit-select" v-model="limit" @change="cambiarLimite">
              <option :value="6">6</option>
              <option :value="12">12</option>
              <option :value="24">24</option>
              <option :value="48">48</option>
            </select>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-outline"
            :disabled="!paginacion.hasPrevPage || loading"
            @click="irAPagina((paginacion.page || page) - 1)"
            title="Página anterior"
          >
            <i class="fa-solid fa-chevron-left"></i> Anterior
          </button>

          <div class="page-numbers">
            <button
              v-for="p in paginasVisibles"
              :key="p"
              type="button"
              class="btn btn-sm page-btn"
              :class="p === (paginacion.page || page) ? 'btn-primary active-page' : 'btn-outline'"
              @click="irAPagina(p)"
            >
              {{ p }}
            </button>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-outline"
            :disabled="!paginacion.hasNextPage || loading"
            @click="irAPagina((paginacion.page || page) + 1)"
            title="Página siguiente"
          >
            Siguiente <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Modales -->
      <ModalRegister v-model="showModalRegister" @registered="onOperadorRegistrado" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService, reportesService } from '../services/api.js';
import {
  obtenerFechaActualISO,
  obtenerHoraActual,
  generarCabeceraDinamica,
  generarPeriodoDinamico,
  calcularPronosticoInocar
} from '../services/timeAndTides.js';
import Navbar from '../components/Navbar.vue';
import ModalRegister from '../components/ModalRegister.vue';
import { toast } from '../services/toast.js';

const router = useRouter();

const reportes = ref([]);
const loading = ref(false);
const creandoReporte = ref(false);
const busqueda = ref('');
const page = ref(1);
const limit = ref(12);
const totalReportes = ref(0);
const paginacion = ref({
  page: 1,
  limit: 12,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
});

let debounceTimer = null;
function onBusquedaInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    cargarReportes();
  }, 350);
}

function limpiarBusqueda() {
  busqueda.value = '';
  page.value = 1;
  cargarReportes();
}

function cambiarLimite() {
  page.value = 1;
  cargarReportes();
}

function irAPagina(nuevaPagina) {
  if (nuevaPagina < 1 || nuevaPagina > (paginacion.value.totalPages || 1)) return;
  page.value = nuevaPagina;
  cargarReportes();
}

const paginasVisibles = computed(() => {
  const total = paginacion.value.totalPages || 1;
  const current = paginacion.value.page || page.value || 1;
  const pages = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const showModalRegister = ref(false);

// Nombre exacto del archivo ubicado en public/icons/
const bgImageUrl = '/icons/Gemini_Generated_Image_uhi1ycuhi1ycuhi1.jpg';

const pageBackgroundStyle = computed(() => ({
  backgroundImage: `linear-gradient(rgba(10, 61, 98, 0.45), rgba(15, 23, 42, 0.65)), url("${bgImageUrl}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center center',
  backgroundSize: 'cover',
  backgroundAttachment: 'fixed'
}));

async function crearNuevoReporte() {
  creandoReporte.value = true;
  try {
    const usuario = authService.getUsuarioSesion();
    const creadorNombre = usuario?.nombre || usuario?.correo || '';
    const fechaHoy = obtenerFechaActualISO();
    const horaHoy = obtenerHoraActual();
    const anioActual = new Date().getFullYear();
    let maxRdsNum = 0;
    (reportes.value || []).forEach(r => {
      if (r.numero_rds) {
        const match = r.numero_rds.match(/-(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxRdsNum) maxRdsNum = n;
        }
      }
    });
    if (totalReportes.value > maxRdsNum) maxRdsNum = totalReportes.value;
    const numRdsGenerado = `SEGURA-EP-GASGEC-SS-${anioActual}-${String(maxRdsNum + 1).padStart(3, '0')}`;
    const pronosticoHoy = calcularPronosticoInocar(fechaHoy);

    const dataCreacion = {
      titulo: 'Reporte de Novedades e Incidentes - Sala Situacional',
      numero_rds: numRdsGenerado,
      fecha_reporte: fechaHoy,
      hora_inicio: '06:00',
      hora_fin: horaHoy,
      usuario_id: usuario?.id || usuario?._id,
      correo_colaborador: usuario?.correo,
      colaboradores: creadorNombre ? [creadorNombre] : [],
      revisado_por: 'Jefe de Sala Situacional | MSc. Ing. Santiago Jaramillo',
      cabecera: generarCabeceraDinamica(fechaHoy, '06:00'),
      periodo: generarPeriodoDinamico(fechaHoy),
      inocar_fecha: pronosticoHoy.fecha,
      inocar_pleamar: pronosticoHoy.pleamar,
      inocar_bajamar: pronosticoHoy.bajamar,
      observaciones_generales: 'Monitoreo en tiempo real de lluvias y acumulacion de agua.'
    };
    const nuevo = await reportesService.create(dataCreacion);
    const idCreado = nuevo?._id || nuevo?.reporte?._id;
    if (idCreado) {
      router.push(`/reportes/${idCreado}`);
    } else {
      throw new Error('No se recibio el ID del reporte creado');
    }
  } catch (err) {
    toast.error('Error al crear nuevo reporte: ' + (err.response?.data?.error || err.message));
  } finally {
    creandoReporte.value = false;
  }
}

async function eliminarReporte(rep) {
  const nombreRep = rep.numero_rds || rep.titulo || 'este reporte';
  const confirmacion = window.confirm(`¿Está seguro de eliminar el reporte "${nombreRep}"?\n\nEsta acción es irreversible y eliminará todas sus novedades.`);
  if (!confirmacion) return;

  try {
    await reportesService.deleteReporte(rep._id);
    toast.success('Reporte eliminado exitosamente');
    await cargarReportes();
  } catch (err) {
    toast.error('Error al eliminar reporte: ' + (err.response?.data?.mensaje || err.message));
  }
}

function obtenerTextoColaboradores(rep) {
  if (rep.colaboradores && Array.isArray(rep.colaboradores) && rep.colaboradores.length > 0) {
    return rep.colaboradores
      .map(c => typeof c === 'string' ? c : (c.nombre || c.correo))
      .filter(Boolean)
      .join(', ');
  }
  return rep.elaborado_por || 'Sin asignar';
}

const totalNovedadesCount = computed(() => {
  return reportes.value.reduce((acc, curr) => acc + (curr.novedades?.length || 0), 0);
});

async function cargarReportes() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: limit.value
    };
    if (busqueda.value.trim()) params.busqueda = busqueda.value.trim();

    const data = await reportesService.getAll(params);
    if (data && data.reportes) {
      reportes.value = data.reportes;
      totalReportes.value = data.total !== undefined ? data.total : data.reportes.length;
      if (data.paginacion) {
        paginacion.value = data.paginacion;
      } else {
        const totalP = Math.ceil(totalReportes.value / limit.value) || 1;
        paginacion.value = {
          total: totalReportes.value,
          page: page.value,
          limit: limit.value,
          totalPages: totalP,
          hasNextPage: page.value < totalP,
          hasPrevPage: page.value > 1
        };
      }
    } else {
      reportes.value = Array.isArray(data) ? data : [];
      totalReportes.value = reportes.value.length;
      paginacion.value = {
        total: totalReportes.value,
        page: 1,
        limit: limit.value,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      };
    }
  } catch (err) {
    console.error('Error al cargar reportes:', err);
  } finally {
    loading.value = false;
  }
}

function abrirReporte(id) {
  router.push(`/reportes/${id}`);
}

function formatearFecha(iso) {
  if (!iso) return 'Fecha N/D';
  const partes = iso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return iso;
}

function onOperadorRegistrado() {
  // Notificacion o recarga si es necesario
}

function onReporteCreado() {
  cargarReportes();
}

onMounted(() => {
  cargarReportes();
});
</script>

<style scoped>
.home-wrapper {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.home-container {
  width: 100%;
  padding: 20px 32px 60px;
  box-sizing: border-box;
}

/* Cabecera Cristal */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 20px 28px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.dashboard-title h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #0a3d62;
  font-weight: 800;
}

.dashboard-title p {
  margin: 4px 0 0 0;
  font-size: 0.88rem;
  color: #334155;
  font-weight: 500;
}

.dashboard-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* Barra de Búsqueda y Estadísticas */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  width: 100%;
}

.search-box {
  position: relative;
  flex: 1 1 300px;
  max-width: 500px;
}

.search-box input {
  width: 100%;
  padding: 10px 36px 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  font-size: 0.88rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #0f172a;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.search-box input:focus {
  outline: none;
  border-color: #0284c7;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25);
}

.btn-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-weight: 700;
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-pill {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #334155;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-pill b {
  color: #0a3d62;
  font-weight: 800;
}

/* Grid Fluido Adaptable a cualquier pantalla */
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 22px;
  width: 100%;
}

.report-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.report-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
  border-color: #0284c7;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rds-badge {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 4px;
}

.date-badge {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}

.card-title {
  margin: 0 0 14px 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.card-details {
  background: rgba(241, 245, 249, 0.85);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
}

.detail-row .label {
  color: #475569;
  font-weight: 600;
}

.detail-row .value {
  color: #0f172a;
  font-weight: 700;
  text-align: right;
  max-width: 65%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
}

.card-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-del-report {
  padding: 6px 10px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  transition: all 0.2s ease;
}

.btn-del-report:hover {
  background: #dc2626;
  color: #ffffff;
}

.events-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f766e;
  background: #ccfbf1;
  padding: 4px 12px;
  border-radius: 12px;
}

.empty-state {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 40px 20px;
  text-align: center;
  color: #475569;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #cbd5e1;
  border-top-color: #0a3d62;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

/* Barra de Paginación */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 14px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.pagination-info {
  font-size: 0.88rem;
  color: #334155;
  font-weight: 500;
}

.pagination-info b {
  color: #0a3d62;
  font-weight: 800;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.limit-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84rem;
  font-weight: 600;
  color: #475569;
  margin-right: 6px;
}

.limit-selector select {
  padding: 5px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 700;
  color: #0a3d62;
  background: #ffffff;
  cursor: pointer;
  outline: none;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  font-size: 0.82rem;
  font-weight: 700;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #0f172a;
  cursor: pointer;
  outline: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.filter-select:focus {
  border-color: #0284c7;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pantallas Medianas / Celulares */
@media (max-width: 768px) {
  .home-container {
    padding: 12px 16px 40px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-actions {
    width: 100%;
  }

  .dashboard-actions .btn {
    flex: 1;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: 100%;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }
}
</style>