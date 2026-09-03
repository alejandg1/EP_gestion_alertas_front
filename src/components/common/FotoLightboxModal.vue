<template>
  <div v-if="url" class="lightbox-backdrop" @click="$emit('cerrar')">
    <div class="lightbox-card" @click.stop>
      <button type="button" class="lightbox-close" @click="$emit('cerrar')" title="Cerrar">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <img :src="url" alt="Fotografía en alta resolución" class="lightbox-image" />
      <div class="lightbox-footer">
        <a :href="url" target="_blank" rel="noopener" class="btn btn-sm btn-outline-white">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir en pestaña nueva
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  url: {
    type: String,
    default: ''
  }
});

defineEmits(['cerrar']);
</script>

<style scoped>
.lightbox-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal, 1000);
  padding: 20px;
}

.lightbox-card {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: #0f172a;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.lightbox-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: #ffffff;
  font-size: 1.2rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s ease;
}

.lightbox-close:hover {
  background: rgba(220, 38, 38, 0.9);
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  display: block;
}

.lightbox-footer {
  padding: 10px 16px;
  background: #1e293b;
  display: flex;
  justify-content: flex-end;
}

.btn-outline-white {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
}

.btn-outline-white:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
