// HomeView.vue

<template>
  <div class="home-wrapper">
    <div class="home-container">
      <Navbar @open-register="showModalRegister = true" />

      <div class="toolbar-panel">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            v-model="busqueda"
            placeholder="Buscar por código RDS, título o colaborador..."
            @input="onBusquedaInput"
          />
          <button v-if="busqueda" class="btn-clear" @click="limpiarBusqueda" title="Limpiar búsqueda">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="toolbar-metrics">
          <div class="metric-chip">
            <i class="fa-solid fa-clipboard-list metric-icon blue"></i>
            <span class="metric-text">Reportes:</span>
            <strong class="metric-num tabular-nums">{{ totalReportes }}</strong>
          </div>
          <div class="metric-chip">
            <i class="fa-solid fa-triangle-exclamation metric-icon teal"></i>
            <span class="metric-text">Novedades:</span>
            <strong class="metric-num tabular-nums">{{ totalNovedadesCount }}</strong>
          </div>
        </div>

        <div class="toolbar-controls">
          <!-- Selector de Vista (Cuadrícula / Tabla) -->
          <div class="view-switcher" role="group" aria-label="Modo de visualización">
            <button
              type="button"
              class="view-btn"
              :class="{ active: vistaModo === 'grid' }"
              @click="vistaModo = 'grid'"
              title="Vista de Fichas"
            >
              <i class="fa-solid fa-table-cells-large"></i>
              <span>Fichas</span>
            </button>
            <button
              type="button"
              class="view-btn"
              :class="{ active: vistaModo === 'table' }"
              @click="vistaModo = 'table'"
              title="Vista de Tabla Operativa"
            >
              <i class="fa-solid fa-table-list"></i>
              <span>Tabla</span>
            </button>
          </div>

          <button
            type="button"
            class="btn btn-outline btn-refresh"
            @click="cargarReportes"
            :disabled="loading"
            title="Recargar lista"
          >
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': loading }"></i>
          </button>
          <button
            type="button"
            class="btn-primary btn-sm"
            @click="crearNuevoReporte"
            :disabled="creandoReporte"
          >
            <i v-if="creandoReporte" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-plus"></i>
            {{ creandoReporte ? 'Creando Reporte...' : 'Nuevo Reporte' }}
          </button>
        </div>
      </div>

      <!-- ESTADO DE CARGA -->
      <div v-if="loading" class="state-card">
        <div class="spinner"></div>
        <p>Cargando reportes de la Sala Situacional...</p>
      </div>

      <!-- ESTADO VACÍO -->
      <div v-else-if="reportes.length === 0" class="state-card">
        <div class="empty-icon"><i class="fa-regular fa-folder-open"></i></div>
        <h3>No se encontraron reportes</h3>
        <p v-if="busqueda">No hay resultados que coincidan con "{{ busqueda }}"</p>
        <p v-else>No existen reportes RDS registrados en el sistema.</p>
      </div>

      <!-- VISTA 1: CUADRÍCULA DE FICHAS EJECUTIVAS -->
      <div v-else-if="vistaModo === 'grid'" class="reports-grid">
        <div
          v-for="rep in reportes"
          :key="rep._id"
          class="report-card"
          @click="abrirReporte(rep._id)"
        >
          <div class="card-head">
            <span class="rds-code">{{ rep.numero_rds || 'RDS SIN CÓDIGO' }}</span>
            <span class="date-tag"><i class="fa-regular fa-calendar"></i> {{ formatearFecha(rep.fecha_reporte) }}</span>
          </div>

          <h3 class="card-title" :title="rep.titulo">{{ rep.titulo }}</h3>

          <div class="card-meta-list">
            <div class="meta-item">
              <span class="meta-icon"><i class="fa-regular fa-clock"></i></span>
              <span class="meta-label">Corte:</span>
              <strong class="meta-val tabular-nums">{{ rep.hora_inicio || '00:00' }} - {{ rep.hora_fin || '23:59' }}</strong>
            </div>

            <div class="meta-item">
              <span class="meta-icon"><i class="fa-solid fa-user-pen"></i></span>
              <span class="meta-label">Elaborado:</span>
              <span class="meta-val ellipsis" :title="obtenerTextoColaboradores(rep)">{{ obtenerTextoColaboradores(rep) }}</span>
            </div>

            <div class="meta-item">
              <span class="meta-icon"><i class="fa-solid fa-user-check"></i></span>
              <span class="meta-label">Revisado:</span>
              <span class="meta-val ellipsis" :title="rep.revisado_por || 'Jefatura de Sala'">{{ rep.revisado_por || 'Jefatura de Sala' }}</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="badge-novedades">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <b>{{ (rep.novedades || []).length }}</b> novedades
            </span>

            <div class="card-actions" @click.stop>
              <button
                type="button"
                class="btn-icon-del"
                @click="eliminarReporte(rep)"
                title="Eliminar este reporte"
              >
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- VISTA 2: TABLA OPERATIVA DE ALTA DENSIDAD -->
      <div v-else class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th>Código RDS</th>
              <th>Fecha</th>
              <th>Horario de Corte</th>
              <th>Novedades</th>
              <th>Elaborado por</th>
              <th>Revisado por</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rep in reportes"
              :key="rep._id"
              class="table-row-clickable"
              @click="abrirReporte(rep._id)"
            >
              <td>
                <span class="table-rds">{{ rep.numero_rds || 'RDS SIN CÓDIGO' }}</span>
              </td>
              <td class="tabular-nums">{{ formatearFecha(rep.fecha_reporte) }}</td>
              <td class="tabular-nums">{{ rep.hora_inicio || '00:00' }} - {{ rep.hora_fin || '23:59' }}</td>
              <td>
                <span class="badge-novedades">
                  {{ (rep.novedades || []).length }}
                </span>
              </td>
              <td class="ellipsis-cell" :title="obtenerTextoColaboradores(rep)">{{ obtenerTextoColaboradores(rep) }}</td>
              <td class="ellipsis-cell" :title="rep.revisado_por || 'Jefatura de Sala'">{{ rep.revisado_por || 'Jefatura de Sala' }}</td>
              <td style="text-align: right;" @click.stop>
                <div class="table-actions">
                  <button
                    type="button"
                    class="btn btn-xs btn-danger"
                    @click="eliminarReporte(rep)"
                    title="Eliminar reporte"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BARRA DE PAGINACIÓN INSTITUCIONAL -->
      <div v-if="totalReportes > 0" class="pagination-bar">
        <div class="pagination-info">
          Mostrando página <b>{{ paginacion.page || page }}</b> de <b>{{ paginacion.totalPages || 1 }}</b> (Total: <b>{{ totalReportes }}</b> reportes)
        </div>

        <div class="pagination-controls">
          <div class="limit-selector">
            <label for="limit-select">Filas:</label>
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
            <i class="fa-solid fa-chevron-left"></i>
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
            <i class="fa-solid fa-chevron-right"></i>
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
const vistaModo = ref('grid'); // 'grid' o 'table'
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
      observaciones_generales: 'Monitoreo en tiempo real de lluvias y acumulación de agua.'
    };
    const nuevo = await reportesService.create(dataCreacion);
    const idCreado = nuevo?._id || nuevo?.reporte?._id;
    if (idCreado) {
      router.push(`/reportes/${idCreado}`);
    } else {
      throw new Error('No se recibió el ID del reporte creado');
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
  // Notificación o recarga si es necesario
}

onMounted(() => {
  cargarReportes();
});
</script>

<style scoped>
.home-wrapper {
  flex: 1;
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.home-container {
  width: 100%;
  margin: 0;
  padding: 16px 24px 24px;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Cabecera Principal */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  background: var(--bg-surface);
  padding: 14px 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.breadcrumb-sep {
  color: var(--border-strong);
}

.breadcrumb-current {
  color: var(--accent-blue);
}

.header-info h1 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--primary-navy);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.header-info p {
  margin: 2px 0 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.btn-create {
  padding: 8px 16px;
  font-size: 0.86rem;
  font-weight: 700;
}

/* Barra de Herramientas, Contadores y Búsqueda */
.toolbar-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  background: var(--bg-surface);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.search-box {
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
  max-width: 440px;
}

.toolbar-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.metric-chip {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
}

.metric-icon {
  font-size: 0.82rem;
}

.metric-icon.blue {
  color: var(--accent-blue);
}

.metric-icon.teal {
  color: #0d9488;
}

.metric-text {
  color: var(--text-muted);
  font-weight: 600;
}

.metric-num {
  color: var(--primary-navy);
  font-weight: 800;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-faint);
  font-size: 0.85rem;
}

.search-box input {
  width: 100%;
  padding: 8px 34px 8px 34px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.86rem;
  background: #ffffff;
  color: var(--text-main);
  box-sizing: border-box;
}

.search-box input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.btn-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Switcher de Vista */
.view-switcher {
  display: inline-flex;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 2px;
  background: var(--bg-subtle);
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 0.76rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-btn.active {
  background: #ffffff;
  color: var(--primary-navy);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-weight: 700;
}

.btn-refresh {
  padding: 6px 10px;
}

/* Estados */
.state-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 2.2rem;
  color: var(--text-faint);
  margin-bottom: 10px;
}

/* Grid de Fichas */
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 18px;
  width: 100%;
}

.report-card {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-blue);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.rds-code {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0369a1;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
  max-width: calc(100% - 100px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-tag {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  margin-left: auto;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--primary-navy);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta-list {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.meta-item {
  display: flex;
  align-items: center;
  font-size: 0.78rem;
  gap: 6px;
}

.meta-icon {
  color: var(--text-faint);
  font-size: 0.75rem;
  width: 14px;
}

.meta-label {
  color: var(--text-muted);
  font-weight: 600;
}

.meta-val {
  color: var(--text-main);
  font-weight: 600;
  margin-left: auto;
}

.ellipsis {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.badge-novedades {
  font-size: 0.76rem;
  font-weight: 700;
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  padding: 3px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon-del {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-faint);
  border-radius: var(--radius-sm);
  padding: 5px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon-del:hover {
  background: #fee2e2;
  color: var(--accent-red);
  border-color: #fecaca;
}

.btn-open-link {
  background: var(--bg-subtle);
  border: 1px solid var(--border-strong);
  color: var(--primary-navy);
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-open-link:hover {
  background: var(--accent-blue);
  color: #ffffff;
  border-color: var(--accent-blue);
}

/* Vista de Tabla Operativa */
.table-container {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  text-align: left;
}

.report-table th {
  background: var(--bg-subtle);
  padding: 12px 16px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}

.report-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-main);
  vertical-align: middle;
}

.table-row-clickable {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.table-row-clickable:hover {
  background-color: #f8fafc;
}

.table-rds {
  font-weight: 700;
  color: #0369a1;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.76rem;
}

.ellipsis-cell {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

/* Paginación */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 20px;
  background: var(--bg-surface);
  padding: 12px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.pagination-info {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.pagination-info b {
  color: var(--primary-navy);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.limit-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-right: 6px;
}

.limit-selector select {
  padding: 4px 8px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary-navy);
  background: #ffffff;
  cursor: pointer;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  font-size: 0.78rem;
}

@media (max-width: 768px) {
  .home-container {
    padding: 12px 14px 40px;
  }
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions .btn {
    width: 100%;
  }
  .toolbar-panel {
    flex-direction: column;
    align-items: stretch;
  }
  .search-box {
    max-width: 100%;
  }
  .toolbar-controls {
    justify-content: space-between;
  }
  .reports-grid {
    grid-template-columns: 1fr;
  }
}
</style>