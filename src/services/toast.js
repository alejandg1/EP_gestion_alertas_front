import { ref } from 'vue';

const toasts = ref([]);
let nextId = 1;

export function useToast() {
  function add(tipo, mensaje, duracion = 3500) {
    const id = nextId++;
    toasts.value.push({
      id,
      tipo,
      mensaje
    });

    if (duracion > 0) {
      setTimeout(() => {
        remove(id);
      }, duracion);
    }
  }

  function remove(id) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  return {
    toasts,
    success: (msg, dur) => add('success', msg, dur),
    error: (msg, dur) => add('error', msg, dur || 4500),
    warning: (msg, dur) => add('warning', msg, dur),
    info: (msg, dur) => add('info', msg, dur),
    remove
  };
}

export const toast = useToast();
