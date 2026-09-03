import axios from 'axios';

let camarasCache = null;
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
  async obtenerCamaras(forceRefresh = false) {
    if (camarasCache && !forceRefresh) {
      return camarasCache;
    }

    if (cargandoCamarasPromise && !forceRefresh) {
      return cargandoCamarasPromise;
    }

    const directApiUrl = import.meta.env.VITE_CAMERAS_API || import.meta.env.CAMERAS_API || (typeof process !== 'undefined' ? process.env?.CAMERAS_API : '') || '';
    const apiBase = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3090' : 'http://10.10.80.70:3090')).replace(/\/+$/, '');
    const backendProxyUrl = `${apiBase}/camaras`;

    cargandoCamarasPromise = (async () => {
      if (directApiUrl) {
        try {
          const res = await axios.get(directApiUrl, { timeout: 8000 });
          const lista = Array.isArray(res.data) ? res.data : (res.data?.camaras || res.data?.data || []);
          const normalizadas = normalizarCamaras(lista);
          if (normalizadas.length > 0) {
            camarasCache = normalizadas;
            return camarasCache;
          }
        } catch (errDirect) {
          console.warn('[CamarasService] Consulta directa a CAMERAS_API falló, probando proxy del backend:', errDirect.message);
        }
      }

      try {
        const resProxy = await axios.get(backendProxyUrl, { timeout: 10000 });
        const lista = Array.isArray(resProxy.data) ? resProxy.data : (resProxy.data?.camaras || resProxy.data?.data || []);
        const normalizadas = normalizarCamaras(lista);
        if (normalizadas.length > 0) {
          camarasCache = normalizadas;
          return camarasCache;
        }
      } catch (errProxy) {
        console.error('[CamarasService] Error al consultar proxy /camaras:', errProxy.message);
      }

      return [];
    })();

    return cargandoCamarasPromise;
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
  }
};

export default camarasService;