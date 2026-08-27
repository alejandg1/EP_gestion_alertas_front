import { AGAS_WGS84 } from './agaData.js';

export const emojisNumeros = [
  "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
  "11️⃣", "12️⃣", "13️⃣", "14️⃣", "15️⃣", "16️⃣", "17️⃣", "18️⃣", "19️⃣", "20️⃣"
];

export const textoEventoIndividual = {
  AGUA: "acumulación de agua",
  ARBOL: "caída de árbol",
  DESLIZAMIENTO: "deslizamiento",
  POSTE: "caída de postes",
  SINIESTRO: "siniestros de tránsito",
  INUNDACION: "inundaciones",
  VENDAVAL: "vendavales",
  AFECTACION: "afectación estructural"
};

export const institucionesPorTipo = {
  AGUA: "@emapagye @interagua",
  ARBOL: "@Urvaseo @Segura_EP @AmbienteGYE @parquesgye",
  DESLIZAMIENTO: "@ObrasGuayaquil @Segura_EP @BomberosGYE",
  POSTE: "@CNEL_EP @Segura_EP",
  SINIESTRO: "@ATM_Transito @BomberosGYE",
  INUNDACION: "@emapagye @interagua @BomberosGYE @Segura_EP",
  VENDAVAL: "@Segura_EP @BomberosGYE @CNEL_EP",
  AFECTACION: "@Segura_EP @BomberosGYE @ObrasGuayaquil"
};

export const estiloMapaPorTipo = {
  AGUA: { color: "#0984e3", nombre: "Agua", emoji: "🚰" },
  ARBOL: { color: "#20bf6b", nombre: "Árbol", emoji: "🌳" },
  DESLIZAMIENTO: { color: "#8e5b3a", nombre: "Deslizamiento", emoji: "⛰️" },
  POSTE: { color: "#f1c40f", nombre: "Poste", emoji: "⚡" },
  SINIESTRO: { color: "#e74c3c", nombre: "Siniestro", emoji: "🚗" },
  INUNDACION: { color: "#0069d9", nombre: "Inundación", emoji: "🌊" },
  VENDAVAL: { color: "#7f8c8d", nombre: "Vendaval", emoji: "💨" },
  AFECTACION: { color: "#8e44ad", nombre: "Afectación", emoji: "🏚️" }
};

export const nlpKeywords = {
  ARBOL: [
    "caida de arbol", "arbol caido", "caida de ramas", "arbol", "árbol",
    "ramas", "rama", "tronco", "ficus", "arbusto", "vegetacion", "desgajado", "follaje"
  ],
  DESLIZAMIENTO: [
    "deslizamiento de tierra", "movimiento en masa", "deslizamiento", "deslave",
    "derrumbe", "socavon", "socavón", "talud", "cerro", "hundimiento", "ladera"
  ],
  POSTE: [
    "poste", "cable", "cables", "transformador", "luminaria", "chispa", "cnel",
    "energia", "tendido electrico", "tendido", "electrico", "eléctrico", "alta tension"
  ],
  SINIESTRO: [
    "accidente", "siniestro", "choque", "volcamiento", "estrellamiento",
    "colision", "colisión", "atropello", "transito", "tránsito"
  ],
  INUNDACION: [
    "inundacion", "inundación", "desbordamiento", "desborde", "rio", "río",
    "estero", "casas anegadas", "metro de agua", "bajo el agua", "inundada", "inundado"
  ],
  VENDAVAL: [
    "vendaval", "viento fuerte", "voladura de techo", "cubierta",
    "vientos huracanados", "techo de zinc", "rafaga", "ráfaga", "huracanado"
  ],
  AFECTACION: [
    "afectacion estructural", "afectación estructural", "colapso estructural",
    "colapso de muro", "vivienda colapsada", "grietas en vivienda", "daño estructural",
    "colapso", "pared cuarteada", "pared colapsada", "casa colapsada", "grieta"
  ],
  AGUA: [
    "acumulacion de agua", "acumulación de agua", "via anegada", "vía anegada",
    "calle anegada", "agua estancada", "acumulacion", "acumulación", "agua",
    "charco", "anegada", "estancada", "sumidero", "alcantarilla", "drenaje"
  ]
};

export function normalizarTextoNLP(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}:]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detecta la categoría de incidente usando puntuación ponderada de tokens
 */
export function detectarCategoriaNLP(texto) {
  if (!texto || typeof texto !== "string") return null;
  const limpio = normalizarTextoNLP(texto);
  if (!limpio) return null;

  let mejorCategoria = null;
  let mejorPuntaje = 0;

  for (const [cat, tokens] of Object.entries(nlpKeywords)) {
    let puntaje = 0;
    for (const token of tokens) {
      const tLimpio = normalizarTextoNLP(token);
      if (!tLimpio) continue;

      if (limpio.includes(tLimpio)) {
        // Frases compuestas reciben mayor ponderación que palabras individuales
        puntaje += tLimpio.includes(" ") ? 4 : 1;
        puntaje += Math.min(tLimpio.length / 20, 1);
      }
    }
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorCategoria = cat;
    }
  }

  return mejorCategoria;
}

/**
 * Extrae metadatos del texto como zona AGA, hora, coordenadas e instituciones
 */
export function extraerMetadatosNLP(texto) {
  const resultado = {
    aga: null,
    hora: null,
    coordenadas: null,
    instituciones: null,
    direccionLimpia: null
  };

  if (!texto || typeof texto !== "string") return resultado;

  // 1. Detección de AGA (A01 - A99 o AGA 01)
  const matchAGA = texto.match(/\b(?:AGA\s*)?A?([0-9]{1,2})\b/i);
  const matchAGADirecto = texto.match(/\bA([0-9]{1,2})\b/i);
  if (matchAGADirecto) {
    resultado.aga = "A" + matchAGADirecto[1].padStart(2, "0");
  } else if (matchAGA && /\bAGA\b/i.test(texto)) {
    resultado.aga = "A" + matchAGA[1].padStart(2, "0");
  }

  // 2. Detección de Hora (HH:MM o HHhMM)
  const matchHora = texto.match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/);
  if (matchHora) {
    resultado.hora = String(matchHora[1]).padStart(2, "0") + ":" + matchHora[2];
  }

  // 3. Detección de coordenadas embebidas en el texto
  const coords = parsearCoordenadasNLP(texto);
  if (coords) {
    resultado.coordenadas = coords;
  }

  // 4. Detección de menciones institucionales @institucion
  const matchInst = texto.match(/@\w+/g);
  if (matchInst && matchInst.length > 0) {
    resultado.instituciones = matchInst.join(" ");
  }

  return resultado;
}

/**
 * Normaliza descripciones de eventos
 */
export function normalizarDescripcionNLP(texto) {
  return (texto || "")
    .replace(/\bREFERENCIA\b/gi, "REF.")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Parsea coordenadas en múltiples formatos y valida rango WGS84
 */
export function parsearCoordenadasNLP(cadena) {
  const entrada = String(cadena || "").trim();
  if (!entrada) return null;

  let coincidencia = entrada.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!coincidencia) {
    const numeros = entrada.match(/-?\d+(?:\.\d+)?/g);
    if (numeros && numeros.length >= 2) {
      coincidencia = [entrada, numeros[0], numeros[1]];
    }
  }

  if (!coincidencia) return null;

  let lat = Number(coincidencia[1]);
  let lng = Number(coincidencia[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Si las coordenadas están invertidas (Longitud primero)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    texto: lat.toFixed(6) + ", " + lng.toFixed(6)
  };
}

/**
 * Algoritmo exacto de punto sobre segmento
 */
export function puntoSobreSegmentoAGA(lng, lat, x1, y1, x2, y2) {
  const cruz = (lng - x1) * (y2 - y1) - (lat - y1) * (x2 - x1);
  if (Math.abs(cruz) > 1e-10) return false;
  return (
    lng >= Math.min(x1, x2) - 1e-10 &&
    lng <= Math.max(x1, x2) + 1e-10 &&
    lat >= Math.min(y1, y2) - 1e-10 &&
    lat <= Math.max(y1, y2) + 1e-10
  );
}

/**
 * Algoritmo exacto Ray Casting WGS84 para polígonos AGA
 */
export function puntoEnPoligonoAGA(lng, lat, poligono) {
  if (!poligono || !Array.isArray(poligono.rings) || !poligono.rings.length) return false;
  const [xmin, ymin, xmax, ymax] = poligono.bbox;
  if (lng < xmin || lng > xmax || lat < ymin || lat > ymax) return false;

  let dentro = false;
  for (const anillo of poligono.rings) {
    let j = anillo.length - 1;
    for (let i = 0; i < anillo.length; i++) {
      const [xi, yi] = anillo[i];
      const [xj, yj] = anillo[j];
      if (puntoSobreSegmentoAGA(lng, lat, xi, yi, xj, yj)) return true;
      if (
        (yi > lat) !== (yj > lat) &&
        lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi
      ) {
        dentro = !dentro;
      }
      j = i;
    }
  }
  return dentro;
}

/**
 * Obtiene la zona AGA correspondiente a partir de coordenadas WGS84
 */
export function obtenerAGAPorCoordenadas(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const poligono = AGAS_WGS84.find(item => puntoEnPoligonoAGA(lng, lat, item));
  return poligono ? poligono.aga : null;
}

/**
 * Genera el estado visual y mensaje de georreferenciación AGA
 */
export function evaluarEstadoAGA(coordenadas, aga, esManual) {
  if (!coordenadas) {
    return {
      mensaje: "⚠️ Ingrese la coordenada como latitud, longitud en WGS84.",
      tipo: "error"
    };
  }
  if (esManual && aga) {
    return {
      mensaje: `✏️ AGA ajustada manualmente: ${aga}. Use “Recalcular” para volver al valor cartográfico.`,
      tipo: "warning"
    };
  }
  if (aga && aga !== "N/D") {
    return {
      mensaje: `📍 ${aga} asignada automáticamente mediante el nuevo shapefile WGS84. Puede corregirla manualmente.`,
      tipo: "success"
    };
  }
  return {
    mensaje: "⚠️ La coordenada está fuera de los polígonos AGA disponibles.",
    tipo: "warning"
  };
}

export function preservarEmoticonesWhatsApp(texto) {
  return String(texto || "")
    .normalize("NFC")
    .replace(/\uFE0E/g, "\uFE0F")
    .replace(/([0-9#*])(?!\uFE0F)\u20E3/g, "$1\uFE0F\u20E3");
}

export function abrirWhatsApp(texto) {
  const mensaje = preservarEmoticonesWhatsApp(texto);
  window.open("https://wa.me/?text=" + encodeURIComponent(mensaje), "_blank", "noopener");
}
