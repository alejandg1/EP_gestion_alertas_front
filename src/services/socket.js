import { io } from 'socket.io-client';
import { ref } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://10.10.80.70:3090';

let socketInstance = null;
export const isSocketConnected = ref(false);
export const activeLocks = ref({});

export function getSocket() {
  if (!socketInstance) {
    initSocket();
  }
  return socketInstance;
}

export function initSocket() {
  const token = localStorage.getItem('segura_jwt_token') || '';

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(API_BASE_URL, {
    auth: {
      token
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socketInstance.on('connect', () => {
    isSocketConnected.value = true;
  });

  socketInstance.on('disconnect', () => {
    isSocketConnected.value = false;
  });

  socketInstance.on('connect_error', (err) => {
    isSocketConnected.value = false;
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    isSocketConnected.value = false;
  }
}
