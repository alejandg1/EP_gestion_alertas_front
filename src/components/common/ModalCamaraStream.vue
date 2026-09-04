<template>
  <Teleport to="body">
    <!-- CONTENEDOR FLOTANTE / MODAL PERSISTENTE (El stream no se destruye al cambiar de tamaño) -->
    <template v-if="modelValue && camara">
      <!-- 1. BACKDROP (Solo visible e interactivo en modo modal normal/fullscreen) -->
      <div
        v-if="!isMini"
        class="cam-modal-backdrop"
        :class="{ 'is-backdrop-fullscreen': isFullScreen }"
        @click.self="!isFullScreen && cerrar()"
      ></div>

      <!-- 2. JOYSTICK FLOTANTE SATÉLITE (Solo en modo Mini) -->
      <div
        v-if="isMini && esCamaraPtz && mostrarJoystickMini"
        class="ptz-joystick-card ptz-mini-floating-card"
      >
        <PtzJoystickWidget
          :camera-id="idCamaraPtz"
          :joystick-pos="joystickPos"
          @mover-vector="onMoverVector"
          @mover-zoom="onMoverZoom"
          @mover-zoom-relativo="onMoverZoomRelativo"
          @detener="onDetenerPtz"
        />
      </div>

      <!-- 3. TARJETA PRINCIPAL DEL STREAM (UNIFICADA Y PERSISTENTE) -->
      <div
        class="cam-card"
        :class="{
          'cam-card-modal': !isMini,
          'cam-card-mini': isMini,
          'is-fullscreen': isFullScreen
        }"
        ref="modalCardRef"
      >
        <!-- CABECERA -->
        <div class="cam-header" :class="{ 'cam-header-mini': isMini }">
          <div class="cam-header-title">
            <span v-if="isMini" class="status-dot"></span>
            <i v-else class="fa-solid fa-video cam-head-icon"></i>
            <span :class="isMini ? 'cam-title-mini' : 'cam-title-text'">
              {{ camara.nombre || `Cámara #${camara.id}` }}
            </span>
          </div>

          <div class="cam-header-actions">
            <!-- Botón Joystick PTZ -->
            <button
              v-if="esCamaraPtz"
              type="button"
              class="btn-icon-head"
              :class="{
                'btn-ptz-active': isMini ? mostrarJoystickMini : mostrarJoystick
              }"
              @click="isMini ? (mostrarJoystickMini = !mostrarJoystickMini) : (mostrarJoystick = !mostrarJoystick)"
              title="Mostrar / Ocultar control PTZ"
            >
              <i class="fa-solid fa-gamepad"></i>
            </button>

            <!-- Botón Capturar Fotograma -->
            <button
              type="button"
              :class="isMini ? 'btn-icon-head' : 'btn-head-capture'"
              @click="capturarFrame"
              :disabled="capturando"
              title="Capturar fotograma limpio"
            >
              <i v-if="capturando" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-camera"></i>
              <span v-if="!isMini">{{ capturando ? 'Capturando...' : 'Capturar Frame' }}</span>
            </button>

            <!-- Botón Pantalla Completa (Solo en Modo Modal) -->
            <button
              v-if="!isMini"
              type="button"
              class="btn-icon-head"
              @click="toggleFullScreen"
              :title="isFullScreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa (F)'"
            >
              <i :class="isFullScreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
            </button>

            <!-- Botón Minimizar / Expandir -->
            <button
              v-if="!isFullScreen"
              type="button"
              class="btn-icon-head"
              @click="toggleMini"
              :title="isMini ? 'Expandir a ventana normal' : 'Minimizar a ventana flotante'"
            >
              <i :class="isMini ? 'fa-solid fa-expand' : 'fa-solid fa-window-minimize'"></i>
            </button>

            <!-- Botón Cerrar -->
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
        <div
          class="cam-body"
          :class="{
            'cam-body-mini': isMini,
            'cam-body-fullscreen': isFullScreen
          }"
        >
          <!-- PANTALLA DE STREAMING PERSISTENTE -->
          <div
            id="playWnd"
            :class="isMini ? 'cam-player-mini' : 'cam-player-box'"
            :style="isFullScreen ? { height: '100% !important', maxHeight: 'none' } : {}"
            ref="playerBoxRef"
            @wheel.prevent="onWheelZoom"
          >
            <!-- 1. Flujo WebRTC nativo Telconet o URL HTTP directa (NO SE RECARGA AL CAMBIAR DE MODO) -->
            <iframe
              v-if="streamUrl && !streamError"
              :src="streamUrl"
              class="cam-iframe"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowfullscreen
              @error="onIframeError"
            ></iframe>

            <!-- 2. Fallback visual si el stream no está disponible -->
            <div v-else-if="!isMini" class="cam-stream-canvas">
              <div class="stream-center-box">
                <i class="fa-solid fa-video-slash cam-watermark-icon icon-disabled"></i>
                <span class="stream-label">{{ camara.nombre || `Cámara #${camara.id}` }}</span>
                <span class="stream-sublabel-disabled">
                  {{ streamErrorMsg || 'Cámara temporalmente inhabilitada o no configurada en el servidor de video' }}
                </span>
              </div>
            </div>

            <div v-else class="cam-mini-placeholder">
              <i class="fa-solid fa-video-slash" style="color: #f87171;"></i>
              <span class="mini-cam-name">{{ camara.nombre || `Cámara #${camara.id}` }}</span>
              <span class="mini-error-text">{{ streamErrorMsg || 'No disponible' }}</span>
            </div>

            <!-- 3. JOYSTICK EN OVERLAY (Solo en modo normal / modal amplio) -->
            <div
              v-if="!isMini && esCamaraPtz && mostrarJoystick"
              class="ptz-joystick-card ptz-modal-overlay"
            >
              <PtzJoystickWidget
                :camera-id="idCamaraPtz"
                :joystick-pos="joystickPos"
                @mover-vector="onMoverVector"
                @mover-zoom="onMoverZoom"
                @mover-zoom-relativo="onMoverZoomRelativo"
                @detener="onDetenerPtz"
              />
            </div>
          </div>

          <!-- BARRA DE INFORMACIÓN (Solo en modo normal/fullscreen) -->
          <div v-if="!isMini" class="cam-info-bar">
            <div class="info-actions-right">
              <div v-if="camara.distancia_texto" class="info-badge-dist">
                <i class="fa-solid fa-route"></i>
                <span>{{ camara.distancia_texto }} de la novedad</span>
              </div>

              <a
                v-if="streamUrl"
                :href="streamUrl"
                target="_blank"
                rel="noopener"
                class="btn-plugin-launch btn-plugin-download"
                title="Abrir transmisión WebRTC en pestaña nueva"
              >
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                <span>Abrir en otra ventana</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { toast } from '../../services/toast.js';
import { webControlService } from '../../services/webControlService.js';
import { usePtzControl } from '../../composables/usePtzControl.js';
import PtzJoystickWidget from './PtzJoystickWidget.vue';

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

const isMini = ref(true);
const isFullScreen = ref(false);
const capturando = ref(false);
const webControlConectado = ref(false);
const streamError = ref(false);
const streamErrorMsg = ref('');
const verificandoStream = ref(false);
const mostrarJoystick = ref(true);
const mostrarJoystickMini = ref(true);
const modalCardRef = ref(null);
const playerBoxRef = ref(null);

const {
  ptzActivo,
  direccionActual,
  joystickPos,
  inicializarPtz,
  moverJoystickVector,
  moverZoom,
  moverZoomRelativo,
  detenerMovimiento
} = usePtzControl();

const esCamaraPtz = computed(() => {
  return String(props.camara?.tipo || '').toLowerCase().includes('ptz') || String(props.camara?.nombre || '').toUpperCase().endsWith('P');
});

const idCamaraPtz = computed(() => {
  if (!props.camara) return '';
  if (streamUrl.value) {
    const match = streamUrl.value.match(/stream-(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return String(props.camara.id_consolidado || props.camara.id || props.camara.camara_id || '').replace(/\D/g, '');
});

function onMoverVector({ x, y, z }) {
  if (!idCamaraPtz.value) return;
  moverJoystickVector(idCamaraPtz.value, x, y, z);
}

function onMoverZoom(factor) {
  if (!idCamaraPtz.value) return;
  moverZoom(idCamaraPtz.value, factor);
}

function onMoverZoomRelativo(delta) {
  if (!idCamaraPtz.value) return;
  moverZoomRelativo(idCamaraPtz.value, delta);
}

let wheelTimeout = null;
function onWheelZoom(event) {
  if (!esCamaraPtz.value || !idCamaraPtz.value) return;
  // deltaY < 0 es scroll hacia arriba (Zoom In / Acercar)
  const delta = event.deltaY < 0 ? 0.06 : -0.06;
  
  if (wheelTimeout) clearTimeout(wheelTimeout);
  wheelTimeout = setTimeout(() => {
    moverZoomRelativo(idCamaraPtz.value, delta);
  }, 40);
}

function onDetenerPtz() {
  if (!idCamaraPtz.value) return;
  detenerMovimiento(idCamaraPtz.value);
}

// Resuelve la URL de Streaming WebRTC de Telconet o URL HTTP directa con candidatos múltiples
const streamUrl = computed(() => {
  if (!props.camara) return '';
  if (props.camara.url_streaming && typeof props.camara.url_streaming === 'string' && props.camara.url_streaming.startsWith('http')) {
    return props.camara.url_streaming;
  }
  
  // Extraer el identificador limpio
  const idPrincipal = String(props.camara.id_consolidado || props.camara.id || props.camara.camara_id || '').replace(/\D/g, '');
  if (idPrincipal) {
    return `https://hls.ai.telconet.net/webrtc-cam/stream-${idPrincipal}/`;
  }
  return '';
});

// Comprueba en background la disponibilidad del stream e interpreta respuestas de error (ej: path not configured)
async function verificarDisponibilidadStream() {
  streamError.value = false;
  streamErrorMsg.value = '';
  if (!streamUrl.value) return;

  verificandoStream.value = true;
  try {
    const response = await fetch(streamUrl.value, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/html, */*' }
    });

    if (!response.ok) {
      streamError.value = true;
      try {
        const data = await response.json();
        if (data && data.error) {
          if (data.error.includes('is not configured')) {
            streamErrorMsg.value = 'Canal de video no configurado en el servidor WebRTC';
          } else {
            streamErrorMsg.value = data.error;
          }
        } else {
          streamErrorMsg.value = `El servidor de video respondió con error (${response.status})`;
        }
      } catch (_) {
        streamErrorMsg.value = 'Cámara sin señal activa en el servidor de video';
      }
    } else {
      // Verificar si el cuerpo retornado es un JSON con error
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          if (data && data.error) {
            streamError.value = true;
            if (data.error.includes('is not configured')) {
              streamErrorMsg.value = 'Canal de video no configurado en el servidor WebRTC';
            } else {
              streamErrorMsg.value = data.error;
            }
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    // Si falla por CORS o timeout, el iframe intentará cargar de todas formas
    console.debug('[CamaraStream] Verificación de stream:', err);
  } finally {
    verificandoStream.value = false;
  }
}

function onIframeError() {
  streamError.value = true;
  if (!streamErrorMsg.value) {
    streamErrorMsg.value = 'No se pudo establecer conexión con el flujo de video';
  }
}

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
    toast.success('Plugin VideoWebPlugin / HCVideoSDK detectado y enlazado.');
  } else {
    webControlService.ejecutarPluginLocal();
    toast.info('Si ya lo instaló, se está iniciando el proceso local. Si aún no lo tiene, descárguelo e instálelo.');
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

    // 4. Si no se obtuvo una imagen real del flujo
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
    verificarDisponibilidadStream();
    if (esCamaraPtz.value && idCamaraPtz.value) {
      inicializarPtz(idCamaraPtz.value);
    }
    setTimeout(inicializarWebControl, 150);
  } else {
    detenerMovimiento(idCamaraPtz.value);
    webControlService.destruirPlugin();
  }
});

watch(() => props.camara, () => {
  if (props.modelValue) {
    verificarDisponibilidadStream();
    if (esCamaraPtz.value && idCamaraPtz.value) {
      inicializarPtz(idCamaraPtz.value);
    }
  }
});

watch(mostrarJoystick, (activo) => {
  if (activo && esCamaraPtz.value && idCamaraPtz.value) {
    inicializarPtz(idCamaraPtz.value);
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  if (props.modelValue) {
    verificarDisponibilidadStream();
    if (esCamaraPtz.value && idCamaraPtz.value) {
      inicializarPtz(idCamaraPtz.value);
    }
    inicializarWebControl();
  }
});

onBeforeUnmount(() => {
  detenerMovimiento(idCamaraPtz.value);
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
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 92vw;
  max-width: 1080px;
  z-index: 100000;
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.cam-card-modal.is-fullscreen {
  top: 0;
  left: 0;
  transform: none;
  width: 100vw;
  max-width: none;
  height: 100vh;
  border-radius: 0;
  border: none;
  z-index: 999999;
}

.cam-body-mini {
  padding: 0 !important;
  gap: 0 !important;
  background: #0f172a;
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
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.stream-center-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  max-width: 540px;
  margin: auto;
}

.cam-watermark-icon {
  font-size: 3.8rem;
  color: #38bdf8;
  opacity: 0.9;
}

.stream-label {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.02em;
}

.stream-sublabel-disabled {
  font-size: 0.88rem;
  color: #fca5a5;
  font-weight: 500;
  line-height: 1.4;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
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

.btn-plugin-download {
  background: #0284c7;
  color: #ffffff;
  border-color: #0369a1;
  text-decoration: none;
}

.btn-plugin-download:hover {
  background: #0369a1;
  color: #ffffff;
}

.btn-plugin-active {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}

.btn-plugin-active:hover {
  background: #d1fae5;
  color: #047857;
  border-color: #6ee7b7;
}

/* ==================================================== */
/* MODO MINI VENTANA FLOTANTE (ESTILO INSTITUCIONAL SOBRIO)*/
/* ==================================================== */
.cam-card-mini {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 440px;
  max-width: 90vw;
  z-index: 99999;
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg);
  animation: miniIn 0.2s ease-out;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

@keyframes miniIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.cam-header-mini {
  padding: 8px 12px;
  background: var(--primary-navy);
}

.cam-title-mini {
  font-size: 0.8rem;
  font-weight: 700;
  color: #ffffff;
}

.cam-player-mini {
  width: 100%;
  height: 255px;
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
  gap: 8px;
  color: #38bdf8;
}

.cam-mini-placeholder i {
  font-size: 2.2rem;
}

.mini-cam-name {
  font-size: 0.78rem;
  color: #f1f5f9;
  font-weight: 600;
  max-width: 90%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-dist-tag {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid #16a34a;
  color: #22c55e;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.mini-error-text {
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  max-width: 85%;
  text-align: center;
  line-height: 1.25;
}

/* ==================================================== */
/* CONTROL PTZ UNIFICADO (MODAL Y MINI STREAM) */
/* ==================================================== */
.btn-ptz-active {
  background: var(--primary-navy) !important;
  color: #ffffff !important;
  border-color: var(--accent-blue) !important;
}

.btn-ptz-unsupported {
  color: #f87171 !important;
  opacity: 0.7;
}

.ptz-joystick-card {
  width: 176px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid #334155;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 14px;
  user-select: none;
  z-index: 99999;
}

/* BADGE DE ADVERTENCIA PTZ */
.ptz-warn-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.25;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  text-align: left;
  user-select: none;
}

.ptz-warn-badge i {
  color: #ef4444;
  font-size: 0.78rem;
  flex-shrink: 0;
}

/* En Modal Principal (Overlay sobre el video) */
.ptz-modal-overlay {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 20;
  animation: ptzIn 0.2s ease-out;
}

/* En Mini Stream (Tarjeta satélite flotando a la izquierda) */
.ptz-mini-floating-card {
  position: fixed;
  bottom: 20px;
  right: 490px;
  animation: miniIn 0.2s ease-out;
}

@keyframes ptzIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
