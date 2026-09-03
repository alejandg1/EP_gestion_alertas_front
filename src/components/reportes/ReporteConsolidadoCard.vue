<template>
  <div class="card section-reporte">
    <div class="card-header">
      <h2>4. Reporte Consolidado Oficial</h2>
    </div>

    <textarea
      :value="reporteConsolidadoTexto"
      rows="16"
      readonly
      class="consolidado-textarea"
    ></textarea>

    <div class="btn-row" style="margin-top: 10px;">
      <button type="button" class="btn btn-secondary btn-m" @click="$emit('copiar')">
        <i class="fa-solid fa-clipboard"></i> Copiar Reporte Consolidado
      </button>
      <button type="button" class="btn btn-success btn-m" @click="$emit('whatsapp')">
        <i class="fa-brands fa-whatsapp"></i> Abrir en WhatsApp
      </button>
      <button
        type="button"
        class="btn btn-primary btn-m"
        :disabled="descargandoWord"
        @click="$emit('generar-word')"
      >
        <i v-if="descargandoWord" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-file-word"></i>
        {{ descargandoWord ? 'Generando documento Word...' : 'Descargar Informe Word' }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  reporteConsolidadoTexto: {
    type: String,
    default: ''
  },
  descargandoWord: {
    type: Boolean,
    default: false
  }
});

defineEmits(['copiar', 'whatsapp', 'generar-word']);
</script>

<style scoped>
.section-reporte {
  position: relative;
}

.consolidado-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.84rem;
  line-height: 1.45;
  background-color: var(--bg-subtle);
  color: var(--text-main);
  resize: vertical;
}

.btn-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
