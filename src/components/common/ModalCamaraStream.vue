<template>
  <Teleport to="body">
    <!-- MODO MODAL PRINCIPAL (AMPLIO O PANTALLA COMPLETA) -->
    <div
      v-if="modelValue && camara && !isMini"
      class="cam-modal-backdrop"
      :class="{ 'is-backdrop-fullscreen': isFullScreen }"
      @click.self="!isFullScreen && cerrar()"
    >
      <div
        class="cam-card cam-card-modal"
        :class="{ 'is-fullscreen': isFullScreen }"
        ref="modalCardRef"
      >
        <!-- CABECERA INSTITUCIONAL -->
        <div class="cam-header">
          <div class="cam-header-title">
            <i class="fa-solid fa-video cam-head-icon"></i>
            <span class="cam-title-text">{{ camara.nombre || `Cámara #${camara.id}` }}</span>
          </div>

          <div class="cam-header-actions">
            <!-- SELECTOR / INDICADOR DE NOVEDAD DESTINO -->

            <!-- BOTÓN CAPTURAR FOTOGRAMA LIMPIO -->
            <button
              type="button"
              class="btn-head-capture"
              @click="capturarFrame"
              :disabled="capturando"
              title="Capturar fotograma limpio de la cámara y adjuntarlo como evidencia"
            >
              <i v-if="capturando" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-camera"></i>
              <span>{{ capturando ? 'Capturando...' : 'Capturar Frame' }}</span>
            </button>

            <!-- BOTÓN PANTALLA COMPLETA -->
            <button
              type="button"
              class="btn-icon-head"
              @click="toggleFullScreen"
              :title="isFullScreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa (F)'"
            >
              <i :class="isFullScreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
            </button>

            <!-- BOTÓN VENTANA MINI -->
            <button
              v-if="!isFullScreen"
              type="button"
              class="btn-icon-head"
              @click="toggleMini"
              title="Minimizar a ventana flotante en la esquina"
            >
              <i class="fa-solid fa-window-minimize"></i>
            </button>

            <!-- BOTÓN CERRAR -->
            <button
              type="button"
              class="btn-icon-head btn-icon-close"
              @click="cerrar"
              title="Cerrar visor"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- CUERPO PRINCIPAL -->
        <div class="cam-body" :class="{ 'cam-body-fullscreen': isFullScreen }">
          <!-- PANTALLA DE STREAMING (WEBCONTROL / WEB) -->
          <div
            id="playWnd"
            class="cam-player-box"
            :class="{ 'cam-player-fullscreen': isFullScreen }"
            ref="playerBoxRef"
          >
            <!-- Si hay iframe / stream web nativo -->
            <iframe
              v-if="camara.url_streaming && camara.url_streaming.startsWith('http')"
              :src="camara.url_streaming"
              class="cam-iframe"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowfullscreen
            ></iframe>

            <!-- Renderizador de flujo WebControl / Canvas -->
            <div v-else class="cam-stream-canvas">
              <div class="stream-top-bar">
                <div v-if="webControlConectado" class="stream-status-pill status-plugin">
                  <span class="status-dot"></span>
                  <span>PLUGIN WEBCONTROL CONECTADO</span>
                </div>

                <div class="stream-vms-pill">
                  <span>{{ (camara.tipo || 'PTZ').toUpperCase() }}</span>
                </div>
              </div>

              <div class="stream-center-box">
                <i class="fa-solid fa-video cam-watermark-icon"></i>
                <span class="stream-label">{{ camara.nombre || `Cámara #${camara.id}` }}</span>
              </div>

              <div class="stream-bottom-info">
              </div>
            </div>
          </div>

          <!-- BARRA DE INFORMACIÓN DE UBICACIÓN Y DISTANCIA -->
          <div class="cam-info-bar">

            <div class="info-actions-right">
              <div v-if="camara.distancia_texto" class="info-badge-dist">
                <i class="fa-solid fa-route"></i>
                <span>{{ camara.distancia_texto }} de la novedad</span>
              </div>

              <button
                type="button"
                class="btn-plugin-launch"
                @click="conectarOIniciarPlugin"
                :title="webControlConectado ? 'Plugin conectado correctamente' : 'Conectar plugin HCVideoSDKWebControl'"
              >
                <i :class="webControlConectado ? 'fa-solid fa-check' : 'fa-solid fa-bolt'"></i>
                <span>{{ webControlConectado ? 'WebControl Activo' : 'Conectar Plugin' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODO VENTANA MINI FLOTANTE (ESQUINA INFERIOR DERECHA) -->
    <div
      v-else-if="modelValue && camara && isMini"
      class="cam-card cam-card-mini"
    >
      <div class="cam-header cam-header-mini">
        <div class="cam-header-title">
          <span class="status-dot"></span>
          <span class="cam-title-mini">Cámara #{{ camara.id }}</span>
        </div>

        <div class="cam-header-actions">
          <button
            type="button"
            class="btn-icon-head"
            @click="capturarFrame"
            :disabled="capturando"
            title="Capturar fotograma limpio"
          >
            <i v-if="capturando" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-camera"></i>
          </button>
          <button
            type="button"
            class="btn-icon-head"
            @click="toggleMini"
            title="Expandir a ventana normal"
          >
            <i class="fa-solid fa-expand"></i>
          </button>
          <button
            type="button"
            class="btn-icon-head btn-icon-close"
            @click="cerrar"
            title="Cerrar"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="cam-player-mini">
        <iframe
          v-if="camara.url_streaming && camara.url_streaming.startsWith('http')"
          :src="camara.url_streaming"
          class="cam-iframe"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>

        <div v-else class="cam-mini-placeholder">
          <i class="fa-solid fa-video"></i>
          <span class="mini-cam-name">{{ camara.nombre || `Cámara #${camara.id}` }}</span>
          <span v-if="camara.distancia_texto" class="mini-dist-tag">{{ camara.distancia_texto }}</span>
        </div>
      </div>

      <div class="cam-mini-footer">
        <span class="mini-dir-text">{{ camara.ubicacion || 'Ubicación activa' }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { toast } from '../../services/toast.js';
import { webControlService } from '../../services/webControlService.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  camara: {
    type: Object,
    default: null
  },
  novedad: {
    type: Object,
    default: null
  },
  novedades: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'capturar-frame']);

const isMini = ref(false);
const isFullScreen = ref(false);
const capturando = ref(false);
const webControlConectado = ref(false);
const modalCardRef = ref(null);
const playerBoxRef = ref(null);

// Determinar con certeza la novedad destino vinculada
const novedadDestino = computed(() => {
  if (props.novedad) return props.novedad;
  if (props.camara?.novedad_asociada) return props.camara.novedad_asociada;
  if (props.camara?.novedad_id && props.novedades?.length) {
    const found = props.novedades.find(n => String(n.id) === String(props.camara.novedad_id));
    if (found) return found;
  }
  return null;
});

async function inicializarWebControl() {
  if (!props.camara) return;
  const conectado = await webControlService.conectarServicio();
  webControlConectado.value = conectado;
  if (conectado && playerBoxRef.value) {
    await webControlService.inicializarContenedor(playerBoxRef.value, props.camara);
    await webControlService.reproducirStream(props.camara);
  }
}

async function conectarOIniciarPlugin() {
  const conectado = await webControlService.conectarServicio();
  webControlConectado.value = conectado;
  if (conectado) {
    if (playerBoxRef.value && props.camara) {
      await webControlService.inicializarContenedor(playerBoxRef.value, props.camara);
      await webControlService.reproducirStream(props.camara);
    }
    toast.success('Plugin HCVideoSDKWebControl conectado exitosamente.');
  } else {
    webControlService.ejecutarPluginLocal();
    toast.info('Iniciando proceso local HCVideoSDKWebControl...');
  }
}

function toggleMini() {
  if (isFullScreen.value) isFullScreen.value = false;
  isMini.value = !isMini.value;
  setTimeout(() => {
    if (playerBoxRef.value) webControlService.actualizarPosicion(playerBoxRef.value);
  }, 200);
}

function toggleFullScreen() {
  isFullScreen.value = !isFullScreen.value;
  setTimeout(() => {
    if (playerBoxRef.value) webControlService.actualizarPosicion(playerBoxRef.value);
  }, 200);
}

function handleKeydown(e) {
  if (e.key === 'Escape' && isFullScreen.value) {
    isFullScreen.value = false;
  }
}

function cerrar() {
  if (isFullScreen.value) isFullScreen.value = false;
  webControlService.destruirPlugin();
  emit('update:modelValue', false);
}

function base64ToBlob(b64Data, contentType = 'image/jpeg') {
  const cleanB64 = b64Data.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(cleanB64);
  const byteArrays = [];
  const sliceSize = 512;
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

async function capturarFrame() {
  if (capturando.value) return;
  capturando.value = true;

  try {
    let frameBlob = null;

    if (webControlConectado.value) {
      try {
        const b64 = await webControlService.capturarSnapshot();
        if (b64 && typeof b64 === 'string' && b64.length > 50) {
          frameBlob = base64ToBlob(b64);
        }
      } catch (errSnap) {
        console.warn('Error capturando desde WebControl:', errSnap);
      }
    }

    // 2. Si hay un elemento <video> en el reproductor web
    if (!frameBlob) {
      const videoEl = document.querySelector('#playWnd video') || document.querySelector('.cam-player-box video') || document.querySelector('video');
      if (videoEl && videoEl.videoWidth > 0 && !videoEl.paused) {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        frameBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      }
    }

    // 3. Si hay un elemento <canvas> renderizando video en el reproductor
    if (!frameBlob) {
      const canvasEl = document.querySelector('#playWnd canvas') || document.querySelector('.cam-player-box canvas');
      if (canvasEl && canvasEl.width > 50 && canvasEl.height > 50) {
        frameBlob = await new Promise((resolve) => canvasEl.toBlob(resolve, 'image/jpeg', 0.95));
      }
    }

    // 4. Intentar snapshot directo desde el gateway del backend
    if (!frameBlob && props.camara?.rtsp) {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3090' : 'http://10.10.80.70:3090')).replace(/\/+$/, '');
        const resSnap = await axios.post(`${baseUrl}/camaras/snapshot`, {
          rtsp: props.camara.rtsp,
          id: props.camara.id
        }, { responseType: 'blob', timeout: 3500 });
        if (resSnap.data && resSnap.data.size > 1000) {
          frameBlob = resSnap.data;
        }
      } catch (eGateway) {}
    }

    // 5. Si no se obtuvo una imagen real del flujo
    if (!frameBlob || frameBlob.size < 500) {
      toast.warning('No se detectó señal de video activa en el stream para capturar el fotograma. Asegúrese de que la cámara esté transmitiendo.');
      return;
    }

    const filename = `snapshot-${props.camara?.id || 'cvvc'}-${Date.now()}.jpg`;
    const frameFile = new File([frameBlob], filename, { type: 'image/jpeg' });

    emit('capturar-frame', {
      camara: props.camara,
      file: frameFile,
      novedad: novedadDestino.value
    });

    toast.success(`Fotograma real de cámara #${props.camara?.id || ''} capturado exitosamente.`);
  } catch (err) {
    console.error('Error capturando frame:', err);
    toast.error('No se pudo capturar el fotograma de la cámara.');
  } finally {
    capturando.value = false;
  }
}

watch(() => props.modelValue, (abierto) => {
  if (abierto) {
    setTimeout(inicializarWebControl, 150);
  } else {
    webControlService.destruirPlugin();
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  if (props.modelValue) {
    inicializarWebControl();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  webControlService.destruirPlugin();
});
</script>

<style scoped>
/* BACKDROP MODAL */
.cam-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 39, 68, 0.65);
  backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  transition: all 0.2s ease;
}

.cam-modal-backdrop.is-backdrop-fullscreen {
  padding: 0;
  background: #000000;
}

/* ESTRUCTURA CARD */
.cam-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  box-shadow: 0 20px 30px -5px rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.cam-card-modal {
  width: 92vw;
  max-width: 1080px;
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.cam-card-modal.is-fullscreen {
  width: 100vw;
  max-width: none;
  height: 100vh;
  border-radius: 0;
  border: none;
  z-index: 999999;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(-8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* CABECERA */
.cam-header {
  padding: 10px 16px;
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid var(--accent-blue);
  flex-shrink: 0;
}

.cam-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.cam-head-icon {
  color: #38bdf8;
  font-size: 1rem;
}

.cam-title-text {
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cam-badge-id {
  background: rgba(2, 132, 199, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #e0f2fe;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
}

.cam-badge-vms {
  background: rgba(124, 58, 237, 0.3);
  border: 1px solid rgba(196, 181, 253, 0.4);
  color: #ddd6fe;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
}

.cam-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cam-target-nov-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(2, 132, 199, 0.25);
  border: 1px solid #38bdf8;
  color: #e0f2fe;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  max-width: 220px;
}

.nov-pill-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-head-capture {
  background: #0284c7;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-head-capture:hover {
  background: #0369a1;
  transform: translateY(-1px);
}

.btn-icon-head {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.95rem;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.btn-icon-head:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.15);
}

.btn-icon-close:hover {
  background: rgba(220, 38, 38, 0.4);
}

/* CUERPO DEL MODAL */
.cam-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.cam-body-fullscreen {
  padding: 10px 16px;
  background: #020617;
}

/* PANTALLA REPRODUCTOR */
.cam-player-box {
  width: 100%;
  height: 580px;
  max-height: 72vh;
  background: #0f172a;
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
  border: 1px solid #1e293b;
}

.cam-player-fullscreen {
  flex: 1;
  height: 100% !important;
  max-height: none !important;
  border-radius: 6px;
}

.cam-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.cam-stream-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 20px;
  box-sizing: border-box;
}

.stream-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stream-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid #334155;
  color: #38bdf8;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.stream-status-pill.status-plugin {
  border-color: #22c55e;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.15);
}

.stream-vms-pill {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #475569;
  color: #94a3b8;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-dot {
  width: 7px;
  height: 7px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 6px #22c55e;
}

.stream-center-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.cam-watermark-icon {
  font-size: 3.5rem;
  color: #38bdf8;
  opacity: 0.9;
}

.stream-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.02em;
}

.stream-sublabel {
  font-size: 0.78rem;
  color: #94a3b8;
}

.stream-bottom-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.74rem;
  color: #64748b;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 8px;
}

.stream-bottom-info strong {
  color: #94a3b8;
}

/* BARRA DE INFORMACIÓN */
.cam-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid var(--border);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  flex-shrink: 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  overflow: hidden;
}

.info-item i {
  color: var(--accent-blue);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.info-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.info-badge-dist {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.info-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-plugin-launch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-plugin-launch:hover {
  background: var(--accent-blue);
  color: #ffffff;
  border-color: var(--accent-blue);
}

/* ==================================================== */
/* MODO MINI VENTANA FLOTANTE (ESQUINA INFERIOR DERECHA) */
/* ==================================================== */
.cam-card-mini {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  z-index: 99999;
  border: 2px solid var(--accent-blue);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  animation: miniIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes miniIn {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.cam-header-mini {
  padding: 8px 12px;
}

.cam-title-mini {
  font-size: 0.76rem;
  font-weight: 700;
  color: #ffffff;
}

.cam-player-mini {
  width: 100%;
  height: 170px;
  background: #0f172a;
  position: relative;
}

.cam-mini-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #38bdf8;
}

.cam-mini-placeholder i {
  font-size: 1.8rem;
}

.mini-cam-name {
  font-size: 0.74rem;
  color: #f1f5f9;
  font-weight: 600;
  max-width: 90%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-dist-tag {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid #22c55e;
  color: #4ade80;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.cam-mini-footer {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  font-size: 0.72rem;
  border-top: 1px solid var(--border);
}

.mini-dir-text {
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
</style>
