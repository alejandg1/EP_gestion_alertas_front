import { ref } from 'vue';

const PTZ_BASE_URL = import.meta.env.VITE_PTZ_API_URL || 'https://ai.telconet.net';
const PTZ_AUTH_TOKEN = import.meta.env.VITE_PTZ_AUTH_TOKEN || '152062468673f06bb57f1ed7a55e73ff64689837';

function buildPtzHeaders() {
  const headers = {};
  if (PTZ_AUTH_TOKEN) {
    headers['Authorization'] = `Token ${PTZ_AUTH_TOKEN}`;
  }
  return headers;
}

export function usePtzControl() {
  let moveInterval = null;
  let lastSendTs = 0;
  let requestInFlight = false;
  let pendingCmd = null;
  const SEND_THROTTLE_MS = 250;

  const ptzActivo = ref(true);
  const direccionActual = ref(null);
  const joystickPos = ref({ x: 0, y: 0 });

  async function inicializarPtz(cameraId) {
    if (!cameraId) return;
    const initUrl = `${PTZ_BASE_URL}/api/v1/cameras/${cameraId}/init_ptz/?action=init`;
    try {
      await fetch(initUrl, {
        method: 'GET',
        headers: buildPtzHeaders(),
        mode: 'cors'
      });
      ptzActivo.value = true;
    } catch (e) {
      // Handshake silencioso
    }
  }

  async function ejecutarEnvio(cameraId, x, y, z, moveType) {
    if (!cameraId) return;
    if (requestInFlight) {
      pendingCmd = { cameraId, x, y, z, moveType };
      return;
    }

    requestInFlight = true;
    const url = `${PTZ_BASE_URL}/api/v1/cameras/${cameraId}/control/`;
    const params = new URLSearchParams({
      options: JSON.stringify({
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
        z: Number(z.toFixed(3))
      }),
      ts: Date.now(),
      'move-type': moveType
    });

    try {
      await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: buildPtzHeaders(),
        mode: 'cors'
      });
    } catch (e) {
      // Silenciar descarte de paquetes por red
    } finally {
      requestInFlight = false;
      if (pendingCmd) {
        const next = pendingCmd;
        pendingCmd = null;
        ejecutarEnvio(next.cameraId, next.x, next.y, next.z, next.moveType);
      }
    }
  }

  function apiSendContinuous(cameraId, x, y, z) {
    ejecutarEnvio(cameraId, x, y, z, 'continuous');
  }

  function apiSendRelative(cameraId, x, y, z) {
    ejecutarEnvio(cameraId, x, y, z, 'relative');
  }

  async function apiSendStop(cameraId) {
    if (!cameraId) return;
    pendingCmd = null;
    requestInFlight = false;
    const url = `${PTZ_BASE_URL}/api/v1/cameras/${cameraId}/control/`;
    const params = new URLSearchParams({
      options: JSON.stringify({ x: 0, y: 0, z: 0 }),
      ts: Date.now(),
      'move-type': 'continuous'
    });

    try {
      await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: buildPtzHeaders(),
        mode: 'cors'
      });
    } catch (e) {
      // Silenciar stop
    }
  }

  function moverJoystickVector(cameraId, normX, normY, normZ = 0) {
    if (!cameraId) return;

    joystickPos.value = { x: normX, y: normY };
    const isMoving = Math.abs(normX) > 0.05 || Math.abs(normY) > 0.05 || Math.abs(normZ) > 0.05;

    if (isMoving) {
      direccionActual.value = `(${normX.toFixed(2)}, ${normY.toFixed(2)})`;
      const now = Date.now();
      if (now - lastSendTs >= SEND_THROTTLE_MS) {
        apiSendContinuous(cameraId, normX, normY, normZ);
        lastSendTs = now;
      }

      if (!moveInterval) {
        moveInterval = setInterval(() => {
          if (Math.abs(joystickPos.value.x) > 0.05 || Math.abs(joystickPos.value.y) > 0.05) {
            apiSendContinuous(cameraId, joystickPos.value.x, joystickPos.value.y, 0);
          }
        }, SEND_THROTTLE_MS);
      }
    } else {
      detenerMovimiento(cameraId);
    }
  }

  function moverZoom(cameraId, zFactor) {
    if (!cameraId) return;
    detenerMovimiento(cameraId);

    const velZoom = zFactor > 0 ? 0.6 : -0.6;
    apiSendContinuous(cameraId, 0, 0, velZoom);

    moveInterval = setInterval(() => {
      apiSendContinuous(cameraId, 0, 0, velZoom);
    }, SEND_THROTTLE_MS);
  }

  /**
   * Paso exacto relativo de Zoom (ej: delta = +0.06 o -0.06)
   */
  function moverZoomRelativo(cameraId, zDelta) {
    if (!cameraId) return;
    detenerMovimiento(cameraId);
    apiSendRelative(cameraId, 0, 0, zDelta);
  }

  async function detenerMovimiento(cameraId) {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    lastSendTs = 0;
    pendingCmd = null;
    joystickPos.value = { x: 0, y: 0 };
    direccionActual.value = null;

    if (cameraId) {
      await apiSendStop(cameraId);
    }
  }

  return {
    ptzActivo,
    direccionActual,
    joystickPos,
    inicializarPtz,
    moverJoystickVector,
    moverZoom,
    moverZoomRelativo,
    detenerMovimiento
  };
}
