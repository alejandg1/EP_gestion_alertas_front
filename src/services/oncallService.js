import axios from 'axios';
import { obtenerAGAPorCoordenadas } from './nlpDetector.js';

const ONCALL_API_BASE = import.meta.env.VITE_ONCALL_API_URL || 'http://10.10.80.70:3023/api/oncall/event-report-service';

// Mapeo inteligente de subtipos / tipos de OnCall Hexagon a los tipos de evento de Segura EP
const MAPEO_TIPOS_HEXAGON = {
  // Agua / Inundación / Alcantarillado
  'INUN': 'AGUA',
  'INUNDACION': 'AGUA',
  'INUNDACIÓN': 'AGUA',
  'ACUMULACION DE AGUA': 'AGUA',
  'ACUMULACIÓN DE AGUA': 'AGUA',
  'ALCANTARILLA': 'AGUA',
  'ALCANTARILLADO': 'AGUA',
  'AGUA SERVIDA': 'AGUA',
  'AGUAS SERVIDAS': 'AGUA',
  'SUMIDERO': 'AGUA',
  'AGUAJE': 'AGUA',
  'AGUA': 'AGUA',
  
  // Árbol
  'ARBOL': 'ARBOL',
  'ÁRBOL': 'ARBOL',
  'CAIDA DE ARBOL': 'ARBOL',
  'CAÍDA DE ÁRBOL': 'ARBOL',
  'RAMA': 'ARBOL',

  // Deslizamiento
  'DESLIZAMIENTO': 'DESLIZAMIENTO',
  'DERRUMBE': 'DESLIZAMIENTO',
  'DESLAVE': 'DESLIZAMIENTO',
  'MOVIMIENTO DE MASA': 'DESLIZAMIENTO',

  // Poste / Cable
  'POSTE': 'POSTE',
  'CAIDA DE POSTE': 'POSTE',
  'CAÍDA DE POSTE': 'POSTE',
  'CABLE': 'POSTE',
  'CABLES CAIDOS': 'POSTE',
  'CABLES CAÍDOS': 'POSTE',
  'TRANSFORMADOR': 'POSTE',

  // Siniestro / Accidente
  'ACCIDENTE': 'SINIESTRO',
  'ACCIDENTE DE TRANSITO': 'SINIESTRO',
  'ACCIDENTE DE TRÁNSITO': 'SINIESTRO',
  'SINIESTRO': 'SINIESTRO',
  'CHOQUE': 'SINIESTRO',
  'ATROPELLO': 'SINIESTRO',
  'VOLCAMIENTO': 'SINIESTRO',

  // Vendaval
  'VENDAVAL': 'VENDAVAL',
  'VIENTO': 'VENDAVAL',
  'VIENTOS FUERTES': 'VENDAVAL',
  'VOLADURA DE TECHO': 'VENDAVAL',

  // Afectación estructural
  'AFECTACION': 'AFECTACION',
  'AFECTACIÓN': 'AFECTACION',
  'COLAPSO': 'AFECTACION',
  'ESTRUCTURA': 'AFECTACION',
  'INCENDIO': 'AFECTACION'
};

const INSTITUCIONES_POR_DEFECTO = {
  AGUA: '@emapagye @interagua',
  ARBOL: '@AmbienteGYE @Urvaseo',
  DESLIZAMIENTO: '@RiesgosGYE @ObrasPublicasGYE',
  POSTE: '@CNEL_EP @ATM_Transito',
  SINIESTRO: '@ATM_Transito @BomberosGYE',
  INUNDACION: '@emapagye @interagua @RiesgosGYE',
  VENDAVAL: '@RiesgosGYE @BomberosGYE',
  AFECTACION: '@RiesgosGYE @JusticiayVigilanciaGYE'
};

function extraerFechaYHoraEcuador(timestamp) {
  if (!timestamp) return { fecha: '', hora: '' };
  try {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      const opcionesFecha = { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' };
      const opcionesHora = { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hour12: false };
      
      const partesFecha = new Intl.DateTimeFormat('en-CA', opcionesFecha).format(d); // YYYY-MM-DD
      const horaStr = new Intl.DateTimeFormat('en-GB', opcionesHora).format(d); // HH:mm
      return { fecha: partesFecha, hora: horaStr };
    }
  } catch {
    // fallback
  }
  return { fecha: '', hora: '' };
}

/**
 * Extrae la dirección humana óptima priorizando los campos consolidados por los operadores
 * (custom_data.cecust1 y calls[0].addr) y limpiando coordenadas residuales.
 */
function extraerDireccionOptima(body) {
  const location = body.location || {};
  const customData = body.custom_data || {};
  const calls = Array.isArray(body.calls) ? body.calls : [];

  // 1. Prioridad 1: custom_data.cecust1 (ej: "URBANOR CALLEJON 15 A // REF. DESPENSA LULU")
  if (customData.cecust1 && typeof customData.cecust1 === 'string' && customData.cecust1.trim()) {
    const cecust = customData.cecust1.trim();
    // Remover coordenadas entre paréntesis o al final si vinieran adjuntas
    const sinCoords = cecust
      .replace(/\s*\/?\s*COORDENADAS\s*:\s*-?\d+\.?\d*,\s*-?\d+\.?\d*/gi, '')
      .replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*/g, ' ')
      .replace(/\s+-?\d+\.\d{4,},\s*-?\d+\.\d{4,}\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (sinCoords && !sinCoords.startsWith('LL(') && sinCoords.length > 3) {
      return sinCoords;
    }
  }

  // 2. Prioridad 2: calls[0].addr (ej: "URBANOR CALLEJON 15 A // REF. DESPENSA LULU")
  for (const c of calls) {
    const addr = (c.addr || c.loc || '').trim();
    if (addr && !addr.startsWith('LL(') && addr.length > 3) {
      return addr;
    }
  }

  // 3. Prioridad 3: location.loc procesada y desglosada
  let loc = String(location.loc || '').trim();
  loc = loc.replace(/^LL\([^)]+\)\s*:\s*/i, '');
  loc = loc.replace(/^LL\([^)]+\)\s*/i, '');
  loc = loc.replace(/^(EST|OEST|NORT|SUR)\s+(CL|AV|CALLE|AVENIDA|CALLEJON|CALLEJÓN|PJE|PASAJE)\b/i, '$2');
  loc = loc.replace(/^(EST|OEST|NORT|SUR)\s+/i, '');
  loc = loc.replace(/\bCL\s+[0-9A-Z]+\s+(CALLEJON|CALLEJÓN|AVENIDA|CALLE|PASAJE)\b/i, '$1');
  loc = loc.replace(/\s+(NO|SO|NE|SE)\s+\d+\s*$/i, '');

  let sector = '';
  if (location.place && location.place.trim() && !['GUAYA', 'GUAYAQUIL', 'NULL'].includes(location.place.trim().toUpperCase())) {
    sector = location.place.trim();
  } else if (location.area && location.area.trim() && !['GUAYA', 'GUAYAQUIL', 'NULL'].includes(location.area.trim().toUpperCase())) {
    sector = location.area.trim();
  } else if (location.locfld1 && location.locfld1.trim()) {
    sector = location.locfld1.trim();
  }

  let partes = [];
  if (sector && !loc.toUpperCase().includes(sector.toUpperCase())) {
    partes.push(sector);
  }
  if (loc) partes.push(loc);

  let dirFinal = partes.join(' ').replace(/\s+/g, ' ').trim();
  return dirFinal || 'Guayaquil';
}

/**
 * Consulta la ficha del evento en Hexagon OnCall
 * @param {string|number} fichaId Número o ID de ficha Hexagon
 * @returns {Promise<Object>} Datos normalizados y raw del evento
 */
export async function consultarFichaHexagon(fichaId) {
  if (!fichaId) {
    throw new Error('Debe proporcionar un número de ficha válido.');
  }

  const cleanFicha = String(fichaId).trim();
  const url = `${ONCALL_API_BASE}/${encodeURIComponent(cleanFicha)}?cmts=2`;

  const response = await axios.get(url, {
    timeout: 8000,
    headers: {
      'Accept': 'application/json'
    }
  });

  const data = response.data;
  if (!data || !data.body) {
    throw new Error('La respuesta del servicio OnCall no contiene información del evento.');
  }

  return parsearRespuestaHexagon(data, cleanFicha);
}

/**
 * Normaliza y mapea el JSON de respuesta de OnCall a los estándares de Segura EP
 */
export function parsearRespuestaHexagon(data, fichaBuscada) {
  const body = data.body || {};
  const location = body.location || {};
  const deplo = body.deplo || {};
  const customData = body.custom_data || {};

  // 1. Extraer comentarios y llamadas
  const comentarios = Array.isArray(body.cmt) ? body.cmt.map(c => ({
    timestamp: c.tm || c.created || '',
    operador: c.op || c.createdby || '',
    texto: c.cmt || c.comment || ''
  })) : [];

  const llamadas = Array.isArray(body.calls) ? body.calls.map(c => ({
    telefono: c.phone || c.num || '',
    nombre: c.name || '',
    timestamp: c.tm || c.time || '',
    direccion: c.loc || c.addr || ''
  })) : [];

  const unidades = Array.isArray(body.units) ? body.units.map(u => ({
    unidad: u.unid || u.unit || '',
    agencia: u.ag || '',
    estado: u.stat || '',
    despacho: u.dtm || '',
    arribo: u.atm || '',
    cierre: u.cltm || ''
  })) : [];

  // 2. Extraer número de ficha
  const numeroFicha = String(body.eventid || deplo.evnum || fichaBuscada || '').trim();

  // 3. Extraer Dirección óptima
  const direccion = extraerDireccionOptima(body);

  // 4. Extraer Cámara CVVC si fue reportada por cámara (en calls[0].name)
  let camaraCvvc = '';
  if (llamadas.length > 0 && llamadas[0].nombre) {
    const nom = llamadas[0].nombre.trim();
    if (nom.startsWith('GYE-') || nom.startsWith('C') || nom.includes('URDES') || nom.includes('CAM')) {
      camaraCvvc = nom;
    }
  }

  // 5. Extraer Coordenadas WGS84
  let lat = null;
  let lng = null;
  if (location.lat !== undefined && location.lat !== null && !isNaN(Number(location.lat)) && Number(location.lat) !== 0) {
    lat = Number(Number(location.lat).toFixed(6));
  }
  if (location.lon !== undefined && location.lon !== null && !isNaN(Number(location.lon)) && Number(location.lon) !== 0) {
    lng = Number(Number(location.lon).toFixed(6));
  }

  let coordenadasTexto = '';
  let agaCalculada = '';
  if (lat !== null && lng !== null) {
    coordenadasTexto = `${lat}, ${lng}`;
    agaCalculada = obtenerAGAPorCoordenadas(lat, lng) || '';
  }

  // 6. Extraer Fecha y Horas Operativas en zona horaria Ecuador (UTC-5)
  const timestampCreacion = customData.ad_ts || body.crtm || deplo.sTime || (data.mhdr && data.mhdr.ttl);
  const { fecha, hora } = extraerFechaYHoraEcuador(timestampCreacion);

  const timestampArribo = body.atm || (unidades[0] && unidades[0].arribo) || body.dtm;
  const timestampCierre = customData.xdts || body.cltm || deplo.cltm || (unidades[0] && unidades[0].cierre);
  
  const { hora: horaSitio } = extraerFechaYHoraEcuador(timestampArribo);
  const { hora: solucionado } = extraerFechaYHoraEcuador(timestampCierre);

  // Estado operativo deducido
  let estadoOperativo = '⛔PENDIENTE';
  if (timestampCierre) {
    estadoOperativo = '🟢ATENDIDO';
  } else if (timestampArribo) {
    estadoOperativo = '🟡EN SITIO';
  }

  // 7. Determinar Tipo de Evento
  const subtype = (deplo.subtydesc || deplo.subtype || '').toUpperCase().trim();
  const typeDesc = (deplo.tydesc || deplo.type || '').toUpperCase().trim();
  let tipoDetectado = 'AGUA';

  for (const [clave, val] of Object.entries(MAPEO_TIPOS_HEXAGON)) {
    if (subtype.includes(clave) || typeDesc.includes(clave)) {
      tipoDetectado = val;
      break;
    }
  }

  // 8. Instituciones involucradas
  const ag = (deplo.ag || '').toUpperCase();
  let instituciones = INSTITUCIONES_POR_DEFECTO[tipoDetectado] || '@Segura_EP';
  if (ag.includes('INTERAGUA') || comentarios.some(c => c.texto.toUpperCase().includes('INTERAGUA'))) {
    instituciones = '@interagua @emapagye';
  } else if (ag.includes('ATM')) {
    instituciones = `@ATM_Transito ${instituciones}`.trim();
  } else if (ag.includes('BOMBERO') || ag.includes('BCBG')) {
    instituciones = `@BomberosGYE ${instituciones}`.trim();
  }

  return {
    numero_ficha: numeroFicha,
    ficha: numeroFicha,
    camara_cvvc: camaraCvvc,
    direccion,
    coordenadasTexto,
    lat,
    lng,
    aga: agaCalculada,
    fecha,
    hora,
    hora_sitio: horaSitio,
    solucionado: solucionado,
    tipo: tipoDetectado,
    tipo_evento: tipoDetectado,
    instituciones,
    recurso_asignado: 'INS-ALC 🚙',
    estado_operativo: estadoOperativo,
    // Estructura completa de datos adicionales para métricas y base de datos
    datos_hexagon: {
      ficha_hexagon: {
        eventid: body.eventid,
        eid: body.eid,
        subtipo: deplo.subtydesc || deplo.subtype,
        tipo: deplo.tydesc || deplo.type,
        agencia: deplo.ag,
        camara: camaraCvvc,
        fechas: {
          creacion: timestampCreacion,
          despacho: body.dtm,
          arribo: timestampArribo,
          cierre: timestampCierre
        }
      },
      comentarios,
      llamadas,
      unidades,
      custom_data: customData,
      raw_mhdr: data.mhdr
    }
  };
}
