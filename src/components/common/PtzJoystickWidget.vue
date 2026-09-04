<template>
  <div class="ptz-widget-container" :class="{ 'is-dragging': isDragging }">
    <!-- Base Circular del Joystick -->
    <div
      ref="joystickBaseRef"
      class="ptz-analog-base"
      @pointerdown="onPointerDown"
    >
      <!-- Guías ortogonales con flechas -->
      <div class="ptz-guide-cross">
        <i class="fa-solid fa-chevron-up guide-arrow arrow-n"></i>
        <i class="fa-solid fa-chevron-down guide-arrow arrow-s"></i>
        <i class="fa-solid fa-chevron-left guide-arrow arrow-w"></i>
        <i class="fa-solid fa-chevron-right guide-arrow arrow-e"></i>
      </div>

      <!-- Palanca móvil (Knob) -->
      <div
        class="ptz-analog-knob"
        :class="{ 'is-active': isDragging }"
        :style="knobStyle"
      >
        <div class="knob-dot"></div>
      </div>
    </div>

    <!-- Controles de Zoom: Clic = Paso exacto 5% / Mantener = Continuo -->
    <div class="ptz-zoom-group">
      <button
        type="button"
        class="btn-ptz-zoom"
        @pointerdown.prevent="onZoomPointerDown(+1)"
        @pointerup.prevent="onZoomPointerUp(+1)"
        @pointerleave.prevent="onZoomPointerLeave"
        title="Clic: Zoom In +5% exacto | Mantener: Zoom In continuo"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Zoom</span>
      </button>

      <button
        type="button"
        class="btn-ptz-zoom"
        @pointerdown.prevent="onZoomPointerDown(-1)"
        @pointerup.prevent="onZoomPointerUp(-1)"
        @pointerleave.prevent="onZoomPointerLeave"
        title="Clic: Zoom Out -5% exacto | Mantener: Zoom Out continuo"
      >
        <i class="fa-solid fa-minus"></i>
        <span>Zoom</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  cameraId: {
    type: [String, Number],
    required: true
  },
  joystickPos: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
});

const emit = defineEmits(['mover-vector', 'mover-zoom', 'mover-zoom-relativo', 'detener']);

const joystickBaseRef = ref(null);
const isDragging = ref(false);

const knobStyle = computed(() => {
  const maxRadiusPx = 44;
  const px = (props.joystickPos.x || 0) * maxRadiusPx;
  const py = -(props.joystickPos.y || 0) * maxRadiusPx; // Invertir eje Y para coordenadas CSS
  return {
    transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`
  };
});

function onPointerDown(e) {
  if (!joystickBaseRef.value) return;
  isDragging.value = true;
  joystickBaseRef.value.setPointerCapture(e.pointerId);

  actualizarDesdePointer(e);

  const onPointerMove = (ev) => {
    if (!isDragging.value) return;
    actualizarDesdePointer(ev);
  };

  const onPointerUp = (ev) => {
    isDragging.value = false;
    try {
      joystickBaseRef.value.releasePointerCapture(ev.pointerId);
    } catch (_) {}
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    emit('detener');
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function actualizarDesdePointer(e) {
  if (!joystickBaseRef.value) return;
  const rect = joystickBaseRef.value.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = e.clientX - centerX;
  const dy = e.clientY - centerY;

  const maxRadius = rect.width / 2;
  const distance = Math.sqrt(dx * dx + dy * dy);

  let normX = dx / maxRadius;
  let normY = -dy / maxRadius; // Arriba positivo

  if (distance > maxRadius) {
    normX = dx / distance;
    normY = -(dy / distance);
  }

  // Zona muerta mínima
  if (Math.abs(normX) < 0.08 && Math.abs(normY) < 0.08) {
    normX = 0;
    normY = 0;
  }

  emit('mover-vector', { x: normX, y: normY, z: 0 });
}

let zoomHoldTimer = null;
let zoomStartTime = 0;
let isHoldingZoom = false;

function onZoomPointerDown(factor) {
  zoomStartTime = Date.now();
  isHoldingZoom = false;

  // Si tras 220ms sigue presionado, se inicia zoom continuo
  zoomHoldTimer = setTimeout(() => {
    isHoldingZoom = true;
    emit('mover-zoom', factor);
  }, 220);
}

function onZoomPointerUp(factor) {
  const elapsed = Date.now() - zoomStartTime;
  if (zoomHoldTimer) {
    clearTimeout(zoomHoldTimer);
    zoomHoldTimer = null;
  }

  if (isHoldingZoom) {
    isHoldingZoom = false;
    emit('detener');
  } else if (elapsed < 220) {
    // Fue un clic corto -> Micro-paso relativo exacto (+0.06 / -0.06)
    emit('mover-zoom-relativo', factor * 0.06);
  }
}

function onZoomPointerLeave() {
  if (zoomHoldTimer) {
    clearTimeout(zoomHoldTimer);
    zoomHoldTimer = null;
  }
  if (isHoldingZoom) {
    isHoldingZoom = false;
    emit('detener');
  }
}
</script>

<style scoped>
.ptz-widget-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  user-select: none;
}

/* BASE CIRCULAR DEL JOYSTICK (ESTILO SOBRIO SEGUIRA EP) */
.ptz-analog-base {
  position: relative;
  width: 136px;
  height: 136px;
  border-radius: 50%;
  background: #0b1120;
  border: 1px solid #334155;
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.ptz-analog-base:active {
  cursor: grabbing;
  border-color: var(--accent-blue);
}

/* GUÍAS ORTOGONALES CON FLECHAS */
.ptz-guide-cross {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.guide-arrow {
  position: absolute;
  font-size: 0.76rem;
  color: #64748b;
  user-select: none;
}

.arrow-n { top: 8px; left: 50%; transform: translateX(-50%); }
.arrow-s { bottom: 8px; left: 50%; transform: translateX(-50%); }
.arrow-w { left: 10px; top: 50%; transform: translateY(-50%); }
.arrow-e { right: 10px; top: 50%; transform: translateY(-50%); }

/* PALANCA MÓVIL (KNOB MATE) */
.ptz-analog-knob {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-navy);
  border: 2px solid var(--accent-blue);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.05s ease-out;
}

.ptz-analog-knob.is-active {
  background: #1e3a5f;
  border-color: #38bdf8;
}

.knob-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  opacity: 0.95;
}

/* ZOOM BUTTONS */
.ptz-zoom-group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.btn-ptz-zoom {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #1e293b;
  border: 1px solid #334155;
  color: #f1f5f9;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
  touch-action: none;
}

.btn-ptz-zoom:hover {
  background: var(--accent-blue);
  color: #ffffff;
  border-color: var(--accent-blue);
}

.btn-ptz-zoom:active {
  background: #0369a1;
  transform: scale(0.96);
}
</style>
