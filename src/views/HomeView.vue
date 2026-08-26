<template>
  <div class="home-container">
    <Navbar @open-register="showModalRegister = true" />

    <div class="dashboard-header">
      <div class="dashboard-title">
        <h2>Reportes de Sala Situacional</h2>
        <p>Monitoreo y consolidacion de novedades e incidentes en tiempo real</p>
      </div>

      <div class="dashboard-actions">
        <button type="button" class="btn btn-outline" @click="showModalRegister = true">
          Registrar Operador
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="crearNuevoReporte"
          :disabled="creandoReporte"
        >
          {{ creandoReporte ? 'Creando Reporte...' : '+ Crear Nuevo Reporte' }}
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
        />
        <button v-if="busqueda" class="btn-clear" @click="busqueda = ''">X</button>
      </div>

      <div class="stats-group">
        <span class="stat-pill">
          Total Reportes: <b>{{ reportes.length }}</b>
        </span>
        <span class="stat-pill">
          Total Novedades: <b>{{ totalNovedadesCount }}</b>
        </span>
        <button class="btn btn-sm btn-secondary" @click="cargarReportes" :disabled="loading" title="Recargar lista">
          {{ loading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <!-- Estado de Carga / Vacio -->
    <div v-if="loading" class="empty-state">
      <div class="spinner"></div>
      <p>Cargando reportes de la Sala Situacional...</p>
    </div>

    <div v-else-if="reportesFiltrados.length === 0" class="empty-state">
      <h3>No se encontraron reportes</h3>
      <p v-if="busqueda">No hay resultados que coincidan con "{{ busqueda }}"</p>
    </div>

    <!-- Grid de Reportes (Los mas recientes primero) -->
    <div v-else class="reports-grid">
      <div
        v-for="rep in reportesFiltrados"
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
            {{ (rep.novedades || []).length }} Novedades
          </span>
          <button type="button" class="btn btn-sm btn-primary" @click.stop="abrirReporte(rep._id)">
            Abrir Sala ->
          </button>
        </div>
      </div>
    </div>

    <!-- Modales -->
    <ModalRegister v-model="showModalRegister" @registered="onOperadorRegistrado" />
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

const showModalRegister = ref(false);

async function crearNuevoReporte() {
  creandoReporte.value = true;
  try {
    const usuario = authService.getUsuarioSesion();
    const creadorNombre = usuario?.nombre || usuario?.correo || '';
    const fechaHoy = obtenerFechaActualISO();
    const horaHoy = obtenerHoraActual();
    const pronosticoHoy = calcularPronosticoInocar(fechaHoy);
    const dataCreacion = {
      titulo: 'Reporte de Novedades e Incidentes - Sala Situacional',
      numero_rds: `SEGURA-EP-GASGEC-SS-${new Date().getFullYear()}-${String(reportes.value.length + 1).padStart(3, '0')}`,
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

// Ordenar los mas recientes primero
const reportesOrdenados = computed(() => {
  return [...reportes.value].sort((a, b) => {
    const fechaA = new Date(a.createdAt || a.fecha_reporte || 0).getTime();
    const fechaB = new Date(b.createdAt || b.fecha_reporte || 0).getTime();
    return fechaB - fechaA;
  });
});

const reportesFiltrados = computed(() => {
  if (!busqueda.value.trim()) return reportesOrdenados.value;
  const q = busqueda.value.toLowerCase();
  return reportesOrdenados.value.filter(r =>
    (r.titulo && r.titulo.toLowerCase().includes(q)) ||
    (r.numero_rds && r.numero_rds.toLowerCase().includes(q)) ||
    (r.elaborado_por && r.elaborado_por.toLowerCase().includes(q)) ||
    (r.fecha_reporte && r.fecha_reporte.includes(q))
  );
});

async function cargarReportes() {
  loading.value = true;
  try {
    const data = await reportesService.getAll();
    reportes.value = Array.isArray(data) ? data : [];
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
.home-container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 10px 40px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  background: #ffffff;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.dashboard-title h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #0a3d62;
  font-weight: 700;
}

.dashboard-title p {
  margin: 4px 0 0 0;
  font-size: 0.82rem;
  color: #64748b;
}

.dashboard-actions {
  display: flex;
  gap: 10px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 22px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 280px;
  max-width: 480px;
}

.search-box input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.86rem;
  background: #ffffff;
}

.btn-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-weight: 700;
  padding: 4px;
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-pill {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #475569;
}

.stat-pill b {
  color: #0a3d62;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 18px;
}

.report-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(10, 61, 98, 0.1);
  border-color: #0984e3;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.rds-badge {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.date-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.35;
}

.card-details {
  background: #f8fafc;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.76rem;
  line-height: 1.3;
}

.detail-row .label {
  color: #64748b;
  font-weight: 600;
}

.detail-row .value {
  color: #1e293b;
  font-weight: 700;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.events-badge {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f766e;
  background: #ccfbf1;
  padding: 3px 8px;
  border-radius: 12px;
}

.empty-state {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}

.empty-state h3 {
  color: #0a3d62;
  margin-bottom: 8px;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
