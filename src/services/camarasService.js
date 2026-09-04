import { CAMARAS_DATA } from './camarasData.js';

let camarasCache = CAMARAS_DATA;
let cargandoCamarasPromise = null;

export function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return Infinity;
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (Number(lat1) * Math.PI) / 180;
  const φ2 = (Number(lat2) * Math.PI) / 180;
  const Δφ = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const Δλ = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatearDistancia(metros) {
  if (metros === Infinity || metros === null || isNaN(metros)) return 'Distancia N/D';
  if (metros < 1000) {
    return `${metros} m`;
  }
  return `${(metros / 1000).toFixed(2)} km`;
}

function normalizarCamaras(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter(c => c && (c.LATITUD !== undefined || c.latitud !== undefined))
    .map(c => ({
      id: c.ID || c.id,
      id_consolidado: c.ID_CONSOLIDADO || c.id_consolidado,
      vms: c.VMS || c.vms || 'vrn',
      nombre: c.NOMBRE_CAMARA || c.nombre || c.NUEVO_NOMBRE || '',
      camara_id: c.CAMARA_ID || c.camara_id || `C-${c.ID || ''}`,
      ip: c.IP || c.ip || '',
      rtsp: c.MARCA || c.rtsp || c.marca || '',
      url_streaming: c.URL_STREAMING || c.url_streaming || '',
      latitud: Number(c.LATITUD !== undefined ? c.LATITUD : c.latitud),
      longitud: Number(c.LONGITUD !== undefined ? c.LONGITUD : c.longitud),
      ubicacion: c.UBICACION || c.ubicacion || 'Sin dirección',
      tipo: c.TIPO || c.tipo || 'ptz',
      status: c.STATUS !== undefined ? c.STATUS : c.status
    }))
    .filter(c => !isNaN(c.latitud) && !isNaN(c.longitud) && c.latitud !== 0 && c.longitud !== 0);
}

export const camarasService = {
  async obtenerCamaras() {
    if (camarasCache && camarasCache.length > 0) {
      return camarasCache;
    }
    camarasCache = CAMARAS_DATA || [];
    return camarasCache;
  },

  async obtenerCamaraMasCercana(lat, lng, maxRadioMetros = null) {
    if (lat === null || lng === null || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return null;
    }

    const camaras = await this.obtenerCamaras();
    if (!camaras.length) return null;

    let camaraMasCercana = null;
    let distanciaMinima = Infinity;

    for (const cam of camaras) {
      const dist = calcularDistanciaMetros(lat, lng, cam.latitud, cam.longitud);
      if (dist < distanciaMinima) {
        distanciaMinima = dist;
        camaraMasCercana = cam;
      }
    }

    if (camaraMasCercana) {
      if (maxRadioMetros !== null && distanciaMinima > maxRadioMetros) {
        return null;
      }
      return {
        ...camaraMasCercana,
        distancia_metros: distanciaMinima,
        distancia_texto: formatearDistancia(distanciaMinima)
      };
    }

    return null;
  },

  async obtenerCamarasEnRadio(lat, lng, radioMetros = 1500) {
    if (lat === null || lng === null) return [];
    const camaras = await this.obtenerCamaras();

    return camaras
      .map(cam => {
        const dist = calcularDistanciaMetros(lat, lng, cam.latitud, cam.longitud);
        return {
          ...cam,
          distancia_metros: dist,
          distancia_texto: formatearDistancia(dist)
        };
      })
      .filter(cam => cam.distancia_metros <= radioMetros)
      .sort((a, b) => a.distancia_metros - b.distancia_metros);
  },

  /**
   * Obtiene la cámara óptima en línea recta / línea de vista dentro de un rango aceptable (<= 200m).
   * Pondera:
   * 1. Coincidencia del eje vial / nombre de la calle en la ubicación.
   * 2. Tipo PTZ (capacidad de giro y zoom en línea recta).
   * 3. Menor distancia angular y lineal.
   */
  async obtenerCamaraOptimaLineaRecta(lat, lng, direccion = '', maxRadioMetros = 200) {
    if (lat === null || lng === null || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return null;
    }

    const candidatas = await this.obtenerCamarasEnRadio(lat, lng, maxRadioMetros);
    if (!candidatas.length) {
      // Fallback a la más cercana en radio ampliado si no hay ninguna a <= 200m
      return this.obtenerCamaraMasCercana(lat, lng, 600);
    }

    if (candidatas.length === 1) {
      return candidatas[0];
    }

    // Normalizar palabras clave de la dirección para match de eje vial / calle
    const palabrasIgnoradas = new Set(['CALLE', 'AVENIDA', 'AV', 'CDLA', 'MZ', 'SOLAR', 'SL', 'DIAGONAL', 'FRENTE', 'ESQUINA', 'SECTOR', 'ETAPA', 'Y', 'DE', 'LA', 'EL', 'LOS', 'LAS', 'EN']);
    const palabrasClave = String(direccion || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length > 2 && !palabrasIgnoradas.has(p));

    let mejorCamara = candidatas[0];
    let mejorPuntuacion = -1;

    for (const cam of candidatas) {
      let score = 0;
      const camTexto = `${cam.nombre || ''} ${cam.ubicacion || ''}`
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      // Ponderación por coincidencia de calle / eje vial
      for (const palabra of palabrasClave) {
        if (camTexto.includes(palabra)) {
          score += 60;
        }
      }

      // Ponderación por tipo de cámara PTZ (mayor versatilidad de enfoque en línea recta)
      if (String(cam.tipo || '').toLowerCase().includes('ptz')) {
        score += 25;
      }

      // Ponderación por cercanía (máximo 30 puntos por proximidad en 200m)
      score += Math.max(0, (maxRadioMetros - cam.distancia_metros) / (maxRadioMetros / 30));

      if (score > mejorPuntuacion) {
        mejorPuntuacion = score;
        mejorCamara = cam;
      }
    }

    return mejorCamara;
  }
};

export default camarasService;