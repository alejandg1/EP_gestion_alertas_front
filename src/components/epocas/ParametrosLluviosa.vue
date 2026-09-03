<template>
  <div class="card section-parametros">
    <div class="card-header-with-actions">
      <h2>2. Parametros del Reporte Consolidado</h2>
      <button
        type="button"
        class="btn btn-secondary btn-m"
        @click="$emit('guardar')"
        :disabled="guardando"
      >
        <i v-if="guardando" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-floppy-disk"></i>
        {{ guardando ? 'Guardando...' : 'Guardar Parámetros' }}
      </button>
    </div>

    <!-- Título del Reporte -->
    <div class="form-group">
      <label for="p_titulo">Titulo del Reporte:</label>
      <div class="locked-wrapper">
        <input
          id="p_titulo"
          type="text"
          v-model="modelValue.titulo"
          placeholder="Reporte de Novedades e Incidentes"
          :disabled="isFieldLocked('titulo')"
          :class="{ 'field-locked': isFieldLocked('titulo') }"
          @focus="$emit('field-focus', 'titulo')"
          @blur="$emit('field-blur', 'titulo', modelValue.titulo)"
        />
        <span v-if="isFieldLocked('titulo')" class="lock-tag">
          <i class="fa-solid fa-lock"></i> [En edición por: {{ getLockedBy('titulo') }}]
        </span>
      </div>
    </div>

    <!-- Número de Reporte RDS -->
    <div class="form-group">
      <label for="p_rds">Numero de Reporte RDS:</label>
      <div class="locked-wrapper">
        <input
          id="p_rds"
          type="text"
          v-model="modelValue.numero_rds"
          :disabled="isFieldLocked('numero_rds')"
          :class="{ 'field-locked': isFieldLocked('numero_rds') }"
          @focus="$emit('field-focus', 'numero_rds')"
          @blur="$emit('field-blur', 'numero_rds', modelValue.numero_rds)"
        />
        <span v-if="isFieldLocked('numero_rds')" class="lock-tag">
          [En edicion por: {{ getLockedBy('numero_rds') }}]
        </span>
      </div>
    </div>

    <!-- Fecha y Horarios -->
    <div class="grid-3">
      <div class="form-group">
        <label for="p_fecha">Fecha del Reporte:</label>
        <div class="locked-wrapper">
          <input
            id="p_fecha"
            type="date"
            v-model="modelValue.fecha_reporte"
            :disabled="isFieldLocked('fecha_reporte')"
            :class="{ 'field-locked': isFieldLocked('fecha_reporte') }"
            @focus="$emit('field-focus', 'fecha_reporte')"
            @blur="$emit('field-blur', 'fecha_reporte', modelValue.fecha_reporte)"
          />
          <span v-if="isFieldLocked('fecha_reporte')" class="lock-tag">
            [En edicion por: {{ getLockedBy('fecha_reporte') }}]
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="p_inicio">Hora Inicial:</label>
        <div class="locked-wrapper">
          <input
            id="p_inicio"
            type="time"
            v-model="modelValue.hora_inicio"
            :disabled="isFieldLocked('hora_inicio')"
            :class="{ 'field-locked': isFieldLocked('hora_inicio') }"
            @focus="$emit('field-focus', 'hora_inicio')"
            @blur="$emit('field-blur', 'hora_inicio', modelValue.hora_inicio)"
          />
          <span v-if="isFieldLocked('hora_inicio')" class="lock-tag">
            [En edicion por: {{ getLockedBy('hora_inicio') }}]
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="p_fin">Hora de Corte:</label>
        <div class="locked-wrapper">
          <input
            id="p_fin"
            type="time"
            v-model="modelValue.hora_fin"
            :disabled="isFieldLocked('hora_fin')"
            :class="{ 'field-locked': isFieldLocked('hora_fin') }"
            @focus="$emit('field-focus', 'hora_fin')"
            @blur="$emit('field-blur', 'hora_fin', modelValue.hora_fin)"
          />
          <span v-if="isFieldLocked('hora_fin')" class="lock-tag">
            [En edicion por: {{ getLockedBy('hora_fin') }}]
          </span>
        </div>
      </div>
    </div>

    <!-- Elaborado y Revisado -->
    <div class="grid-2">
      <div class="form-group">
        <label for="p_elaborado">Elaborado por:</label>
        <input
          id="p_elaborado"
          type="text"
          :value="modelValue.elaborado_por || ''"
          readonly
          placeholder="Se actualiza automaticamente con los colaboradores"
          class="input-readonly"
        />
      </div>

      <div class="form-group">
        <label for="p_revisado">Revisado por:</label>
        <div class="locked-wrapper">
          <input
            id="p_revisado"
            type="text"
            v-model="modelValue.revisado_por"
            :disabled="isFieldLocked('revisado_por')"
            :class="{ 'field-locked': isFieldLocked('revisado_por') }"
            @focus="$emit('field-focus', 'revisado_por')"
            @blur="$emit('field-blur', 'revisado_por', modelValue.revisado_por)"
          />
          <span v-if="isFieldLocked('revisado_por')" class="lock-tag">
            [En edicion por: {{ getLockedBy('revisado_por') }}]
          </span>
        </div>
      </div>
    </div>

    <!-- Cabecera Institucional y Periodo -->
    <div class="form-group">
      <label for="p_cabecera">Encabezado y Hora Inicial:</label>
      <div class="locked-wrapper">
        <input
          id="p_cabecera"
          type="text"
          v-model="modelValue.cabecera"
          :disabled="isFieldLocked('cabecera')"
          :class="{ 'field-locked': isFieldLocked('cabecera') }"
          @focus="$emit('field-focus', 'cabecera')"
          @blur="$emit('field-blur', 'cabecera', modelValue.cabecera)"
        />
        <span v-if="isFieldLocked('cabecera')" class="lock-tag">
          [En edicion por: {{ getLockedBy('cabecera') }}]
        </span>
      </div>
    </div>

    <div class="form-group">
      <label for="p_periodo">Periodo del Reporte:</label>
      <div class="locked-wrapper">
        <input
          id="p_periodo"
          type="text"
          v-model="modelValue.periodo"
          :disabled="isFieldLocked('periodo')"
          :class="{ 'field-locked': isFieldLocked('periodo') }"
          @focus="$emit('field-focus', 'periodo')"
          @blur="$emit('field-blur', 'periodo', modelValue.periodo)"
        />
        <span v-if="isFieldLocked('periodo')" class="lock-tag">
          [En edicion por: {{ getLockedBy('periodo') }}]
        </span>
      </div>
    </div>

    <!-- Campos de INOCAR -->
    <div class="grid-3">
      <div class="form-group">
        <label for="p_inocar_f">Fecha INOCAR:</label>
        <div class="locked-wrapper">
          <input
            id="p_inocar_f"
            type="text"
            v-model="modelValue.inocar_fecha"
            :disabled="isFieldLocked('inocar_fecha')"
            :class="{ 'field-locked': isFieldLocked('inocar_fecha') }"
            @focus="$emit('field-focus', 'inocar_fecha')"
            @blur="$emit('field-blur', 'inocar_fecha', modelValue.inocar_fecha)"
          />
          <span v-if="isFieldLocked('inocar_fecha')" class="lock-tag">
            [En edicion por: {{ getLockedBy('inocar_fecha') }}]
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="p_pleamar">Pleamar (Marea Alta):</label>
        <div class="locked-wrapper">
          <input
            id="p_pleamar"
            type="text"
            v-model="modelValue.inocar_pleamar"
            :disabled="isFieldLocked('inocar_pleamar')"
            :class="{ 'field-locked': isFieldLocked('inocar_pleamar') }"
            @focus="$emit('field-focus', 'inocar_pleamar')"
            @blur="$emit('field-blur', 'inocar_pleamar', modelValue.inocar_pleamar)"
          />
          <span v-if="isFieldLocked('inocar_pleamar')" class="lock-tag">
            [En edicion por: {{ getLockedBy('inocar_pleamar') }}]
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="p_bajamar">Bajamar (Marea Baja):</label>
        <div class="locked-wrapper">
          <input
            id="p_bajamar"
            type="text"
            v-model="modelValue.inocar_bajamar"
            :disabled="isFieldLocked('inocar_bajamar')"
            :class="{ 'field-locked': isFieldLocked('inocar_bajamar') }"
            @focus="$emit('field-focus', 'inocar_bajamar')"
            @blur="$emit('field-blur', 'inocar_bajamar', modelValue.inocar_bajamar)"
          />
          <span v-if="isFieldLocked('inocar_bajamar')" class="lock-tag">
            [En edicion por: {{ getLockedBy('inocar_bajamar') }}]
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  guardando: {
    type: Boolean,
    default: false
  },
  bloqueos: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits([
  'update:modelValue',
  'guardar',
  'field-focus',
  'field-blur'
]);

function isFieldLocked(fieldName) {
  return !!props.bloqueos[fieldName];
}

function getLockedBy(fieldName) {
  return props.bloqueos[fieldName]?.nombre || props.bloqueos[fieldName]?.correo || 'Otro operador';
}
</script>

<style scoped>
.section-parametros {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  border-bottom: 2px solid var(--border);
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.card-header-with-actions h2 {
  font-size: 1.02rem;
  margin: 0;
  color: var(--primary-navy);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.locked-wrapper {
  position: relative;
}

.field-locked {
  background-color: #fef2f2 !important;
  border-color: #f87171 !important;
  cursor: not-allowed;
}

.lock-tag {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-red);
}

.input-readonly {
  background-color: #f8fafc;
  color: var(--text-muted);
  cursor: default;
}
</style>
