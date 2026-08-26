<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast-anim" tag="div" class="toast-list">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="`toast-${t.tipo}`"
      >
        <div class="toast-indicator"></div>
        <div class="toast-content">
          <span class="toast-text">{{ t.mensaje }}</span>
        </div>
        <button
          type="button"
          class="toast-close"
          @click="remove(t.id)"
          aria-label="Cerrar notificación"
        >
          &times;
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '../services/toast.js';

const { toasts, remove } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  max-width: 380px;
  width: calc(100% - 40px);
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  color: #1e293b;
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  position: relative;
}

.toast-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
}

.toast-success .toast-indicator {
  background: #10b981;
}

.toast-error .toast-indicator {
  background: #ef4444;
}

.toast-warning .toast-indicator {
  background: #f59e0b;
}

.toast-info .toast-indicator {
  background: #0984e3;
}

.toast-content {
  flex: 1;
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.35;
  color: #1e293b;
}

.toast-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.toast-close:hover {
  color: #334155;
}

/* Animaciones */
.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-anim-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

.toast-anim-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}
</style>
