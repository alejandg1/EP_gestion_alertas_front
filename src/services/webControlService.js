let socket = null;
let pluginActivo = false;
let sessionUuid = null;

function generarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extractBase64Image(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed.startsWith('data:image') || trimmed.startsWith('/9j/') || trimmed.startsWith('iVBORw0KGgo')) {
      return trimmed;
    }
    if (trimmed.length > 500 && /^[A-Za-z0-9+/=\r\n\s]+$/.test(trimmed)) {
      return trimmed.replace(/[\r\n\s]+/g, '');
    }
  }
  if (typeof obj === 'object') {
    for (const key of ['picData', 'szPicData', 'picture', 'data', 'pic', 'base64', 'image', 'responseMsg']) {
      if (obj[key]) {
        const found = extractBase64Image(obj[key]);
        if (found) return found;
      }
    }
    for (const val of Object.values(obj)) {
      if (typeof val === 'object' || (typeof val === 'string' && val.length > 500)) {
        const found = extractBase64Image(val);
        if (found) return found;
      }
    }
  }
  return null;
}

export const webControlService = {
  /**
   * Intenta conectar con el servicio local HCVideoSDKWebControl en los puertos estándar (21000 a 21009)
   */
  async conectarServicio(puertoInicio = 21000, puertoFin = 21009) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return true;
    }

    sessionUuid = generarUUID();
    const urlsAProbar = [];

    for (let p = puertoInicio; p <= puertoFin; p++) {
      urlsAProbar.push(`ws://127.0.0.1:${p}`);
      urlsAProbar.push(`ws://localhost:${p}`);
    }
    urlsAProbar.push('wss://127.0.0.1:21002');
    urlsAProbar.push('ws://127.0.0.1:8000');
    urlsAProbar.push('ws://127.0.0.1:9000');

    for (const url of urlsAProbar) {
      try {
        const conectado = await new Promise((resolve) => {
          const ws = new WebSocket(url);
          const timer = setTimeout(() => {
            try { ws.close(); } catch { }
            resolve(null);
          }, 800);

          ws.onopen = () => {
            clearTimeout(timer);
            resolve(ws);
          };

          ws.onerror = () => {
            clearTimeout(timer);
            resolve(null);
          };
        });

        if (conectado) {
          socket = conectado;
          pluginActivo = true;
          this.configurarSocket(socket);
          console.log(`[WebControl] Conectado exitosamente al plugin HCVideoSDK en ${url}`);
          return true;
        }
      } catch {
        // Continuar a la siguiente URL
      }
    }

    pluginActivo = false;
    return false;
  },

  configurarSocket(ws) {
    ws.onmessage = (event) => {
      try {
        let raw = event.data;
        let data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        window.dispatchEvent(new CustomEvent('webcontrol-snapshot', { detail: data }));
      } catch (e) {
        if (typeof event.data === 'string' && event.data.length > 500) {
          window.dispatchEvent(new CustomEvent('webcontrol-snapshot', { detail: { picData: event.data } }));
        }
      }
    };

    ws.onclose = () => {
      pluginActivo = false;
      socket = null;
    };
  },

  async capturarSnapshot() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return null;
    }

    const comandos = [
      { funcName: 'SnapShot', argument: { snapShotType: 0, wndId: 0 } },
      { funcName: 'snapShot', argument: { snapShotType: 0, wndId: 0 } },
      { funcName: 'capturePic', argument: { snapShotType: 0, wndId: 0 } }
    ];

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('webcontrol-snapshot', handler);
        resolve(null);
      }, 3500);

      const handler = (e) => {
        const pic = extractBase64Image(e.detail);
        if (pic) {
          clearTimeout(timeout);
          window.removeEventListener('webcontrol-snapshot', handler);
          resolve(pic);
        }
      };

      window.addEventListener('webcontrol-snapshot', handler);

      try {
        for (const cmd of comandos) {
          socket.send(JSON.stringify({ uuid: sessionUuid, ...cmd }));
        }
      } catch (err) {
        clearTimeout(timeout);
        window.removeEventListener('webcontrol-snapshot', handler);
        resolve(null);
      }
    });
  },

  async inicializarContenedor(containerElement, camara) {
    const conectado = await this.conectarServicio();
    if (!conectado || !containerElement) {
      return false;
    }

    const rect = containerElement.getBoundingClientRect();
    const payload = {
      uuid: sessionUuid,
      funcName: 'initPlugin',
      argument: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left + window.scrollX),
        top: Math.round(rect.top + window.scrollY),
        appkey: 'SeguraEP',
        secret: 'SeguraEPSecret',
        ip: camara.ip || '127.0.0.1',
        port: 8000,
        enableHTTPS: 0
      }
    };

    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[WebControl] Error enviando initPlugin:', e);
      return false;
    }
  },

  async reproducirStream(camara) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const payload = {
      uuid: sessionUuid,
      funcName: 'startPreview',
      argument: {
        cameraIndexCode: String(camara.id),
        streamType: 0,
        protocol: 'RTSP',
        url: camara.rtsp || '',
        gpuMode: 1
      }
    };

    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[WebControl] Error enviando startPreview:', e);
      return false;
    }
  },

  actualizarPosicion(containerElement) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !containerElement) return;
    const rect = containerElement.getBoundingClientRect();
    const payload = {
      uuid: sessionUuid,
      funcName: 'resize',
      argument: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left + window.scrollX),
        top: Math.round(rect.top + window.scrollY)
      }
    };
    try {
      socket.send(JSON.stringify(payload));
    } catch { }
  },

  destruirPlugin() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          uuid: sessionUuid,
          funcName: 'destroyWnd'
        }));
      } catch { }
    }
  },

  ejecutarPluginLocal() {
    try {
      window.location.href = 'HCVideoSDKWebControl://';
    } catch { }
  }
};

export default webControlService;
