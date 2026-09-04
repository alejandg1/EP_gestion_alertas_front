<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="cerrar" @keydown.esc="cerrar">
    <div class="modal-card modal-lg">
      <div class="modal-header">
        <div class="header-brand-info">
          <img src="/icons/icon_blanco.png" alt="Segura EP" class="modal-logo" />
          <span class="header-badge">NOVEDAD #{{ index !== undefined ? index + 1 : '' }}</span>
        </div>

        <div class="header-right-actions">
          <button
            type="button"
            class="btn-toggle-fields"
            :class="{ active: mostrarAvanzado }"
            @click="mostrarAvanzado = !mostrarAvanzado"
            :title="mostrarAvanzado ? 'Volver a vista simplificada' : 'Mostrar todos los campos (Ficha, CVVC, afectaciones, coordenadas, etc.)'"
          >
            <i :class="mostrarAvanzado ? 'fa-solid fa-compress' : 'fa-solid fa-sliders'"></i>
            <span>{{ mostrarAvanzado ? 'Campos Básicos' : 'Todos los Campos' }}</span>
          </button>

          <button type="button" class="btn-close" @click="cerrar" title="Cerrar ventana">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <form @submit.prevent="guardar" class="modal-body">
        <div class="form-group">
          <label for="edit_dir">Dirección y Referencia <span class="required">*</span></label>
          <input
            id="edit_dir"
            type="text"
            v-model="form.direccion"
            placeholder="Ej: AV. CARLOS JULIO AROSEMENA KM 2.5"
            required
            :disabled="guardando"
          />
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="edit_tipo">Tipo de Evento <span class="required">*</span></label>
            <select id="edit_tipo" v-model="form.tipo_evento" @change="alCambiarTipo" :disabled="guardando">
              <option v-for="evt in catalogoEventos" :key="evt.id" :value="evt.id">
                {{ evt.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="edit_instituciones">Instituciones Notificadas</label>
            <input
              id="edit_instituciones"
              type="text"
              v-model="form.instituciones"
              placeholder="@Segura_EP @BomberosGYE"
              :disabled="guardando"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="edit_estado">Estado Operativo de la Novedad <span class="required">*</span></label>
          <select id="edit_estado" v-model="form.estado_operativo" :disabled="guardando" class="select-estado">
            <option v-for="est in estadosDisponibles" :key="est.id" :value="est.value">
              {{ est.label }}
            </option>
          </select>
        </div>

        <RecursosPersonalInput
          :instituciones-texto="form.instituciones"
          v-model:recursos="form.recursos_instituciones"
          v-model:personal="form.personal_instituciones"
        />

        <div v-if="mostrarAvanzado" class="advanced-section">
          <div class="advanced-section-header">
            <i class="fa-solid fa-layer-group"></i>
            <span>Parámetros Operativos Completos y Afectaciones</span>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="edit_ficha">Ficha:</label>
              <input
                id="edit_ficha"
                type="text"
                v-model="form.ficha"
                placeholder=""
                :disabled="guardando"
              />
            </div>

            <div class="form-group">
              <label for="edit_cvvc">Cámara CVVC:</label>
              <div class="input-with-action">
                <input
                  id="edit_cvvc"
                  type="text"
                  v-model="form.camara_cvvc"
                  placeholder="Ej: C732"
                  :disabled="guardando"
                />
              </div>
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label for="edit_fecha">Fecha del Evento:</label>
              <input id="edit_fecha" type="date" v-model="form.fecha_evento" :disabled="guardando" />
            </div>

            <div class="form-group">
              <label for="edit_hora">Hora del Evento:</label>
              <input id="edit_hora" type="time" v-model="form.hora_evento" :disabled="guardando" />
            </div>

            <div class="form-group">
              <label for="edit_aga">Zona AGA:</label>
              <div class="input-with-action">
                <input
                  id="edit_aga"
                  type="text"
                  v-model="form.aga"
                  placeholder="Ej: A09"
                  :disabled="guardando"
                />
                <button
                  type="button"
                  class="btn-inline-geo"
                  @click="recalcularAGA"
                  title="Recalcular AGA según coordenadas"
                  :disabled="guardando"
                >
                  <i class="fa-solid fa-location-crosshairs"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="edit_coords">Coordenadas WGS84 (Lat, Lng):</label>
              <input
                id="edit_coords"
                type="text"
                v-model="form.coordTexto"
                placeholder="-2.1894, -79.8891"
                @input="alCambiarCoordenadas"
                :disabled="guardando"
              />
            </div>

            <div class="form-group">
              <label for="edit_recurso">Recurso Principal Asignado:</label>
              <select id="edit_recurso" v-model="form.recurso_asignado" :disabled="guardando">
                <option v-for="rec in catalogoRecursos" :key="rec.id" :value="rec.value">
                  {{ rec.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="afectaciones-box">
            <div class="afectaciones-header">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Evaluación de Daños y Afectaciones</span>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label for="afect_fallecidos">Fallecidos:</label>
                <input
                  id="afect_fallecidos"
                  type="number"
                  min="0"
                  v-model.number="form.afectaciones.fallecidos"
                  placeholder="0"
                  :disabled="guardando"
                />
              </div>

              <div class="form-group">
                <label for="afect_desaparecidos">Desaparecidos:</label>
                <input
                  id="afect_desaparecidos"
                  type="number"
                  min="0"
                  v-model.number="form.afectaciones.desaparecidos"
                  placeholder="0"
                  :disabled="guardando"
                />
              </div>
            </div>

            <div class="checkbox-pills-row">
              <label class="checkbox-pill" :class="{ checked: form.afectaciones.via_afectada }">
                <input
                  type="checkbox"
                  v-model="form.afectaciones.via_afectada"
                  :disabled="guardando"
                />
                <i :class="form.afectaciones.via_afectada ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i>
                <span>Vía Afectada</span>
              </label>

              <label class="checkbox-pill" :class="{ checked: form.afectaciones.propiedad_publica }">
                <input
                  type="checkbox"
                  v-model="form.afectaciones.propiedad_publica"
                  :disabled="guardando"
                />
                <i :class="form.afectaciones.propiedad_publica ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i>
                <span>Bien Público Afectado</span>
              </label>

              <label class="checkbox-pill" :class="{ checked: form.afectaciones.propiedad_privada }">
                <input
                  type="checkbox"
                  v-model="form.afectaciones.propiedad_privada"
                  :disabled="guardando"
                />
                <i :class="form.afectaciones.propiedad_privada ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i>
                <span>Bien Privado Afectado</span>
              </label>
            </div>
          </div>

          <div class="timestamps-box">
            <div class="timestamps-title">
              <i class="fa-solid fa-clock-rotate-left"></i>
              <span>Horas de Despacho y Solución</span>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label for="edit_hora_sitio">Hora Llegada a Sitio (HH:mm):</label>
                <input
                  id="edit_hora_sitio"
                  type="time"
                  v-model="form.hora_sitio"
                  placeholder="00:00"
                  :disabled="guardando"
                />
              </div>
              <div class="form-group">
                <label for="edit_solucionado">Hora Solución (HH:mm):</label>
                <input
                  id="edit_solucionado"
                  type="time"
                  v-model="form.solucionado"
                  placeholder="00:00"
                  :disabled="guardando"
                />
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="edit_desc">Descripción del Incidente:</label>
              <textarea
                id="edit_desc"
                rows="2"
                v-model="form.descripcion"
                placeholder="Detalle visual o causas del incidente"
                :disabled="guardando"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="edit_acciones">Acciones Inmediatas Tomadas:</label>
              <textarea
                id="edit_acciones"
                rows="2"
                v-model="form.acciones_inmediatas"
                placeholder="Despacho de unidades, cierre de vía, etc."
                :disabled="guardando"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="photo-section-card">
          <div class="photo-section-header">
            <div class="photo-title">
              <i class="fa-solid fa-camera"></i>
              <span>Evidencias Fotográficas</span>
            </div>
            <span class="photo-counter-badge" :class="{ max: totalFotos >= 2 }">
              {{ totalFotos }}/2 fotos
            </span>
          </div>

          <div class="photo-gallery-grid">
            <!-- Fotos existentes -->
            <div
              v-for="(foto, fIdx) in form.fotos"
              :key="'existente-' + fIdx"
              class="photo-card-item"
            >
              <div class="photo-img-container">
                <img :src="resolverUrl(foto)" alt="Evidencia fotográfica" />
                <button
                  type="button"
                  class="btn-remove-photo"
                  @click="eliminarFotoExistente(fIdx)"
                  title="Eliminar esta foto"
                >
                  <i class="fa-solid fa-trash-can"></i>
                </button>
                <span class="photo-badge-pill">Foto {{ fIdx + 1 }}</span>
              </div>
            </div>

            <div
              v-for="(foto, nIdx) in nuevasFotosPreview"
              :key="'nueva-' + nIdx"
              class="photo-card-item nueva"
            >
              <div class="photo-img-container">
                <img :src="foto.previewUrl" alt="Nueva foto subida" />
                <button
                  type="button"
                  class="btn-remove-photo"
                  @click="eliminarFotoNueva(nIdx)"
                  title="Quitar foto nueva"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
                <span class="photo-badge-pill pill-nueva">Nueva</span>
              </div>
            </div>

            <div v-if="totalFotos < 2" class="photo-upload-slot">
              <input
                type="file"
                id="modal_foto_file_input"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                class="hidden-file-input"
                @change="onCargarNuevasFotos"
              />
              <label for="modal_foto_file_input" class="photo-dropzone-label">
                <div class="dropzone-icon">
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <span class="dropzone-text">Adjuntar Foto</span>
                <span class="dropzone-sub">JPG, PNG (máx. 5MB)</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="cerrar" :disabled="guardando">
            <i class="fa-solid fa-ban"></i> Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="guardando">
            <i v-if="guardando" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-floppy-disk"></i>
            {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { toast } from '../../services/toast.js';
import { CATALOGO_EVENTOS, ESTADOS_NOVEDAD, CATALOGO_RECURSOS, getEventosPorEpoca } from '../../config/epocas.js';
import RecursosPersonalInput from './RecursosPersonalInput.vue';
import { parsearCoordenadasNLP, obtenerAGAPorCoordenadas, institucionesPorTipo } from '../../services/nlpDetector.js';
import { camarasService } from '../../services/camarasService.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  novedad: {
    type: Object,
    default: null
  },
  index: {
    type: Number,
    default: 0
  },
  guardando: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'guardar']);

const catalogoEventos = computed(() => getEventosPorEpoca());
const catalogoRecursos = CATALOGO_RECURSOS;
const estadosDisponibles = ESTADOS_NOVEDAD;

const mostrarAvanzado = ref(false);

const form = reactive({
  id: null,
  tipo_evento: 'AGUA',
  direccion: '',
  aga: 'A09',
  instituciones: '',
  fecha_evento: '',
  hora_evento: '',
  coordTexto: '',
  latitud: null,
  longitud: null,
  recurso_asignado: 'INS-ALC 🚙',
  estado_operativo: '⛔PENDIENTE',
  hora_sitio: '',
  solucionado: '',
  descripcion: '',
  acciones_inmediatas: '',
  fotos: [],
  recursos_instituciones: {},
  personal_instituciones: {},
  ficha: '',
  camara_cvvc: '',
  afectaciones: {
    fallecidos: 0,
    desaparecidos: 0,
    via_afectada: false,
    propiedad_publica: false,
    propiedad_privada: false
  }
});

const nuevasFotosArchivos = ref([]);
const nuevasFotosPreview = ref([]);

const totalFotos = computed(() => {
  return (form.fotos?.length || 0) + nuevasFotosPreview.value.length;
});

function extraerHHMM(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '';
}

function inicializarFormulario() {
  if (!props.novedad) return;

  const nov = props.novedad;
  form.id = nov.id || nov._id;
  form.tipo_evento = nov.tipo_evento || nov.tipo || 'AGUA';
  form.direccion = nov.direccion || nov.dir || '';
  form.aga = nov.aga || 'A09';
  form.instituciones = nov.instituciones || '';
  form.fecha_evento = nov.fecha_evento || (nov.fecha ? new Date(nov.fecha).toISOString().split('T')[0] : '');
  form.hora_evento = nov.hora_evento || (nov.fecha ? new Date(nov.fecha).toTimeString().substring(0, 5) : '00:00');
  
  const lat = nov.latitud !== undefined && nov.latitud !== null ? nov.latitud : nov.lat;
  const lng = nov.longitud !== undefined && nov.longitud !== null ? nov.longitud : nov.lng;
  form.latitud = lat;
  form.longitud = lng;
  form.coordTexto = (lat !== undefined && lng !== undefined && lat !== null && lng !== null) ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : '';

  form.recurso_asignado = nov.recurso_asignado || nov.recurso || 'INS-ALC 🚙';
  form.estado_operativo = nov.estado_operativo || nov.estado || '⛔PENDIENTE';
  form.hora_sitio = extraerHHMM(nov.hora_sitio);
  form.solucionado = extraerHHMM(nov.solucionado);
  form.descripcion = nov.descripcion || '';
  form.acciones_inmediatas = nov.acciones_inmediatas || nov.acciones || '';

  // fotos existentes
  form.fotos = Array.isArray(nov.fotos)
    ? nov.fotos.map(f => {
        if (!f) return '';
        if (typeof f === 'string') return f;
        return f.url_foto || f.url || f.previewUrl || f.path || '';
      }).filter(Boolean)
    : [];

  const extras = nov.datos_adicionales || {};
  form.recursos_instituciones = extras.recursos ? { ...extras.recursos } : {};
  form.personal_instituciones = extras.personal ? { ...extras.personal } : {};
  form.ficha = extras.ficha || '';
  form.camara_cvvc = extras.camara_cvvc || '';
  
  const af = extras.afectaciones || {};
  form.afectaciones = {
    fallecidos: parseInt(af.fallecidos, 10) || 0,
    desaparecidos: parseInt(af.desaparecidos, 10) || 0,
    via_afectada: Boolean(af.via_afectada),
    propiedad_publica: Boolean(af.propiedad_publica || af.bien_publico),
    propiedad_privada: Boolean(af.propiedad_privada || af.bien_privado)
  };

  // Limpiar previews
  nuevasFotosPreview.value.forEach(p => {
    if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
  });
  nuevasFotosArchivos.value = [];
  nuevasFotosPreview.value = [];

  // Resetear a modo simplificado inicial
  mostrarAvanzado.value = false;
}

function alCambiarTipo() {
  if (!form.instituciones || form.instituciones.startsWith('@')) {
    form.instituciones = institucionesPorTipo[form.tipo_evento] || '@Segura_EP';
  }
}

function alCambiarCoordenadas() {
  const coords = parsearCoordenadasNLP(form.coordTexto);
  if (coords) {
    form.latitud = coords.lat;
    form.longitud = coords.lng;
    const calculada = obtenerAGAPorCoordenadas(coords.lat, coords.lng);
    if (calculada) form.aga = calculada;
  }
}

function recalcularAGA() {
  if (form.latitud && form.longitud) {
    const calculada = obtenerAGAPorCoordenadas(form.latitud, form.longitud);
    if (calculada) form.aga = calculada;
  }
}

async function detectarCamaraCercana() {
  if (!form.latitud || !form.longitud) {
    toast.warning('Ingrese o calcule coordenadas WGS84 para detectar la cámara más cercana.');
    return;
  }
  try {
    const cam = await camarasService.obtenerCamaraOptimaLineaRecta(form.latitud, form.longitud, form.direccion || '', 200);
    if (cam) {
      form.camara_cvvc = String(cam.id || cam.camara_id || '');
      toast.success(`Cámara en línea de vista #${cam.id} asignada (${cam.distancia_texto})`);
    } else {
      toast.info('No se encontraron cámaras en el eje visual o dentro de 200m.');
    }
  } catch (err) {
    console.error('Error al detectar cámara:', err);
    toast.error('Error consultando el servicio de cámaras.');
  }
}

function onCargarNuevasFotos(e) {
  const files = Array.from(e.target.files || []);
  const cuposDisponibles = 2 - totalFotos.value;

  for (let i = 0; i < Math.min(files.length, cuposDisponibles); i++) {
    const file = files[i];
    nuevasFotosArchivos.value.push(file);
    nuevasFotosPreview.value.push({
      file,
      previewUrl: URL.createObjectURL(file)
    });
  }
  e.target.value = '';
}

function eliminarFotoExistente(idx) {
  form.fotos.splice(idx, 1);
}

function eliminarFotoNueva(idx) {
  if (nuevasFotosPreview.value[idx]?.previewUrl) {
    URL.revokeObjectURL(nuevasFotosPreview.value[idx].previewUrl);
  }
  nuevasFotosPreview.value.splice(idx, 1);
  nuevasFotosArchivos.value.splice(idx, 1);
}

function resolverUrl(foto) {
  if (!foto) return '';
  const url = typeof foto === 'string' ? foto : (foto.url_foto || foto.url || foto.previewUrl || foto.path || '');
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const defaultHost = (typeof window !== 'undefined' && window.location.hostname === 'localhost') ? 'http://localhost:3090' : 'http://10.10.80.70:3090';
  const baseUrl = apiBase || defaultHost;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
}

function cerrar() {
  emit('update:modelValue', false);
}

function guardar() {
  emit('guardar', {
    novedad: {
      ...form,
      recursos_instituciones: { ...(form.recursos_instituciones || {}) },
      personal_instituciones: { ...(form.personal_instituciones || {}) },
      afectaciones: { ...(form.afectaciones || {}) }
    },
    nuevasFotos: [...nuevasFotosArchivos.value]
  });
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.novedad) {
    inicializarFormulario();
  }
}, { immediate: true });
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 39, 68, 0.72);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  box-shadow: 0 25px 35px -5px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalAppear 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalAppear {
  from { opacity: 0; transform: translateY(-14px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  padding: 12px 18px;
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid var(--accent-blue);
  flex-shrink: 0;
}

.header-brand-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-logo {
  height: 28px;
  width: auto;
}

.header-badge {
  background: rgba(2, 132, 199, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #e0f2fe;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-toggle-fields {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-toggle-fields:hover,
.btn-toggle-fields.active {
  background: var(--accent-blue);
  border-color: #ffffff;
  color: #ffffff;
}

.btn-close {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  padding: 18px 22px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.select-estado {
  font-weight: 700;
}

.required {
  color: var(--accent-red);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.input-with-action {
  display: flex;
  gap: 4px;
}

.btn-inline-geo {
  background: #e0f2fe;
  color: var(--accent-blue);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 0 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-inline-geo:hover {
  background: var(--accent-blue);
  color: #ffffff;
}

.btn-inline-cam {
  background: #f3e8ff;
  color: #7c3aed;
  border-color: #d8b4fe;
}

.btn-inline-cam:hover {
  background: #7c3aed;
  color: #ffffff;
  border-color: #7c3aed;
}

/* Sección Avanzada */
.advanced-section {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin: 12px 0;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.advanced-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary-navy);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
}

/* Afectaciones */
.afectaciones-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 12px;
}

.afectaciones-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 8px;
}

.checkbox-pills-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 6px;
}

.checkbox-pill {
  background: #ffffff;
  border: 1.5px solid #fde68a;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary-navy);
  user-select: none;
  transition: all 0.15s ease;
}

.checkbox-pill input[type="checkbox"] {
  display: none;
}

.checkbox-pill:hover {
  background: #fefce8;
  border-color: #f59e0b;
}

.checkbox-pill.checked {
  background: #fef3c7;
  border-color: #d97706;
  color: #92400e;
}

.checkbox-pill.checked i {
  color: #d97706;
}

.timestamps-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 12px;
}

.timestamps-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #166534;
  margin-bottom: 6px;
}

/* FOTOGRAFÍAS / EVIDENCIAS UI */
.photo-section-card {
  background: #f8fafc;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
}

.photo-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.photo-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary-navy);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.photo-counter-badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: #0369a1;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #bae6fd;
}

.photo-counter-badge.max {
  background: #f1f5f9;
  color: #64748b;
  border-color: #cbd5e1;
}

.photo-gallery-grid {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex-wrap: wrap;
}

.photo-card-item {
  position: relative;
  width: 110px;
  height: 90px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1.5px solid var(--border-strong);
  background: #0f172a;
  transition: all 0.15s ease;
}

.photo-card-item:hover {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.14);
}

.photo-img-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.photo-img-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.btn-remove-photo {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(220, 38, 38, 0.9);
  color: #ffffff;
  border: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  transition: all 0.15s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-remove-photo:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.photo-badge-pill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.85);
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  text-align: center;
  padding: 2px 4px;
}

.photo-badge-pill.pill-nueva {
  background: rgba(22, 163, 74, 0.9);
}

.photo-upload-slot {
  flex: 1;
  min-width: 140px;
  max-width: 180px;
  height: 90px;
}

.hidden-file-input {
  display: none;
}

.photo-dropzone-label {
  width: 100%;
  height: 100%;
  border: 1.5px dashed var(--accent-blue);
  background: #f0f9ff;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  color: var(--accent-blue);
  transition: all 0.15s ease;
  padding: 8px;
  text-align: center;
}

.photo-dropzone-label:hover {
  background: #e0f2fe;
  border-color: #0284c7;
}

.dropzone-icon {
  font-size: 1.1rem;
}

.dropzone-text {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.1;
}

.dropzone-sub {
  font-size: 0.6rem;
  color: var(--text-faint);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
</style>
