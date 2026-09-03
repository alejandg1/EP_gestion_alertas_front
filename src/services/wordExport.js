import JSZip from 'jszip';
import { PLANTILLA_DOCX_BASE64 } from './docxTemplate.js';
import { AGAS_WGS84 } from './agaData.js';
import { estiloMapaPorTipo, textoEventoIndividual, normalizarDescripcionNLP } from './nlpDetector.js';

const eventoWordPorTipo = {
  AGUA: "Vía con acumulación de agua",
  ARBOL: "Caída de árbol",
  DESLIZAMIENTO: "Deslizamiento de tierra",
  POSTE: "Caída de poste o cableado",
  SINIESTRO: "Siniestro de tránsito",
  INUNDACION: "Inundación",
  VENDAVAL: "Afectación por vendaval",
  AFECTACION: "Afectación estructural"
};

const mesesWord = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesesWordCorto = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PIC_NS = "http://schemas.openxmlformats.org/drawingml/2006/picture";

const LOGO_SEGURA_EP_BASE64 = "data:image/png;base64,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";

function bytesDesdeBase64(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function partesFechaISO(iso) {
  const partes = (iso || "").split("-").map(Number);
  return partes.length === 3 && partes.every(Number.isFinite) ? partes : [2026, 6, 7];
}

function fechaLargaWord(iso) {
  const [anio, mes, dia] = partesFechaISO(iso);
  return dia + " " + mesesWord[mes - 1] + " " + anio;
}

function fechaTablaWord(iso) {
  const [anio, mes, dia] = partesFechaISO(iso);
  return String(dia).padStart(2, "0") + "-" + mesesWordCorto[mes - 1] + "-" + anio;
}

function horaTablaWord(hora) {
  const limpia = (hora || "00:00").replace(":", "H");
  return limpia.toUpperCase();
}

function horaCorteWord(hora) {
  return (hora || "00:00") + ":00";
}

function hijosXML(elemento, nombreLocal) {
  return Array.from(elemento.childNodes).filter(nodo => nodo.nodeType === 1 && nodo.localName === nombreLocal);
}

function celdasFilaXML(fila) {
  return hijosXML(fila, "tc");
}

function hijoXML(elemento, nombreLocal) {
  return hijosXML(elemento, nombreLocal)[0] || null;
}

function asegurarHijoXML(documentoXML, padre, nombreLocal, antesDe) {
  let hijo = hijoXML(padre, nombreLocal);
  if (!hijo) {
    hijo = documentoXML.createElementNS(W_NS, "w:" + nombreLocal);
    if (antesDe) padre.insertBefore(hijo, antesDe);
    else padre.appendChild(hijo);
  }
  return hijo;
}

function asignarAtributoWord(nodo, nombre, valor) {
  nodo.setAttributeNS(W_NS, "w:" + nombre, valor);
}

function setTextoCeldaXML(documentoXML, celda, valor) {
  const textos = Array.from(celda.getElementsByTagNameNS(W_NS, "t"));
  const partes = String(valor == null ? "" : valor).split(/\s+\|\s+|\n/);

  if (textos.length === 0) {
    const parrafo = documentoXML.createElementNS(W_NS, "w:p");
    const run = documentoXML.createElementNS(W_NS, "w:r");
    const texto = documentoXML.createElementNS(W_NS, "w:t");
    texto.textContent = partes.join(" ");
    run.appendChild(texto);
    parrafo.appendChild(run);
    celda.appendChild(parrafo);
    return;
  }

  textos.forEach(texto => { texto.textContent = ""; });
  textos[0].textContent = partes[0] || "";
  if (partes.length > 1 && textos.length > 1) textos[1].textContent = partes.slice(1).join(" ");
  else if (partes.length > 1) textos[0].textContent = partes.join(" ");
}

function setRellenoCeldaXML(documentoXML, celda, colorHex) {
  const primerParrafo = hijoXML(celda, "p");
  const propiedadesCelda = asegurarHijoXML(documentoXML, celda, "tcPr", primerParrafo);
  const sombreado = asegurarHijoXML(documentoXML, propiedadesCelda, "shd");
  asignarAtributoWord(sombreado, "fill", colorHex);
}

function setColorTextoCeldaXML(documentoXML, celda, colorHex) {
  const runs = Array.from(celda.getElementsByTagNameNS(W_NS, "r"));
  runs.forEach(run => {
    const primerTexto = hijoXML(run, "t");
    const propiedadesRun = asegurarHijoXML(documentoXML, run, "rPr", primerTexto);
    const color = asegurarHijoXML(documentoXML, propiedadesRun, "color");
    asignarAtributoWord(color, "val", colorHex);
  });
}

function colorEstadoWord(estado) {
  if ((estado || "").includes("ATENDIDO")) return { relleno: "00B050", texto: "000000" };
  if ((estado || "").includes("ATENCIÓN") || (estado || "").includes("ATENCION")) return { relleno: "FFC000", texto: "000000" };
  return { relleno: "FF0000", texto: "000000" };
}

function numeroEventoWord(indice, total) {
  const digitos = Math.max(2, String(Math.max(1, total)).length);
  return String(indice + 1).padStart(digitos, "0");
}

function forzarFuenteNegraDocumentoWord(documentoXML) {
  const reemplazosRelleno = {
    "002060": "D9EAF7",
    "0070C0": "BDD7EE"
  };
  Array.from(documentoXML.getElementsByTagNameNS(W_NS, "shd")).forEach(sombreado => {
    const relleno = String(sombreado.getAttributeNS(W_NS, "fill") || sombreado.getAttribute("w:fill") || "").toUpperCase();
    if (reemplazosRelleno[relleno]) asignarAtributoWord(sombreado, "fill", reemplazosRelleno[relleno]);
  });
  const runs = Array.from(documentoXML.getElementsByTagNameNS(W_NS, "r"));
  runs.forEach(run => {
    const propiedadesRun = asegurarHijoXML(documentoXML, run, "rPr", run.firstChild);
    const color = asegurarHijoXML(documentoXML, propiedadesRun, "color");
    asignarAtributoWord(color, "val", "000000");
    color.removeAttributeNS(W_NS, "themeColor");
    color.removeAttributeNS(W_NS, "themeTint");
    color.removeAttributeNS(W_NS, "themeShade");
  });
}

function aplicarEstilosInstitucionalesWord(documentoXML) {
  const textos = Array.from(documentoXML.getElementsByTagNameNS(W_NS, "t"));
  textos.forEach(texto => {
    const contenido = String(texto.textContent || "").trim();
    let run = texto.parentNode;
    while (run && run.localName !== "r") run = run.parentNode;
    if (!run) return;
    const propiedadesRun = asegurarHijoXML(documentoXML, run, "rPr", run.firstChild);

    if (/sala situacional/i.test(contenido)) {
      asegurarHijoXML(documentoXML, propiedadesRun, "b");
    }
    if (/^(elaborado por:|revisado por:)/i.test(contenido)) {
      const color = asegurarHijoXML(documentoXML, propiedadesRun, "color");
      asignarAtributoWord(color, "val", "FFFFFF");
      color.removeAttributeNS(W_NS, "themeColor");
      color.removeAttributeNS(W_NS, "themeTint");
      color.removeAttributeNS(W_NS, "themeShade");
    }
  });
}

function resumenCategoriaWord(tipo, novedades) {
  const items = (novedades || []).filter(item => (item.tipo_evento || item.tipo) === tipo);
  const total = items.length;
  if (total === 0) return "Ninguno";

  const atendidos = items.filter(item => {
    const e = (item.estado_operativo || item.estado || "").toUpperCase();
    return e.includes("ATENDIDO") || e.includes("SOLUCIONADO");
  }).length;
  const enProceso = items.filter(item => {
    const e = (item.estado_operativo || item.estado || "").toUpperCase();
    return e.includes("ATENCIÓN") || e.includes("ATENCION") || e.includes("SITIO");
  }).length;
  const pendientes = total - atendidos - enProceso;
  const numero = String(total).padStart(2, "0");

  const base = {
    AGUA: numero + " zonas reportadas con acumulación de agua",
    INUNDACION: numero + (total === 1 ? " inundación" : " inundaciones"),
    ARBOL: numero + (total === 1 ? " árbol caído" : " árboles caídos"),
    AFECTACION: numero + (total === 1 ? " colapso estructural" : " colapsos estructurales"),
    DESLIZAMIENTO: numero + (total === 1 ? " deslizamiento de tierra" : " deslizamientos de tierra")
  }[tipo] || numero + " eventos";

  const femenino = tipo === "AGUA" || tipo === "INUNDACION";
  if (atendidos === total) return base + (tipo === "AGUA" ? " todas atendidas" : (femenino ? " atendidas" : " atendidos"));
  return base + ": " + atendidos + (femenino ? " atendidas, " : " atendidos, ") + enProceso + " en proceso y " + pendientes + " pendientes";
}

function fechaMapaTecnico(iso) {
  const [anio, mes, dia] = partesFechaISO(iso);
  return String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0") + "/" + anio;
}

function cargarImagenCanvas(origen) {
  return new Promise((resolve) => {
    if (!origen) return resolve(null);
    try {
      const imagen = new Image();
      imagen.crossOrigin = "anonymous";
      let resuelto = false;
      const onExito = () => {
        if (!resuelto) {
          resuelto = true;
          resolve(imagen);
        }
      };
      const onError = () => {
        if (!resuelto) {
          resuelto = true;
          resolve(null);
        }
      };
      imagen.onload = onExito;
      imagen.onerror = onError;
      imagen.src = origen;
      if (imagen.complete && imagen.naturalWidth > 0) {
        onExito();
      }
      setTimeout(() => {
        if (!resuelto) {
          if (imagen.naturalWidth > 0) onExito();
          else onError();
        }
      }, 1500);
    } catch (e) {
      resolve(null);
    }
  });
}

function valorEscalaAgradable(valor) {
  if (!Number.isFinite(valor) || valor <= 0) return 1;
  const potencia = Math.pow(10, Math.floor(Math.log10(valor)));
  const normalizado = valor / potencia;
  const base = normalizado >= 5 ? 5 : normalizado >= 2 ? 2 : 1;
  return base * potencia;
}

function dibujarTextoAjustado(contexto, texto, x, y, anchoMaximo, altoLinea, maximoLineas) {
  const palabras = String(texto || "").split(/\s+/).filter(Boolean);
  const lineas = [];
  let linea = "";
  palabras.forEach(palabra => {
    const prueba = linea ? linea + " " + palabra : palabra;
    if (contexto.measureText(prueba).width <= anchoMaximo || !linea) linea = prueba;
    else {
      lineas.push(linea);
      linea = palabra;
    }
  });
  if (linea) lineas.push(linea);
  const visibles = lineas.slice(0, maximoLineas || lineas.length);
  if (lineas.length > visibles.length && visibles.length) visibles[visibles.length - 1] = visibles[visibles.length - 1].replace(/[.,;:]?$/, "…");
  visibles.forEach((valor, indice) => contexto.fillText(valor, x, y + indice * altoLinea));
  return visibles.length;
}

function limitesMapaTecnico(eventos, anchoGrafico, altoGrafico) {
  let xMin = Math.min.apply(null, eventos.map(item => item.lng));
  let xMax = Math.max.apply(null, eventos.map(item => item.lng));
  let yMin = Math.min.apply(null, eventos.map(item => item.lat));
  let yMax = Math.max.apply(null, eventos.map(item => item.lat));
  const latMedia = (yMin + yMax) / 2;
  const coseno = Math.max(0.2, Math.cos(latMedia * Math.PI / 180));

  let rangoX = Math.max(xMax - xMin, 0.018);
  let rangoY = Math.max(yMax - yMin, 0.018);
  const proporcionGrafico = anchoGrafico / altoGrafico;
  const proporcionGeografica = (rangoX * coseno) / rangoY;
  if (proporcionGeografica < proporcionGrafico) rangoX = rangoY * proporcionGrafico / coseno;
  else rangoY = rangoX * coseno / proporcionGrafico;

  const centroX = (xMin + xMax) / 2;
  const centroY = (yMin + yMax) / 2;
  rangoX *= 1.28;
  rangoY *= 1.28;
  return {
    xMin: centroX - rangoX / 2,
    xMax: centroX + rangoX / 2,
    yMin: centroY - rangoY / 2,
    yMax: centroY + rangoY / 2,
    latMedia: centroY
  };
}

function dibujarFlechaNorte(contexto, centroX, ySuperior) {
  contexto.save();
  contexto.fillStyle = "#0a3d62";
  contexto.strokeStyle = "#0a3d62";
  contexto.lineWidth = 3;
  contexto.font = "700 28px Segoe UI, Arial";
  contexto.textAlign = "center";
  contexto.fillText("N", centroX, ySuperior);
  contexto.beginPath();
  contexto.moveTo(centroX, ySuperior + 12);
  contexto.lineTo(centroX - 18, ySuperior + 72);
  contexto.lineTo(centroX, ySuperior + 58);
  contexto.lineTo(centroX + 18, ySuperior + 72);
  contexto.closePath();
  contexto.fill();
  contexto.beginPath();
  contexto.moveTo(centroX, ySuperior + 17);
  contexto.lineTo(centroX, ySuperior + 88);
  contexto.stroke();
  contexto.restore();
}

function dibujarEscalaGrafica(contexto, limites, proyeccionX, x, y, anchoObjetivo) {
  const kmPorGrado = 111.32 * Math.max(0.2, Math.cos(limites.latMedia * Math.PI / 180));
  const gradosPorPixel = (limites.xMax - limites.xMin) / anchoObjetivo.totalGrafico;
  const kmObjetivo = anchoObjetivo.pixeles * gradosPorPixel * kmPorGrado;
  const km = valorEscalaAgradable(kmObjetivo);
  const ancho = (km / kmPorGrado) / (limites.xMax - limites.xMin) * anchoObjetivo.totalGrafico;
  const mitad = ancho / 2;
  contexto.save();
  contexto.fillStyle = "rgba(255,255,255,0.9)";
  contexto.fillRect(x - 12, y - 28, ancho + 24, 55);
  contexto.fillStyle = "#0a3d62";
  contexto.fillRect(x, y, mitad, 10);
  contexto.strokeStyle = "#0a3d62";
  contexto.lineWidth = 2;
  contexto.strokeRect(x, y, ancho, 10);
  contexto.beginPath();
  contexto.moveTo(x, y - 5); contexto.lineTo(x, y + 16);
  contexto.moveTo(x + mitad, y - 3); contexto.lineTo(x + mitad, y + 13);
  contexto.moveTo(x + ancho, y - 5); contexto.lineTo(x + ancho, y + 16);
  contexto.stroke();
  contexto.font = "600 16px Segoe UI, Arial";
  contexto.textAlign = "center";
  contexto.fillText("0", x, y - 8);
  contexto.fillText((km / 2).toLocaleString("es-EC", { maximumFractionDigits: 2 }), x + mitad, y - 8);
  contexto.fillText(km.toLocaleString("es-EC", { maximumFractionDigits: 2 }) + " km", x + ancho, y - 8);
  contexto.restore();
}

function dibujarDensidadMapa(contextoDestino, eventos, proyectar, ancho, alto, area) {
  const capa = document.createElement("canvas");
  capa.width = ancho;
  capa.height = alto;
  const contexto = capa.getContext("2d", { willReadFrequently: true });
  contexto.globalCompositeOperation = "lighter";
  const radio = Math.max(58, Math.min(115, Math.round(Math.min(area.ancho, area.alto) * 0.13)));
  eventos.forEach(item => {
    const punto = proyectar(item.lng, item.lat);
    const gradiente = contexto.createRadialGradient(punto.x, punto.y, 0, punto.x, punto.y, radio);
    gradiente.addColorStop(0, "rgba(0,0,0,0.72)");
    gradiente.addColorStop(0.3, "rgba(0,0,0,0.46)");
    gradiente.addColorStop(0.68, "rgba(0,0,0,0.18)");
    gradiente.addColorStop(1, "rgba(0,0,0,0)");
    contexto.fillStyle = gradiente;
    contexto.fillRect(punto.x - radio, punto.y - radio, radio * 2, radio * 2);
  });
  contexto.globalCompositeOperation = "source-over";
  const imagen = contexto.getImageData(area.x, area.y, area.ancho, area.alto);
  const pixeles = imagen.data;
  for (let i = 0; i < pixeles.length; i += 4) {
    const intensidad = pixeles[i + 3] / 255;
    if (intensidad < 0.025) pixeles[i + 3] = 0;
    else if (intensidad < 0.28) {
      pixeles[i] = 22; pixeles[i + 1] = 128; pixeles[i + 2] = 240; pixeles[i + 3] = Math.round(40 + intensidad * 300);
    } else if (intensidad < 0.52) {
      pixeles[i] = 30; pixeles[i + 1] = 190; pixeles[i + 2] = 100; pixeles[i + 3] = Math.round(72 + intensidad * 250);
    } else if (intensidad < 0.76) {
      pixeles[i] = 255; pixeles[i + 1] = 196; pixeles[i + 2] = 36; pixeles[i + 3] = Math.round(105 + intensidad * 190);
    } else {
      pixeles[i] = 220; pixeles[i + 1] = 45; pixeles[i + 2] = 35; pixeles[i + 3] = 220;
    }
    pixeles[i + 3] = Math.round(pixeles[i + 3] * 0.50);
  }
  contexto.putImageData(imagen, area.x, area.y);
  contextoDestino.drawImage(capa, 0, 0);
}

function etiquetaTecnicaAGA(poligono, indiceGlobal) {
  return poligono.nombre || ("A" + String(indiceGlobal + 1).padStart(2, "0"));
}

function normalizarEventosParaWord(novedades) {
  const lista = Array.isArray(novedades) ? novedades : [];
  return lista.map(item => {
    const lat = Number(item.coordenadas?.lat ?? item.latitud ?? item.lat);
    const lng = Number(item.coordenadas?.lng ?? item.longitud ?? item.lng);
    return {
      _id: item._id,
      tipo: item.tipo_evento || item.tipo || 'AGUA',
      fecha: item.fecha_evento || item.fecha || '',
      hora: item.hora_evento || item.hora || '00:00',
      aga: item.aga || 'N/D',
      dir: item.direccion || item.dir || '',
      recurso: item.recurso_asignado || item.recurso || 'INS-ALC 🚙',
      estado: item.estado_operativo || item.estado || '⛔PENDIENTE',
      lat: Number.isFinite(lat) ? lat : NaN,
      lng: Number.isFinite(lng) ? lng : NaN,
      fotos: item.fotos || []
    };
  });
}

const ORDEN_TIPOS_REPORTE = ["AGUA", "ARBOL", "DESLIZAMIENTO", "POSTE", "SINIESTRO", "INUNDACION", "VENDAVAL", "AFECTACION"];

function ordenarEventosReporte(lista) {
  const resultado = [];
  ORDEN_TIPOS_REPORTE.forEach(tipo => {
    lista.forEach(item => {
      if (item.tipo === tipo) resultado.push(item);
    });
  });
  lista.forEach(item => {
    if (!ORDEN_TIPOS_REPORTE.includes(item.tipo)) resultado.push(item);
  });
  return resultado;
}

async function generarMapaTecnicoWord(eventosValidos, fechaISO) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1050;
  const contexto = canvas.getContext("2d", { alpha: false });
  if (!contexto) throw new Error("No se pudo inicializar el lienzo gráfico para el mapa.");

  const area = { x: 82, y: 162, ancho: 1130, alto: 742 };
  const panelX = 1242;

  const eventos = eventosValidos.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  const limites = eventos.length
    ? limitesMapaTecnico(eventos, area.ancho, area.alto)
    : { xMin: -80.05, xMax: -79.80, yMin: -2.30, yMax: -2.05, latMedia: -2.17 };

  const proyectar = (lng, lat) => ({
    x: area.x + (lng - limites.xMin) / (limites.xMax - limites.xMin) * area.ancho,
    y: area.y + (limites.yMax - lat) / (limites.yMax - limites.yMin) * area.alto
  });

  contexto.fillStyle = "#f4f7f9";
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.fillStyle = "#0a3d62";
  contexto.fillRect(0, 0, canvas.width, 118);
  contexto.fillStyle = "#ffffff";
  contexto.font = "700 39px Segoe UI, Arial";
  contexto.textAlign = "left";
  contexto.fillText("Georreferenciación de Eventos " + fechaMapaTecnico(fechaISO), 82, 58);
  contexto.font = "700 20px Segoe UI, Arial";
  contexto.fillStyle = "#dcebf4";
  contexto.fillText("Mapa técnico de localización y densidad de eventos · Sala Situacional de Segura EP", 84, 91);

  contexto.fillStyle = "#e8eef2";
  contexto.fillRect(area.x, area.y, area.ancho, area.alto);
  contexto.save();
  contexto.beginPath();
  contexto.rect(area.x, area.y, area.ancho, area.alto);
  contexto.clip();

  const agaVisibles = AGAS_WGS84.filter(poligono => {
    const [xmin, ymin, xmax, ymax] = poligono.bbox;
    return xmax >= limites.xMin && xmin <= limites.xMax && ymax >= limites.yMin && ymin <= limites.yMax;
  });

  agaVisibles.forEach((poligono, indice) => {
    contexto.beginPath();
    poligono.rings.forEach(anillo => {
      anillo.forEach((coordenada, posicion) => {
        const punto = proyectar(coordenada[0], coordenada[1]);
        if (posicion === 0) contexto.moveTo(punto.x, punto.y);
        else contexto.lineTo(punto.x, punto.y);
      });
      contexto.closePath();
    });
    contexto.fillStyle = indice % 2 ? "rgba(151,195,218,0.19)" : "rgba(108,172,205,0.16)";
    contexto.strokeStyle = "rgba(10,61,98,0.70)";
    contexto.lineWidth = 1.35;
    contexto.fill("evenodd");
    contexto.stroke();
  });

  contexto.strokeStyle = "rgba(65,91,108,0.27)";
  contexto.fillStyle = "#50636f";
  contexto.lineWidth = 1;
  contexto.font = "500 14px Consolas, monospace";
  for (let i = 0; i <= 5; i++) {
    const x = area.x + i * area.ancho / 5;
    const lng = limites.xMin + i * (limites.xMax - limites.xMin) / 5;
    contexto.beginPath(); contexto.moveTo(x, area.y); contexto.lineTo(x, area.y + area.alto); contexto.stroke();
    contexto.textAlign = "center";
    contexto.fillText(lng.toFixed(4) + "°", x, area.y + area.alto + 23);
  }
  for (let i = 0; i <= 5; i++) {
    const y = area.y + i * area.alto / 5;
    const lat = limites.yMax - i * (limites.yMax - limites.yMin) / 5;
    contexto.beginPath(); contexto.moveTo(area.x, y); contexto.lineTo(area.x + area.ancho, y); contexto.stroke();
    contexto.textAlign = "right";
    contexto.fillText(lat.toFixed(4) + "°", area.x - 8, y + 5);
  }

  if (eventos.length > 0) {
    dibujarDensidadMapa(contexto, eventos, proyectar, canvas.width, canvas.height, area);
  }

  agaVisibles.forEach(poligono => {
    const indiceGlobal = AGAS_WGS84.indexOf(poligono);
    const verticesVisibles = poligono.rings.flat().filter(coordenada =>
      coordenada[0] >= limites.xMin && coordenada[0] <= limites.xMax &&
      coordenada[1] >= limites.yMin && coordenada[1] <= limites.yMax
    );
    const lngCentro = verticesVisibles.length
      ? verticesVisibles.reduce((suma, coordenada) => suma + coordenada[0], 0) / verticesVisibles.length
      : Math.max(limites.xMin, Math.min(limites.xMax, (poligono.bbox[0] + poligono.bbox[2]) / 2));
    const latCentro = verticesVisibles.length
      ? verticesVisibles.reduce((suma, coordenada) => suma + coordenada[1], 0) / verticesVisibles.length
      : Math.max(limites.yMin, Math.min(limites.yMax, (poligono.bbox[1] + poligono.bbox[3]) / 2));
    const centro = proyectar(lngCentro, latCentro);
    const rotulo = etiquetaTecnicaAGA(poligono, indiceGlobal);
    contexto.font = "800 13px Segoe UI, Arial";
    contexto.lineWidth = 4;
    contexto.lineJoin = "round";
    contexto.strokeStyle = "rgba(255,255,255,0.96)";
    contexto.textAlign = "center";
    contexto.strokeText(rotulo, centro.x, centro.y + 4);
    contexto.fillStyle = "#0a3d62";
    contexto.fillText(rotulo, centro.x, centro.y + 4);
  });

  eventos.forEach((item, indice) => {
    const punto = proyectar(item.lng, item.lat);
    const estilo = estiloMapaPorTipo[item.tipo] || { color: "#0a3d62", emoji: "📍" };
    const numeroMapa = numeroEventoWord(indice, eventos.length);
    const radioPunto = numeroMapa.length > 2 ? 16 : 14;
    contexto.beginPath();
    contexto.arc(punto.x, punto.y, radioPunto, 0, Math.PI * 2);
    contexto.fillStyle = estilo.color;
    contexto.fill();
    contexto.strokeStyle = "#ffffff";
    contexto.lineWidth = 3;
    contexto.stroke();
    contexto.font = "700 " + (numeroMapa.length > 2 ? 9 : 10) + "px Segoe UI, Arial";
    contexto.fillStyle = "#ffffff";
    contexto.textAlign = "center";
    contexto.fillText(numeroMapa, punto.x, punto.y + 4);
  });
  contexto.restore();

  contexto.fillStyle = "#50636f";
  contexto.font = "500 14px Consolas, monospace";
  for (let i = 0; i <= 5; i++) {
    const x = area.x + i * area.ancho / 5;
    const lng = limites.xMin + i * (limites.xMax - limites.xMin) / 5;
    contexto.textAlign = "center";
    contexto.fillText(lng.toFixed(4) + "°", x, area.y + area.alto + 23);
  }
  for (let i = 0; i <= 5; i++) {
    const y = area.y + i * area.alto / 5;
    const lat = limites.yMax - i * (limites.yMax - limites.yMin) / 5;
    contexto.textAlign = "right";
    contexto.fillText(lat.toFixed(4) + "°", area.x - 8, y + 5);
  }

  contexto.strokeStyle = "#0a3d62";
  contexto.lineWidth = 2;
  contexto.strokeRect(area.x, area.y, area.ancho, area.alto);
  dibujarEscalaGrafica(contexto, limites, proyectar, area.x + 35, area.y + area.alto - 34, { pixeles: 190, totalGrafico: area.ancho });

  contexto.fillStyle = "#ffffff";
  contexto.strokeStyle = "#b9c9d3";
  contexto.lineWidth = 1.5;
  contexto.fillRect(panelX, 142, 304, 762);
  contexto.strokeRect(panelX, 142, 304, 762);

  let logo = await cargarImagenCanvas(LOGO_SEGURA_EP_BASE64);
  if (!logo) {
    logo = await cargarImagenCanvas('/icons/logo_segura.png');
  }
  if (!logo) {
    const logoNodo = document.querySelector('.header-logo-secondary') || document.querySelector('.header-logo');
    if (logoNodo && logoNodo.src) {
      logo = await cargarImagenCanvas(logoNodo.src);
    }
  }

  if (logo && logo.width > 0 && logo.height > 0) {
    const maxAncho = 176;
    const maxAlto = 112;
    const factor = Math.min(maxAncho / logo.width, maxAlto / logo.height);
    const anchoLogo = logo.width * factor;
    const altoLogo = logo.height * factor;
    contexto.drawImage(logo, panelX + (304 - anchoLogo) / 2, 162 + (maxAlto - altoLogo) / 2, anchoLogo, altoLogo);
  } else {
    contexto.fillStyle = "#0a3d62";
    contexto.font = "700 24px Segoe UI, Arial";
    contexto.textAlign = "center";
    contexto.fillText("SEGURA EP", panelX + 152, 220);
  }
  dibujarFlechaNorte(contexto, panelX + 250, 178);

  contexto.fillStyle = "#0a3d62";
  contexto.font = "700 21px Segoe UI, Arial";
  contexto.textAlign = "left";
  contexto.fillText("LEYENDA", panelX + 24, 314);
  contexto.fillStyle = "#d8e3e9";
  contexto.fillRect(panelX + 24, 326, 256, 2);

  const tiposPresentes = Array.from(new Set(eventos.map(item => item.tipo)));
  let leyendaY = 361;
  tiposPresentes.forEach(tipo => {
    const estilo = estiloMapaPorTipo[tipo] || { color: "#0a3d62", emoji: "📍" };
    contexto.beginPath(); contexto.arc(panelX + 38, leyendaY - 5, 9, 0, Math.PI * 2);
    contexto.fillStyle = estilo.color; contexto.fill();
    contexto.strokeStyle = "#ffffff"; contexto.lineWidth = 2; contexto.stroke();
    contexto.fillStyle = "#263b47";
    contexto.font = "600 13px Segoe UI, Arial";
    contexto.textAlign = "left";
    dibujarTextoAjustado(contexto, (textoEventoIndividual[tipo] || tipo).toUpperCase(), panelX + 58, leyendaY, 210, 16, 1);
    leyendaY += 30;
  });

  contexto.fillStyle = "#263b47";
  contexto.font = "700 15px Segoe UI, Arial";
  contexto.fillText("DENSIDAD DE EVENTOS", panelX + 24, leyendaY + 6);
  const gradienteDensidad = contexto.createLinearGradient(panelX + 24, 0, panelX + 270, 0);
  gradienteDensidad.addColorStop(0, "#1680f0");
  gradienteDensidad.addColorStop(0.35, "#1ebe64");
  gradienteDensidad.addColorStop(0.68, "#ffc424");
  gradienteDensidad.addColorStop(1, "#dc2d23");
  contexto.fillStyle = gradienteDensidad;
  contexto.fillRect(panelX + 24, leyendaY + 18, 246, 16);
  contexto.font = "500 13px Segoe UI, Arial";
  contexto.fillStyle = "#50636f";
  contexto.fillText("BAJA", panelX + 24, leyendaY + 52);
  contexto.textAlign = "right";
  contexto.fillText("ALTA", panelX + 270, leyendaY + 52);

  leyendaY += 88;
  contexto.textAlign = "left";
  contexto.fillStyle = "#0a3d62";
  contexto.font = "700 17px Segoe UI, Arial";
  contexto.fillText("INFORMACIÓN TÉCNICA", panelX + 24, leyendaY);
  contexto.fillStyle = "#263b47";
  contexto.font = "500 14px Segoe UI, Arial";
  const ficha = [
    "Sistema: WGS 84",
    "EPSG: 4326",
    "Geometría: puntos",
    "Eventos: " + eventos.length,
    "AGA visibles: " + agaVisibles.length,
    "Método: densidad kernel"
  ];
  ficha.forEach((linea, indice) => contexto.fillText(linea, panelX + 24, leyendaY + 29 + indice * 23));

  contexto.fillStyle = "#0a3d62";
  contexto.fillRect(0, 972, canvas.width, 78);
  contexto.fillStyle = "#ffffff";
  contexto.font = "600 17px Segoe UI, Arial";
  contexto.textAlign = "left";
  contexto.fillText("Fuente: Registro diario de eventos · Límites AGA institucionales · Elaboración cartográfica automática", 82, 1004);
  contexto.font = "700 15px Segoe UI, Arial";
  contexto.fillStyle = "#dcebf4";
  contexto.fillText("Elaborado y gestionado por: Sala Situacional de Segura EP.", 82, 1031);
  contexto.textAlign = "right";
  contexto.fillText("Fecha del mapa: " + fechaMapaTecnico(fechaISO), 1518, 1031);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.96));
  if (!blob) throw new Error("El navegador no pudo crear la imagen cartográfica.");
  return { blob, titulo: "Georreferenciación de Eventos " + fechaMapaTecnico(fechaISO), total: eventos.length };
}

async function agregarImagenMapaAlPaqueteWord(zip, blobMapa) {
  const REL_PACKAGE_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
  const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
  const bytesMapa = new Uint8Array(await blobMapa.arrayBuffer());
  if (bytesMapa.length < 8 || bytesMapa[0] !== 0x89 || bytesMapa[1] !== 0x50 || bytesMapa[2] !== 0x4E || bytesMapa[3] !== 0x47) {
    throw new Error("La imagen cartográfica generada no tiene una estructura PNG válida.");
  }

  const rutaRelaciones = "word/_rels/document.xml.rels";
  const archivoRelaciones = zip.file(rutaRelaciones);
  if (!archivoRelaciones) throw new Error("La plantilla Word no contiene las relaciones del documento.");
  const relacionesTexto = await archivoRelaciones.async("string");
  const relacionesXML = new DOMParser().parseFromString(relacionesTexto, "application/xml");
  if (relacionesXML.getElementsByTagName("parsererror").length) throw new Error("No se pudieron actualizar las relaciones internas del Word.");
  let indice = 11;
  let idRelacion = "rId" + indice;
  const idsExistentes = new Set(Array.from(relacionesXML.documentElement.childNodes)
    .filter(nodo => nodo.nodeType === 1)
    .map(nodo => nodo.getAttribute("Id")));
  while (idsExistentes.has(idRelacion)) idRelacion = "rId" + (++indice);
  const relacion = relacionesXML.createElementNS(REL_PACKAGE_NS, "Relationship");
  relacion.setAttribute("Id", idRelacion);
  relacion.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
  relacion.setAttribute("Target", "media/mapa_eventos.png");
  relacionesXML.documentElement.appendChild(relacion);
  zip.file(rutaRelaciones, new XMLSerializer().serializeToString(relacionesXML));

  const archivoTipos = zip.file("[Content_Types].xml");
  if (!archivoTipos) throw new Error("La plantilla Word no contiene la declaración de tipos de contenido.");
  const tiposTexto = await archivoTipos.async("string");
  const tiposXML = new DOMParser().parseFromString(tiposTexto, "application/xml");
  if (tiposXML.getElementsByTagName("parsererror").length) throw new Error("No se pudieron actualizar los tipos de contenido del Word.");
  const pngDeclarado = Array.from(tiposXML.documentElement.childNodes).filter(nodo => nodo.nodeType === 1).some(nodo =>
    nodo.localName === "Default" && String(nodo.getAttribute("Extension") || "").toLowerCase() === "png"
  );
  if (!pngDeclarado) {
    const tipoPNG = tiposXML.createElementNS(CT_NS, "Default");
    tipoPNG.setAttribute("Extension", "png");
    tipoPNG.setAttribute("ContentType", "image/png");
    tiposXML.documentElement.insertBefore(tipoPNG, tiposXML.documentElement.firstChild);
    zip.file("[Content_Types].xml", new XMLSerializer().serializeToString(tiposXML));
  }

  zip.file("word/media/mapa_eventos.png", bytesMapa, { binary: true });
  return idRelacion;
}

function elementoXML(documentoXML, espacio, nombre) {
  return documentoXML.createElementNS(espacio, nombre);
}

function crearParrafoTextoWord(documentoXML, texto, negrita, tamano) {
  const parrafo = elementoXML(documentoXML, W_NS, "w:p");
  const propiedadesParrafo = elementoXML(documentoXML, W_NS, "w:pPr");
  const alineacion = elementoXML(documentoXML, W_NS, "w:jc");
  asignarAtributoWord(alineacion, "val", "center");
  propiedadesParrafo.appendChild(alineacion);
  parrafo.appendChild(propiedadesParrafo);
  const run = elementoXML(documentoXML, W_NS, "w:r");
  const propiedadesRun = elementoXML(documentoXML, W_NS, "w:rPr");
  if (negrita) propiedadesRun.appendChild(elementoXML(documentoXML, W_NS, "w:b"));
  const colorNodo = elementoXML(documentoXML, W_NS, "w:color");
  asignarAtributoWord(colorNodo, "val", "000000");
  propiedadesRun.appendChild(colorNodo);
  const tamanoNodo = elementoXML(documentoXML, W_NS, "w:sz");
  asignarAtributoWord(tamanoNodo, "val", String(tamano || 18));
  propiedadesRun.appendChild(tamanoNodo);
  run.appendChild(propiedadesRun);
  const textoNodo = elementoXML(documentoXML, W_NS, "w:t");
  textoNodo.textContent = texto;
  run.appendChild(textoNodo);
  parrafo.appendChild(run);
  return parrafo;
}

function insertarMapaEnDocumentoWord(documentoXML, idRelacion, tituloMapa, totalEventos) {
  const cuerpo = documentoXML.getElementsByTagNameNS(W_NS, "body")[0];
  const seccion = hijosXML(cuerpo, "sectPr")[0] || null;
  const insertar = nodo => seccion ? cuerpo.insertBefore(nodo, seccion) : cuerpo.appendChild(nodo);

  if (seccion) {
    const cierreSeccion = elementoXML(documentoXML, W_NS, "w:p");
    const propiedadesCierre = elementoXML(documentoXML, W_NS, "w:pPr");
    const seccionRetrato = seccion.cloneNode(true);
    const tipoSeccion = asegurarHijoXML(documentoXML, seccionRetrato, "type", seccionRetrato.firstChild);
    asignarAtributoWord(tipoSeccion, "val", "nextPage");
    propiedadesCierre.appendChild(seccionRetrato);
    cierreSeccion.appendChild(propiedadesCierre);
    insertar(cierreSeccion);

    const tamanoPagina = asegurarHijoXML(documentoXML, seccion, "pgSz", seccion.firstChild);
    asignarAtributoWord(tamanoPagina, "w", "15840");
    asignarAtributoWord(tamanoPagina, "h", "12240");
    asignarAtributoWord(tamanoPagina, "orient", "landscape");
    const margenes = asegurarHijoXML(documentoXML, seccion, "pgMar");
    ["top", "bottom", "left", "right"].forEach(nombre => asignarAtributoWord(margenes, nombre, "540"));
  } else {
    const salto = elementoXML(documentoXML, W_NS, "w:p");
    const runSalto = elementoXML(documentoXML, W_NS, "w:r");
    const br = elementoXML(documentoXML, W_NS, "w:br");
    asignarAtributoWord(br, "type", "page");
    runSalto.appendChild(br);
    salto.appendChild(runSalto);
    insertar(salto);
  }

  insertar(crearParrafoTextoWord(documentoXML, "ANEXO CARTOGRÁFICO", true, 22));
  insertar(crearParrafoTextoWord(documentoXML, tituloMapa, true, 18));

  const parrafo = elementoXML(documentoXML, W_NS, "w:p");
  const propiedadesParrafo = elementoXML(documentoXML, W_NS, "w:pPr");
  const alineacion = elementoXML(documentoXML, W_NS, "w:jc");
  asignarAtributoWord(alineacion, "val", "center");
  propiedadesParrafo.appendChild(alineacion);
  const espaciado = elementoXML(documentoXML, W_NS, "w:spacing");
  asignarAtributoWord(espaciado, "before", "0");
  asignarAtributoWord(espaciado, "after", "0");
  propiedadesParrafo.appendChild(espaciado);
  parrafo.appendChild(propiedadesParrafo);
  const run = elementoXML(documentoXML, W_NS, "w:r");
  const dibujo = elementoXML(documentoXML, W_NS, "w:drawing");
  const inline = elementoXML(documentoXML, WP_NS, "wp:inline");
  ["distT", "distB", "distL", "distR"].forEach(nombre => inline.setAttribute(nombre, "0"));
  const cx = 8778240;
  const cy = 5760720;
  const extension = elementoXML(documentoXML, WP_NS, "wp:extent");
  extension.setAttribute("cx", String(cx)); extension.setAttribute("cy", String(cy));
  inline.appendChild(extension);
  const efecto = elementoXML(documentoXML, WP_NS, "wp:effectExtent");
  efecto.setAttribute("l", "0"); efecto.setAttribute("t", "0");
  efecto.setAttribute("r", "0"); efecto.setAttribute("b", "0");
  inline.appendChild(efecto);
  const docPr = elementoXML(documentoXML, WP_NS, "wp:docPr");
  docPr.setAttribute("id", "9001");
  docPr.setAttribute("name", "Mapa técnico de eventos y densidad");
  docPr.setAttribute("descr", tituloMapa + ". " + totalEventos + " eventos georreferenciados.");
  inline.appendChild(docPr);
  const marco = elementoXML(documentoXML, WP_NS, "wp:cNvGraphicFramePr");
  const bloqueo = elementoXML(documentoXML, A_NS, "a:graphicFrameLocks");
  bloqueo.setAttribute("noChangeAspect", "1");
  marco.appendChild(bloqueo);
  inline.appendChild(marco);
  const grafico = elementoXML(documentoXML, A_NS, "a:graphic");
  const datosGrafico = elementoXML(documentoXML, A_NS, "a:graphicData");
  datosGrafico.setAttribute("uri", "http://schemas.openxmlformats.org/drawingml/2006/picture");
  const imagen = elementoXML(documentoXML, PIC_NS, "pic:pic");
  const propiedadesImagen = elementoXML(documentoXML, PIC_NS, "pic:nvPicPr");
  const nombreImagen = elementoXML(documentoXML, PIC_NS, "pic:cNvPr");
  nombreImagen.setAttribute("id", "9002");
  nombreImagen.setAttribute("name", "mapa_eventos.png");
  nombreImagen.setAttribute("descr", tituloMapa);
  propiedadesImagen.appendChild(nombreImagen);
  const propiedadesNoVisuales = elementoXML(documentoXML, PIC_NS, "pic:cNvPicPr");
  const bloqueoImagen = elementoXML(documentoXML, A_NS, "a:picLocks");
  bloqueoImagen.setAttribute("noChangeAspect", "1");
  propiedadesNoVisuales.appendChild(bloqueoImagen);
  propiedadesImagen.appendChild(propiedadesNoVisuales);
  imagen.appendChild(propiedadesImagen);
  const rellenoImagen = elementoXML(documentoXML, PIC_NS, "pic:blipFill");
  const blip = elementoXML(documentoXML, A_NS, "a:blip");
  blip.setAttributeNS(R_NS, "r:embed", idRelacion);
  rellenoImagen.appendChild(blip);
  const estirar = elementoXML(documentoXML, A_NS, "a:stretch");
  estirar.appendChild(elementoXML(documentoXML, A_NS, "a:fillRect"));
  rellenoImagen.appendChild(estirar);
  imagen.appendChild(rellenoImagen);
  const forma = elementoXML(documentoXML, PIC_NS, "pic:spPr");
  const transformacion = elementoXML(documentoXML, A_NS, "a:xfrm");
  const desplazamiento = elementoXML(documentoXML, A_NS, "a:off");
  desplazamiento.setAttribute("x", "0"); desplazamiento.setAttribute("y", "0");
  const extensionForma = elementoXML(documentoXML, A_NS, "a:ext");
  extensionForma.setAttribute("cx", String(cx)); extensionForma.setAttribute("cy", String(cy));
  transformacion.appendChild(desplazamiento); transformacion.appendChild(extensionForma);
  forma.appendChild(transformacion);
  const geometria = elementoXML(documentoXML, A_NS, "a:prstGeom");
  geometria.setAttribute("prst", "rect");
  geometria.appendChild(elementoXML(documentoXML, A_NS, "a:avLst"));
  forma.appendChild(geometria);
  imagen.appendChild(forma);
  datosGrafico.appendChild(imagen);
  grafico.appendChild(datosGrafico);
  inline.appendChild(grafico);
  dibujo.appendChild(inline);
  run.appendChild(dibujo);
  parrafo.appendChild(run);
  insertar(parrafo);
  insertar(crearParrafoTextoWord(documentoXML, "Figura 1. " + tituloMapa + ". Densidad kernel y eventos registrados (WGS 84 / EPSG:4326).", true, 16));
  insertar(crearParrafoTextoWord(documentoXML, "Fuente: Sala Situacional de Segura EP. Total de eventos georreferenciados: " + totalEventos + ".", true, 15));
}

export function nombreArchivoWord(reporte) {
  const numero = (reporte?.numero_rds || "SEGURA-EP-GASGEC-SS-2026").trim();
  return ("RDS-" + numero + ".docx")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function exportarReporteWord(reporte, novedadesFuente) {
  if (typeof JSZip === "undefined") throw new Error("No se pudo inicializar el generador de documentos.");

  const zip = await JSZip.loadAsync(bytesDesdeBase64(PLANTILLA_DOCX_BASE64));
  const archivoDocumento = zip.file("word/document.xml");
  if (!archivoDocumento) throw new Error("La plantilla institucional no contiene el documento principal.");

  const xmlTexto = await archivoDocumento.async("string");
  const documentoXML = new DOMParser().parseFromString(xmlTexto, "application/xml");
  if (documentoXML.getElementsByTagName("parsererror").length) throw new Error("No se pudo interpretar la plantilla Word.");

  const tabla = documentoXML.getElementsByTagNameNS(W_NS, "tbl")[0];
  const filas = hijosXML(tabla, "tr");
  if (filas.length < 43) throw new Error("La estructura de la plantilla institucional no es la esperada.");

  const filaEventoClara = filas[6].cloneNode(true);
  const filaEventoAzul = filas[7].cloneNode(true);
  const filaAnclaResumen = filas[37];

  for (let i = 6; i <= 36; i++) tabla.removeChild(filas[i]);

  const novedadesNormalizadas = normalizarEventosParaWord(novedadesFuente || reporte.novedades || []);
  const eventosOrdenadosWord = ordenarEventosReporte(novedadesNormalizadas);
  const eventosWord = eventosOrdenadosWord.length ? eventosOrdenadosWord : [{
    tipo: "AGUA",
    fecha: reporte.fecha_reporte || new Date().toISOString().split('T')[0],
    aga: "N/D",
    hora: "00:00",
    dir: "NO SE REGISTRARON EVENTOS RELEVANTES DURANTE EL PERIODO DE CORTE",
    recurso: "N/A",
    estado: "✅ATENDIDO",
    lat: NaN,
    lng: NaN
  }];

  eventosWord.forEach((item, indice) => {
    const fila = (indice % 2 === 0 ? filaEventoClara : filaEventoAzul).cloneNode(true);
    const celdas = celdasFilaXML(fila);
    const fechaBase = item.fecha || reporte.fecha_reporte || new Date().toISOString().split('T')[0];
    const tipoEvento = eventoWordPorTipo[item.tipo] || textoEventoIndividual[item.tipo] || "Evento relevante";

    setTextoCeldaXML(documentoXML, celdas[0], numeroEventoWord(indice, eventosWord.length) + ".- " + tipoEvento);
    setTextoCeldaXML(documentoXML, celdas[1], fechaTablaWord(fechaBase));
    setTextoCeldaXML(documentoXML, celdas[2], (item.aga || "N/D").toUpperCase());
    setTextoCeldaXML(documentoXML, celdas[3], horaTablaWord(item.hora));
    setTextoCeldaXML(documentoXML, celdas[4], normalizarDescripcionNLP(item.dir));
    setTextoCeldaXML(documentoXML, celdas[5], (item.recurso || "N/A").toUpperCase());

    const colores = colorEstadoWord(item.estado);
    setRellenoCeldaXML(documentoXML, celdas[5], colores.relleno);
    setColorTextoCeldaXML(documentoXML, celdas[5], colores.texto);
    tabla.insertBefore(fila, filaAnclaResumen);
  });

  const numeroRds = (reporte.numero_rds || "").trim() || "SEGURA-EP-GASGEC-SS-2026-001";
  const fechaReporte = reporte.fecha_reporte || new Date().toISOString().split('T')[0];
  const horaInicio = reporte.hora_inicio || "06:00";
  const horaFin = reporte.hora_fin || "22:00";
  const elaboradoTexto = (reporte.elaborado_por || (Array.isArray(reporte.colaboradores) && reporte.colaboradores.length ? reporte.colaboradores.map(c => c.nombre || c).join(', ') : '') || "Sala Situacional").trim();
  const revisadoTexto = (reporte.revisado_por || "Coordinador de Sala Situacional").trim();

  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[1])[1], "RDS#: " + numeroRds);
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[2])[2], fechaLargaWord(fechaReporte));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[2])[3], horaCorteWord(horaInicio) + " – " + horaCorteWord(horaFin));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[3])[1], elaboradoTexto);
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[3])[3], revisadoTexto);

  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[38])[1], resumenCategoriaWord("AGUA", novedadesNormalizadas));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[39])[1], resumenCategoriaWord("INUNDACION", novedadesNormalizadas));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[40])[1], resumenCategoriaWord("ARBOL", novedadesNormalizadas));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[41])[1], resumenCategoriaWord("AFECTACION", novedadesNormalizadas));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[42])[1], resumenCategoriaWord("DESLIZAMIENTO", novedadesNormalizadas));

  const eventosGeoreferenciados = novedadesNormalizadas.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  const mapaTecnico = await generarMapaTecnicoWord(eventosGeoreferenciados, fechaReporte);
  const idRelacionMapa = await agregarImagenMapaAlPaqueteWord(zip, mapaTecnico.blob);
  insertarMapaEnDocumentoWord(documentoXML, idRelacionMapa, mapaTecnico.titulo, mapaTecnico.total);

  forzarFuenteNegraDocumentoWord(documentoXML);
  aplicarEstilosInstitucionalesWord(documentoXML);

  const serializado = new XMLSerializer().serializeToString(documentoXML);
  zip.file("word/document.xml", serializado);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE"
  });

  const enlace = document.createElement("a");
  const url = URL.createObjectURL(blob);
  enlace.href = url;
  enlace.download = nombreArchivoWord(reporte);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
