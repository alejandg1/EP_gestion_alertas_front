<template>
  <div class="metricas-tiempos-card">
    <div class="metricas-header">
      <div class="header-left">
        <i class="fa-solid fa-chart-line-up"></i>
        <h3>Analítica Operativa y Tiempos de Respuesta</h3>
      </div>
      <div class="header-actions">
        <span class="live-pill"><i class="fa-solid fa-bolt"></i> En Tiempo Real</span>
        <button
          type="button"
          class="btn btn-sm btn-outline-refresh"
          @click="cargarMetricas"
          :disabled="cargando"
          title="Recalcular desde servidor"
        >
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': cargando }"></i>
        </button>
      </div>
    </div>

    <!-- Indicador de Carga Inicial si no hay datos -->
    <div v-if="cargando && !metricasCalculadas" class="loading-mini">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Calculando indicadores de respuesta y despacho...</span>
    </div>

    <div v-else-if="metricasCalculadas" class="metricas-content">
      <!-- Fila de Tarjetas KPI -->
      <div class="kpi-grid">
        <!-- Tiempo de Respuesta Promedio -->
        <div class="kpi-box">
          <span class="kpi-label">T. Respuesta Promedio</span>
          <div class="kpi-value-row">
            <strong class="kpi-value text-blue">
              {{ formatearMinutos(metricasCalculadas.tiempo_respuesta_promedio_minutos) }}
            </strong>
            <span class="kpi-unit" v-if="metricasCalculadas.tiempo_respuesta_promedio_minutos !== null">min</span>
          </div>
          <span class="kpi-sub">
            {{ metricasCalculadas.novedades_con_tiempo_respuesta || 0 }} de {{ metricasCalculadas.total_novedades || 0 }} en sitio
          </span>
        </div>

        <!-- Tiempo de Atención Promedio -->
        <div class="kpi-box">
          <span class="kpi-label">T. Atención Promedio</span>
          <div class="kpi-value-row">
            <strong class="kpi-value text-purple">
              {{ formatearMinutos(metricasCalculadas.tiempo_atencion_promedio_minutos) }}
            </strong>
            <span class="kpi-unit" v-if="metricasCalculadas.tiempo_atencion_promedio_minutos !== null">min</span>
          </div>
          <span class="kpi-sub">Desde llegada a sitio hasta solución</span>
        </div>

        <!-- Cumplimiento SLA (< 15 min) -->
        <div class="kpi-box">
          <span class="kpi-label">Cumplimiento SLA (&lt; 15m)</span>
          <div class="kpi-value-row">
            <strong class="kpi-value text-green">{{ metricasCalculadas.cumplimiento_sla_menor_15m || '0.0%' }}</strong>
          </div>
          <div class="sla-progress-bar">
            <div
              class="sla-progress-fill"
              :style="{ width: metricasCalculadas.cumplimiento_sla_menor_15m || '0%' }"
            ></div>
          </div>
        </div>

        <!-- Despliegue Operativo -->
        <div class="kpi-box">
          <span class="kpi-label">Despliegue Operativo</span>
          <div class="kpi-recursos-row">
            <span class="recurso-tag">
              <i class="fa-solid fa-truck"></i> {{ metricasCalculadas.total_recursos_desplegados || 0 }} unidades
            </span>
            <span class="personal-tag">
              <i class="fa-solid fa-person-digging"></i> ~{{ metricasCalculadas.total_personal_estimado || 0 }} pers.
            </span>
          </div>
          <span class="kpi-sub">{{ metricasCalculadas.total_novedades || 0 }} eventos registrados</span>
        </div>
      </div>

      <!-- Desglose por Institución -->
      <div v-if="metricasCalculadas.por_institucion && metricasCalculadas.por_institucion.length" class="instituciones-table-wrapper">
        <h4>Intervenciones y Despacho por Institución</h4>
        <div class="table-responsive">
          <table class="kpi-mini-table">
            <thead>
              <tr>
                <th>Institución</th>
                <th class="text-center">Eventos</th>
                <th class="text-center">Recursos</th>
                <th class="text-center">Personal Estimado</th>
                <th class="text-right">T. Resp. Promedio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inst in metricasCalculadas.por_institucion" :key="inst.institucion">
                <td>
                  <strong>{{ inst.institucion }}</strong>
                </td>
                <td class="text-center">{{ inst.intervenciones }}</td>
                <td class="text-center">{{ inst.recursos_desplegados }}</td>
                <td class="text-center">~{{ inst.personal_estimado }}</td>
                <td class="text-right font-semibold">
                  {{ inst.tiempo_respuesta_promedio_min !== null && inst.tiempo_respuesta_promedio_min !== undefined ? inst.tiempo_respuesta_promedio_min + ' min' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { reportesService } from '../../services/api.js';
import { INSTITUCIONES_CATALOGO } from '../../config/epocas.js';

const props = defineProps({
  reporteId: {
    type: [String, Number],
    default: ''
  },
  novedades: {
    type: Array,
    default: () => []
  }
});

const metricasBackend = ref(null);
const cargando = ref(false);

async function cargarMetricas() {
  if (!props.reporteId || props.reporteId === 'nuevo') return;

  cargando.value = true;
  try {
    const res = await reportesService.getMetricasTiempos(props.reporteId);
    if (res && res.ok && res.metricas) {
      metricasBackend.value = res.metricas;
    }
  } catch (err) {
    console.warn('Endpoint de métricas:', err.message);
  } finally {
    cargando.value = false;
  }
}

// Cálculo reactivo local y unificación con backend
const metricasCalculadas = computed(() => {
  const items = props.novedades || [];
  const backend = metricasBackend.value;

  // Si el backend ya devolvió métricas y no hay discrepancia importante, preferir backend
  if (backend && backend.total_novedades === items.length && items.length > 0) {
    return backend;
  }

  // Cálculo en vivo desde la lista local de novedades
  let totalNovedades = items.length;
  let conTiempoRespuesta = 0;
  let sumaTiempoRespuesta = 0;
  let conTiempoAtencion = 0;
  let sumaTiempoAtencion = 0;
  let respuestaMenor15m = 0;

  let totalRecursosGlobal = 0;
  let totalPersonalGlobal = 0;

  const porInst = {};

  items.forEach(nov => {
    // Tiempos
    const tResp = nov.tiempo_respuesta !== undefined ? nov.tiempo_respuesta : null;
    const tAtenc = nov.tiempo_atencion !== undefined ? nov.tiempo_atencion : null;

    if (tResp !== null && !isNaN(tResp)) {
      conTiempoRespuesta++;
      sumaTiempoRespuesta += Number(tResp);
      if (Number(tResp) <= 15) {
        respuestaMenor15m++;
      }
    }

    if (tAtenc !== null && !isNaN(tAtenc)) {
      conTiempoAtencion++;
      sumaTiempoAtencion += Number(tAtenc);
    }

    // Recursos y personal
    const extras = nov.datos_adicionales || {};
    const recursosObj = extras.recursos || {};
    const personalObj = extras.personal || {};

    let recursosEnNov = parseInt(extras.total_recursos, 10);
    let personalEnNov = parseInt(extras.total_personal, 10);

    // Si no tiene datos_adicionales pero tiene recurso_asignado o recursos manuales
    if (isNaN(recursosEnNov) || recursosEnNov === 0) {
      recursosEnNov = Object.values(recursosObj).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
      if (recursosEnNov === 0 && (nov.recurso_asignado || nov.recurso)) {
        recursosEnNov = 1;
      }
    }

    if (isNaN(personalEnNov) || personalEnNov === 0) {
      personalEnNov = recursosEnNov > 0 ? recursosEnNov * 3 : 0;
    }

    totalRecursosGlobal += recursosEnNov;
    totalPersonalGlobal += personalEnNov;

    // Desglose por institución
    INSTITUCIONES_CATALOGO.forEach(inst => {
      const cant = parseInt(recursosObj[inst.key_recurso] || recursosObj[inst.id] || 0, 10);
      if (cant > 0) {
        if (!porInst[inst.siglas]) {
          porInst[inst.siglas] = {
            institucion: inst.siglas,
            intervenciones: 0,
            recursos_desplegados: 0,
            personal_estimado: 0,
            sumaTiempo: 0,
            conTiempo: 0
          };
        }
        porInst[inst.siglas].intervenciones++;
        porInst[inst.siglas].recursos_desplegados += cant;
        const persManual = parseInt(personalObj[inst.key_personal], 10);
        porInst[inst.siglas].personal_estimado += (!isNaN(persManual) && persManual > 0) ? persManual : (cant * inst.multiplicador);

        if (tResp !== null && !isNaN(tResp)) {
          porInst[inst.siglas].sumaTiempo += Number(tResp);
          porInst[inst.siglas].conTiempo++;
        }
      }
    });
  });

  const promedioResp = conTiempoRespuesta > 0 ? Number((sumaTiempoRespuesta / conTiempoRespuesta).toFixed(1)) : null;
  const promedioAtenc = conTiempoAtencion > 0 ? Number((sumaTiempoAtencion / conTiempoAtencion).toFixed(1)) : null;
  const sla15 = conTiempoRespuesta > 0 ? `${((respuestaMenor15m / conTiempoRespuesta) * 100).toFixed(1)}%` : '0.0%';

  const institucionesLista = Object.values(porInst).map(item => ({
    ...item,
    tiempo_respuesta_promedio_min: item.conTiempo > 0 ? Number((item.sumaTiempo / item.conTiempo).toFixed(1)) : null
  }));

  return {
    total_novedades: totalNovedades,
    novedades_con_tiempo_respuesta: conTiempoRespuesta,
    tiempo_respuesta_promedio_minutos: promedioResp,
    tiempo_atencion_promedio_minutos: promedioAtenc,
    cumplimiento_sla_menor_15m: sla15,
    total_recursos_desplegados: totalRecursosGlobal,
    total_personal_estimado: totalPersonalGlobal,
    por_institucion: institucionesLista
  };
});

function formatearMinutos(num) {
  if (num === undefined || num === null || isNaN(num)) return '—';
  return Number(num).toFixed(1);
}

watch(() => props.reporteId, () => {
  cargarMetricas();
});

watch(() => props.novedades?.length, () => {
  cargarMetricas();
}, { deep: true });

onMounted(() => {
  cargarMetricas();
});

defineExpose({
  cargarMetricas
});
</script>

<style scoped>
.metricas-tiempos-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  margin-top: 14px;
}

.metricas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--border);
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-navy);
}

.header-left h3 {
  font-size: 1.02rem;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-pill {
  font-size: 0.68rem;
  font-weight: 700;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
}

.btn-outline-refresh {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-outline-refresh:hover {
  background: #f1f5f9;
  color: var(--accent-blue);
}

.loading-mini {
  padding: 20px;
  text-align: center;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.82rem;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.kpi-box {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-faint);
  letter-spacing: 0.04em;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.kpi-value {
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.1;
}

.kpi-unit {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-faint);
}

.kpi-sub {
  font-size: 0.68rem;
  color: var(--text-faint);
}

.text-blue { color: #0284c7; }
.text-purple { color: #7c3aed; }
.text-green { color: #16a34a; }

.sla-progress-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 4px;
}

.sla-progress-fill {
  height: 100%;
  background: #16a34a;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.kpi-recursos-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.recurso-tag, .personal-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.recurso-tag {
  background: #e0f2fe;
  color: #0369a1;
}

.personal-tag {
  background: #dcfce7;
  color: #166534;
}

.instituciones-table-wrapper {
  margin-top: 14px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.instituciones-table-wrapper h4 {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary-navy);
  margin-bottom: 8px;
}

.kpi-mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.kpi-mini-table th {
  background: #f1f5f9;
  padding: 6px 10px;
  font-size: 0.68rem;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.kpi-mini-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #e2e8f0;
}

.text-center { text-align: center; }
.text-right { text-align: right; }
.font-semibold { font-weight: 600; }
</style>
