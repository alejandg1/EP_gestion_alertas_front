<template>
  <div class="map-container-root" :class="{ 'is-expanded': isExpanded }">
    <div class="map-toolbar">
      <div class="map-controls-group">
        <label class="checkbox-label" title="Activar/desactivar capa de mapa de calor KDE">
          <input type="checkbox" v-model="mostrarKDE" @change="actualizarKDE" />
          <span>Mapa de calor</span>
        </label>
        <label class="checkbox-label" title="Activar/desactivar polígonos de zonas AGA WGS84">
          <input type="checkbox" v-model="mostrarAGA" @change="actualizarAGA" />
          <span>Zonas AGA</span>
        </label>
      </div>
      <div class="map-actions-group">
        <button type="button" class="btn btn-secondary btn-sm btn-ajustar" @click="ajustarVista" title="Centrar mapa en eventos registrados">
          <i class="fa-solid fa-location-crosshairs"></i> Centrar
        </button>
        <button type="button" class="btn btn-primary btn-sm btn-expandir" @click="toggleExpandir" :title="isExpanded ? 'Contraer mapa' : 'Expandir mapa a pantalla completa'">
          <i :class="isExpanded ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
          <span>{{ isExpanded ? 'Contraer' : 'Expandir' }}</span>
        </button>
      </div>
    </div>

    <div ref="mapElement" class="leaflet-map-box"></div>

    <div class="map-legend">
      <div v-for="(estilo, tipo) in estiloMapaPorTipo" :key="tipo" class="legend-item">
        <span class="legend-circle" :style="{ backgroundColor: estilo.color }"></span>
        <span>{{ estilo.nombre }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { AGAS_WGS84 } from '../services/agaData.js';
import { estiloMapaPorTipo, textoEventoIndividual } from '../services/nlpDetector.js';

const props = defineProps({
  novedades: {
    type: Array,
    default: () => []
  }
});

const mapElement = ref(null);
let map = null;
let markersLayer = null;
let agaLayer = null;
let heatLayer = null;

const mostrarKDE = ref(true);
const mostrarAGA = ref(true);
const isExpanded = ref(false);

function toggleExpandir() {
  isExpanded.value = !isExpanded.value;
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
      ajustarVista();
    }
  }, 200);
}

function handleKeydown(e) {
  if (e.key === 'Escape' && isExpanded.value) {
    toggleExpandir();
  }
}

function extraerCoords(item) {
  if (!item) return null;
  const lat = item.coordenadas ? item.coordenadas.lat : (item.latitud !== undefined ? item.latitud : item.lat);
  const lng = item.coordenadas ? item.coordenadas.lng : (item.longitud !== undefined ? item.longitud : item.lng);
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (Number.isFinite(numLat) && Number.isFinite(numLng)) {
    return [numLat, numLng];
  }
  return null;
}

function resolverUrlFoto(foto) {
  if (!foto) return '';
  const url = typeof foto === 'string' ? foto : (foto.url || foto.previewUrl || foto.path || '');
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://10.10.80.70:3090').replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
}

const novedadesValidas = computed(() => {
  return (props.novedades || []).filter(item => extraerCoords(item) !== null);
});

function initMap() {
  if (!mapElement.value) return;

  // Centro en Guayaquil
  map = L.map(mapElement.value, {
    center: [-2.170998, -79.922359],
    zoom: 12,
    zoomControl: true
  });

  // Capa OpenStreetMap (100% Libre y sin limites de trial)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  agaLayer = L.layerGroup().addTo(map);

  renderAGA();
  renderMarcadores();
  actualizarKDE();
  ajustarVista();
}

function renderAGA() {
  if (!agaLayer) return;
  agaLayer.clearLayers();

  if (!mostrarAGA.value) return;

  AGAS_WGS84.forEach((poligono, i) => {
    const latlngs = poligono.rings.map(ring =>
      ring.map(coord => [coord[1], coord[0]])
    );

    const poly = L.polygon(latlngs, {
      color: '#0a3d62',
      weight: 1.2,
      opacity: 0.7,
      fillColor: i % 2 === 0 ? '#97c3da' : '#6caccd',
      fillOpacity: 0.12
    });

    const numeroAGA = poligono.aga || 'N/D';
    poly.bindTooltip(`AGA: ${numeroAGA}`, {
      permanent: false,
      direction: 'center',
      className: 'aga-tooltip'
    });

    agaLayer.addLayer(poly);
  });
}

function renderMarcadores() {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  novedadesValidas.value.forEach((item, index) => {
    const coords = extraerCoords(item);
    if (!coords) return;
    const [lat, lng] = coords;

    const tipoKey = item.tipo_evento || item.tipo || 'AGUA';
    const estilo = estiloMapaPorTipo[tipoKey] || { color: '#0a3d62', nombre: tipoKey, emoji: '📍' };

    // Custom DivIcon con Emoji oficial de categoría (como en el HTML original)
    const iconHtml = `
      <div class="custom-map-pin" style="background-color: ${estilo.color};" title="${estilo.nombre}">
        <span class="pin-emoji">${estilo.emoji || '📍'}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'leaflet-custom-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    let fotosHtml = '';
    if (item.fotos && item.fotos.length > 0) {
      fotosHtml = '<div style="display:flex;gap:6px;margin-top:8px;overflow-x:auto;padding-bottom:2px;">';
      item.fotos.forEach((f, idx) => {
        const u = resolverUrlFoto(f);
        fotosHtml += `<img src="${u}" style="width:70px;height:52px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;cursor:pointer;" onclick="window.open('${u}', '_blank')" title="Ver fotografia #${idx + 1}" />`;
      });
      fotosHtml += '</div>';
    }

    const coordTexto = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const nombreTipo = textoEventoIndividual[tipoKey] || estilo.nombre || tipoKey;
    const direccionTexto = item.direccion || item.dir || 'Sin dirección registrada';
    const recursoTexto = item.recurso_asignado || item.recurso || 'N/A';
    const estadoTexto = item.estado_operativo || item.estado || '⛔PENDIENTE';
    const agaTexto = item.aga || 'N/D';
    const horaTexto = item.hora_evento || item.hora || '00:00';

    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-header" style="border-left: 4px solid ${estilo.color};">
          <strong>${estilo.emoji || '📍'} Evento #${index + 1}: ${nombreTipo}</strong>
        </div>
        <p class="popup-dir">${direccionTexto}</p>
        <div class="popup-meta">
          <span><b>Coordenadas:</b> ${coordTexto}</span>
        </div>
        <div class="popup-meta">
          <span><b>AGA:</b> ${agaTexto}</span>
          <span><b>Hora:</b> ${horaTexto}</span>
        </div>
        <div class="popup-meta">
          <span><b>Recurso:</b> ${recursoTexto}</span>
          <span><b>Estado:</b> ${estadoTexto}</span>
        </div>
        ${fotosHtml}
      </div>
    `;

    marker.bindPopup(popupContent);
    markersLayer.addLayer(marker);
  });
}

function actualizarKDE() {
  if (!map) return;

  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }

  if (mostrarKDE.value && novedadesValidas.value.length > 0) {
    const heatPoints = novedadesValidas.value.map(item => {
      const coords = extraerCoords(item);
      return [coords[0], coords[1], 0.7];
    });

    heatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 18,
      maxZoom: 16,
      max: 1.0,
      gradient: {
        0.2: '#0091ff',
        0.4: '#28c85a',
        0.7: '#ffcd28',
        1.0: '#e63723'
      }
    }).addTo(map);
  }
}

function actualizarAGA() {
  renderAGA();
}

function ajustarVista() {
  if (!map || novedadesValidas.value.length === 0) return;

  const latlngs = novedadesValidas.value.map(item => extraerCoords(item)).filter(Boolean);
  if (latlngs.length === 0) return;

  if (latlngs.length === 1) {
    map.setView(latlngs[0], 15);
  } else {
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

watch(() => props.novedades, () => {
  renderMarcadores();
  actualizarKDE();
}, { deep: true });

onMounted(() => {
  initMap();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.map-container-root {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.25s ease;
}

/* Modo Expandido a Pantalla Completa */
.map-container-root.is-expanded {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 16px 20px;
  box-sizing: border-box;
  gap: 10px;
}

.map-container-root.is-expanded .leaflet-map-box {
  flex: 1;
  height: 100% !important;
  border-radius: 8px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
}

.map-container-root.is-expanded .map-toolbar {
  background: #0a3d62;
  color: #ffffff;
  border-color: #0c4a78;
}

.map-container-root.is-expanded .checkbox-label {
  color: #ffffff;
}

.map-container-root.is-expanded .map-legend {
  background: rgba(255, 255, 255, 0.96);
}

.map-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px 14px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  box-sizing: border-box;
}

.map-controls-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.map-actions-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  margin: 0 !important;
  user-select: none;
  text-transform: none;
  white-space: nowrap;
  line-height: 1;
}

.checkbox-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--accent-blue);
  margin: 0;
  padding: 0;
}

.btn-ajustar, .btn-expandir {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  padding: 5px 10px;
  font-size: 0.76rem;
  font-weight: 600;
}

@media (max-width: 640px) {
  .map-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .map-controls-group {
    justify-content: space-between;
  }
  .map-actions-group {
    width: 100%;
    justify-content: space-between;
  }
  .map-actions-group .btn {
    flex: 1;
  }
}

.leaflet-map-box {
  width: 100%;
  height: 480px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  z-index: 1;
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 8px 12px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: 0.74rem;
  color: var(--text-muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(0,0,0,0.15);
}

:deep(.custom-map-pin) {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s ease;
}

:deep(.custom-map-pin:hover) {
  transform: scale(1.18);
  z-index: 9999 !important;
}

:deep(.pin-emoji) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

:deep(.aga-tooltip) {
  background-color: rgba(15, 39, 68, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-weight: 700;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

:deep(.map-popup-card) {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.82rem;
  color: var(--text-main);
  line-height: 1.4;
}

:deep(.popup-header) {
  padding-left: 6px;
  margin-bottom: 4px;
  font-size: 0.85rem;
}

:deep(.popup-dir) {
  font-weight: 600;
  margin: 4px 0;
  color: var(--text-main);
}

:deep(.popup-meta) {
  display: flex;
  gap: 12px;
  font-size: 0.76rem;
  color: var(--text-muted);
  margin-top: 2px;
}

:deep(.popup-photos) {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

:deep(.popup-img) {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
</style>
