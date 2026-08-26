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
  AGUA: { color: "#0984e3", nombre: "Acumulación de agua", emoji: "🚰" },
  ARBOL: { color: "#20bf6b", nombre: "Caída de árbol", emoji: "🌳" },
  DESLIZAMIENTO: { color: "#8e5b3a", nombre: "Deslizamiento", emoji: "⛰️" },
  POSTE: { color: "#f1c40f", nombre: "Caída de poste", emoji: "⚡" },
  SINIESTRO: { color: "#e74c3c", nombre: "Siniestro de tránsito", emoji: "🚗" },
  INUNDACION: { color: "#0069d9", nombre: "Inundación", emoji: "🌊" },
  VENDAVAL: { color: "#7f8c8d", nombre: "Vendaval", emoji: "💨" },
  AFECTACION: { color: "#8e44ad", nombre: "Afectación estructural", emoji: "🏚️" }
};

export function puntoEnAnillo(punto, anillo) {
  const [x, y] = punto;
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const xi = anillo[i][0], yi = anillo[i][1];
    const xj = anillo[j][0], yj = anillo[j][1];
    const intersecta = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + Number.EPSILON) + xi);
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

export function puntoEnPoligono(punto, poligonoGeo) {
  if (!poligonoGeo || !Array.isArray(poligonoGeo.rings) || !poligonoGeo.rings.length) return false;
  const bbox = poligonoGeo.bbox;
  if (bbox && (punto[0] < bbox[0] || punto[0] > bbox[2] || punto[1] < bbox[1] || punto[1] > bbox[3])) return false;
  if (!puntoEnAnillo(punto, poligonoGeo.rings[0])) return false;
  for (let i = 1; i < poligonoGeo.rings.length; i++) {
    if (puntoEnAnillo(punto, poligonoGeo.rings[i])) return false;
  }
  return true;
}

export function obtenerAGAPorCoordenadas(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const punto = [lng, lat];
  for (const poligono of AGAS_WGS84) {
    if (puntoEnPoligono(punto, poligono)) {
      return poligono.aga;
    }
  }
  return null;
}

export function parsearCoordenadasNLP(cadena) {
  if (!cadena || typeof cadena !== "string") return null;
  const limpio = cadena.replace(/[^\d.,\-+ ]/g, " ").trim();
  const partes = limpio.split(/[\s,]+/).map(Number).filter(Number.isFinite);
  if (partes.length >= 2) {
    let lat = partes[0];
    let lng = partes[1];
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
      const temp = lat; lat = lng; lng = temp;
    }
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }
  return null;
}

export function detectarCategoriaNLP(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  if (/inunda|anega|bajo el agua/.test(t)) return "INUNDACION";
  if (/agua|charco|acumulaci[oó]n|drenaje|estancad/.test(t)) return "AGUA";
  if (/árbol|arbol|rama|follaje|tronco/.test(t)) return "ARBOL";
  if (/poste|cable|tendido|transformador|eléctric/.test(t)) return "POSTE";
  if (/deslizamiento|derrumbe|talud|ladera|cerro/.test(t)) return "DESLIZAMIENTO";
  if (/choque|siniestro|colisi[oó]n|volcamiento|accidente|tr[aá]nsito/.test(t)) return "SINIESTRO";
  if (/viento|vendaval|huracanado|ráfaga|rafaga/.test(t)) return "VENDAVAL";
  if (/colapso|pared|grieta|estructura|techo|casa|afectaci[oó]n/.test(t)) return "AFECTACION";
  return null;
}

export function extraerMetadatosNLP(texto) {
  const metadatos = { aga: null, hora: null };
  if (!texto) return metadatos;
  const matchAGA = texto.match(/\bA([0-9]{1,2})\b/i);
  if (matchAGA) metadatos.aga = "A" + matchAGA[1].padStart(2, "0");
  const matchHora = texto.match(/\b([01]?[0-9]|2[0-3])[:hH]([0-5][0-9])\b/);
  if (matchHora) metadatos.hora = matchHora[1].padStart(2, "0") + ":" + matchHora[2];
  return metadatos;
}

export function normalizarDescripcionNLP(texto) {
  return (texto || "")
    .replace(/\bREFERENCIA\b/gi, "REF.")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
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
