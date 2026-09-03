<template>
  <div class="recursos-personal-container">
    <div class="rp-header">
      <div class="rp-title-group">
        <div class="rp-title">
          <span>Recursos y Personal Despachados</span>
        </div>
        <button
          type="button"
          class="btn-toggle-filter"
          @click="mostrarTodas = !mostrarTodas"
          :title="mostrarTodas ? 'Mostrar solo entidades notificadas' : 'Mostrar todas las entidades del catálogo'"
        >
          <i :class="mostrarTodas ? 'fa-solid fa-filter' : 'fa-solid fa-layer-group'"></i>
          {{ mostrarTodas ? 'Solo Notificadas' : 'Ver Todas las Entidades' }}
        </button>
      </div>

      <div class="rp-summary-badge">
        <span><strong>{{ totalRecursos }}</strong> unid. / <strong>{{ totalPersonal }}</strong> pers.</span>
      </div>
    </div>

    <!-- Si no hay entidades notificadas y no se fuerza ver todas -->
    <div v-if="!institucionesAMostrar.length" class="empty-inst-hint">
      <i class="fa-solid fa-info-circle"></i>
      <span>Ingrese entidades en "Instituciones Notificadas" (ej: <code>@emapagye @interagua</code>) para habilitar sus recursos.</span>
    </div>

    <!-- Cuadrícula de Instituciones Filtradas -->
    <div v-else class="instituciones-grid">
      <div
        v-for="inst in institucionesAMostrar"
        :key="inst.id"
        class="inst-card"
        :class="{ active: (recursos[inst.key_recurso] || recursos[inst.id] || 0) > 0 }"
      >
        <div class="inst-info">
          <i :class="'fa-solid ' + inst.icon"></i>
          <strong>{{ inst.siglas }}</strong>
        </div>

        <div class="inst-inputs">
          <div class="input-field-mini">
            <label>Recursos:</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              :value="recursos[inst.key_recurso] !== undefined ? recursos[inst.key_recurso] : (recursos[inst.id] !== undefined ? recursos[inst.id] : '')"
              @input="onRecursoChange(inst, $event.target.value)"
            />
          </div>

          <div class="input-field-mini">
            <label>Personal:</label>
            <input
              type="number"
              min="0"
              :placeholder="getPlaceholderPersonal(inst)"
              :value="personal[inst.key_personal] !== undefined ? personal[inst.key_personal] : (personal['#_' + inst.id] !== undefined ? personal['#_' + inst.id] : (personal[inst.id] || ''))"
              @input="onPersonalChange(inst, $event.target.value)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { INSTITUCIONES_CATALOGO, filtrarInstitucionesNotificadas } from '../../config/epocas.js';

const props = defineProps({
  recursos: {
    type: Object,
    default: () => ({})
  },
  personal: {
    type: Object,
    default: () => ({})
  },
  institucionesTexto: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:recursos', 'update:personal']);

const mostrarTodas = ref(false);
const catalogoCompleto = INSTITUCIONES_CATALOGO;

const institucionesAMostrar = computed(() => {
  if (mostrarTodas.value) {
    return catalogoCompleto;
  }

  // Si hay texto de instituciones (ej: "@emapagye @interagua")
  if (props.institucionesTexto && props.institucionesTexto.trim().length > 0) {
    const detectadas = filtrarInstitucionesNotificadas(props.institucionesTexto);
    const idsDetectadas = new Set(detectadas.map(i => i.id));

    // También incluir aquellas que ya tengan recursos o personal asignado > 0
    const conValores = catalogoCompleto.filter(i => {
      const cantRec = parseInt(props.recursos[i.key_recurso] || 0, 10);
      const cantPers = parseInt(props.personal[i.key_personal] || 0, 10);
      return cantRec > 0 || cantPers > 0;
    });

    conValores.forEach(i => idsDetectadas.add(i.id));

    const resultado = catalogoCompleto.filter(i => idsDetectadas.has(i.id));
    if (resultado.length > 0) {
      return resultado;
    }
  }

  // Si no se detectaron o no hay texto, retornar catálogo completo
  return catalogoCompleto;
});

function getPlaceholderPersonal(inst) {
  const cant = parseInt(props.recursos[inst.key_recurso] || 0, 10);
  if (cant > 0) {
    return `${cant * inst.multiplicador} (auto)`;
  }
  return '0';
}

function onRecursoChange(inst, val) {
  const num = parseInt(val, 10);
  const newRecursos = { ...props.recursos };
  const newPersonal = { ...props.personal };

  if (isNaN(num) || num <= 0) {
    delete newRecursos[inst.key_recurso];
    if (!props.personal[inst.key_personal]) {
      delete newPersonal[inst.key_personal];
    }
  } else {
    newRecursos[inst.key_recurso] = num;
  }

  emit('update:recursos', newRecursos);
  emit('update:personal', newPersonal);
}

function onPersonalChange(inst, val) {
  const num = parseInt(val, 10);
  const newPersonal = { ...props.personal };

  if (isNaN(num) || num <= 0) {
    delete newPersonal[inst.key_personal];
  } else {
    newPersonal[inst.key_personal] = num;
  }

  emit('update:personal', newPersonal);
}

const totalRecursos = computed(() => {
  return Object.values(props.recursos || {}).reduce((acc, val) => acc + (parseInt(val, 10) || 0), 0);
});

const totalPersonal = computed(() => {
  let total = 0;
  catalogoCompleto.forEach(inst => {
    const manual = parseInt(props.personal[inst.key_personal], 10);
    if (!isNaN(manual) && manual > 0) {
      total += manual;
    } else {
      const rec = parseInt(props.recursos[inst.key_recurso] || 0, 10);
      if (rec > 0) {
        total += rec * inst.multiplicador;
      }
    }
  });
  return total;
});
</script>

<style scoped>
.recursos-personal-container {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
}

.rp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.rp-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--primary-navy);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.btn-toggle-filter {
  background: #ffffff;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.btn-toggle-filter:hover {
  background: #e0f2fe;
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.rp-summary-badge {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  border: 1px solid #bae6fd;
}

.empty-inst-hint {
  padding: 12px;
  background: #ffffff;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-faint);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-inst-hint code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  color: #0369a1;
  font-weight: 600;
}

.instituciones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.inst-card {
  background: #ffffff;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.15s ease;
}

.inst-card.active {
  border-color: var(--accent-blue);
  background: #f0f9ff;
  box-shadow: 0 0 0 1px var(--accent-blue);
}

.inst-info {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--primary-navy);
}

.mult-hint {
  font-size: 0.62rem;
  color: var(--text-faint);
}

.inst-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.input-field-mini label {
  display: block;
  font-size: 0.65rem;
  margin: 0 0 2px 0;
  color: var(--text-muted);
}

.input-field-mini input {
  padding: 4px 6px;
  font-size: 0.75rem;
  text-align: center;
}
</style>
