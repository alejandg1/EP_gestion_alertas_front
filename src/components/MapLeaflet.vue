<template>
  <div class="map-container-root">
    <div class="map-toolbar">
      <label class="checkbox-label">
        <input type="checkbox" v-model="mostrarKDE" @change="actualizarKDE" />
        Mostrar densidad de calor
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="mostrarAGA" @change="actualizarAGA" />
        Mostrar zonas AGA
      </label>
      <button type="button" class="btn btn-secondary btn-sm" @click="ajustarVista">
        Ajustar a eventos
      </button>
      <span class="events-count-badge">{{ novedadesValidas.length }} eventos georreferenciados</span>
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
    const estilo = estiloMapaPorTipo[tipoKey] || { color: '#0a3d62', nombre: tipoKey };

    // Custom DivIcon sin emojis
    const iconHtml = `
      <div class="custom-map-pin" style="background-color: ${estilo.color};">
        <span>${index + 1}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'leaflet-custom-marker',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
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

    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-header" style="border-left: 4px solid ${estilo.color};">
          <strong>Evento #${index + 1}: ${estilo.nombre}</strong>
        </div>
        <p class="popup-dir">${item.direccion || item.dir || 'Sin direccion'}</p>
        <div class="popup-meta">
          <span><b>AGA:</b> ${item.aga || 'N/D'}</span>
          <span><b>Hora:</b> ${item.hora_evento || item.hora || '00:00'}</span>
        </div>
        <div class="popup-meta">
          <span><b>Recurso:</b> ${item.recurso_asignado || item.recurso || 'N/A'}</span>
          <span><b>Estado:</b> ${item.estado_operativo || item.estado || 'PENDIENTE'}</span>
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
});

onBeforeUnmount(() => {
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
}

.map-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  margin: 0;
  text-transform: none;
}

.events-count-badge {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0a3d62;
  background: #e0f2fe;
  padding: 3px 8px;
  border-radius: 12px;
}

.leaflet-map-box {
  width: 100%;
  height: 480px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  z-index: 1;
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 0.75rem;
  color: #475569;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(0,0,0,0.15);
}

:deep(.custom-map-pin) {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  font-family: inherit;
}

:deep(.aga-tooltip) {
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #0a3d62;
  color: #0a3d62;
  font-weight: 700;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

:deep(.map-popup-card) {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 0.82rem;
  color: #1e293b;
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
  color: #334155;
}

:deep(.popup-meta) {
  display: flex;
  gap: 12px;
  font-size: 0.76rem;
  color: #64748b;
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
  border-radius: 4px;
  border: 1px solid #cbd5e1;
}
</style>
