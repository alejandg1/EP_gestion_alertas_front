import JSZip from 'jszip';
import { PLANTILLA_DOCX_BASE64 } from './docxTemplate.js';
import { AGAS_WGS84 } from './agaData.js';
import { estiloMapaPorTipo, textoEventoIndividual, normalizarDescripcionNLP } from './nlpDetector.js';

const eventoWordPorTipo = {
  AGUA: "Via con acumulacion de agua",
  ARBOL: "Caida de arbol",
  DESLIZAMIENTO: "Deslizamiento de tierra",
  POSTE: "Caida de poste o cableado",
  SINIESTRO: "Siniestro de transito",
  INUNDACION: "Inundacion",
  VENDAVAL: "Afectacion por vendaval",
  AFECTACION: "Afectacion estructural"
};

const mesesWord = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesesWordCorto = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PIC_NS = "http://schemas.openxmlformats.org/drawingml/2006/picture";

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
  return dia + " de " + mesesWord[mes - 1] + " de " + anio;
}

function fechaTablaWord(iso) {
  const [anio, mes, dia] = partesFechaISO(iso);
  return String(dia).padStart(2, "0") + "-" + mesesWordCorto[mes - 1] + "-" + anio;
}

function horaTablaWord(hora) {
  return (hora || "00:00").replace(":", "H").toUpperCase();
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

function asignarAtributoWord(elemento, nombre, valor) {
  elemento.setAttributeNS(W_NS, "w:" + nombre, valor);
  elemento.setAttribute(nombre, valor);
}

function asegurarHijoXML(documentoXML, elementoPadre, nombreHijo, nodoReferencia) {
  let hijo = hijosXML(elementoPadre, nombreHijo)[0];
  if (!hijo) {
    hijo = documentoXML.createElementNS(W_NS, "w:" + nombreHijo);
    if (nodoReferencia) elementoPadre.insertBefore(hijo, nodoReferencia);
    else elementoPadre.appendChild(hijo);
  }
  return hijo;
}

function setTextoCeldaXML(documentoXML, celda, texto) {
  if (!celda) return;
  const parrafo = asegurarHijoXML(documentoXML, celda, "p");
  const propiedadesParrafo = asegurarHijoXML(documentoXML, parrafo, "pPr", parrafo.firstChild);
  const espaciado = asegurarHijoXML(documentoXML, propiedadesParrafo, "spacing");
  asignarAtributoWord(espaciado, "before", "0");
  asignarAtributoWord(espaciado, "after", "0");
  asignarAtributoWord(espaciado, "line", "240");
  asignarAtributoWord(espaciado, "lineRule", "auto");

  let run = hijosXML(parrafo, "r")[0];
  if (!run) {
    run = documentoXML.createElementNS(W_NS, "w:r");
    parrafo.appendChild(run);
  }
  hijosXML(parrafo, "r").slice(1).forEach(r => parrafo.removeChild(r));

  const propiedadesRun = asegurarHijoXML(documentoXML, run, "rPr", run.firstChild);
  const fuente = asegurarHijoXML(documentoXML, propiedadesRun, "rFonts");
  ["ascii", "hAnsi", "cs", "eastAsia"].forEach(nombre => asignarAtributoWord(fuente, nombre, "Segoe UI"));
  const tamano = asegurarHijoXML(documentoXML, propiedadesRun, "sz");
  asignarAtributoWord(tamano, "val", "16");
  const color = asegurarHijoXML(documentoXML, propiedadesRun, "color");
  asignarAtributoWord(color, "val", "000000");

  let textoNodo = hijosXML(run, "t")[0];
  if (!textoNodo) {
    textoNodo = documentoXML.createElementNS(W_NS, "w:t");
    run.appendChild(textoNodo);
  }
  textoNodo.setAttribute("xml:space", "preserve");
  textoNodo.textContent = String(texto == null ? "" : texto);
}

function setRellenoCeldaXML(documentoXML, celda, colorHex) {
  if (!celda) return;
  const tcPr = asegurarHijoXML(documentoXML, celda, "tcPr", celda.firstChild);
  const shd = asegurarHijoXML(documentoXML, tcPr, "shd");
  asignarAtributoWord(shd, "val", "clear");
  asignarAtributoWord(shd, "color", "auto");
  asignarAtributoWord(shd, "fill", colorHex.replace("#", ""));
}

function setColorTextoCeldaXML(documentoXML, celda, colorHex) {
  if (!celda) return;
  const parrafo = hijosXML(celda, "p")[0];
  if (!parrafo) return;
  const run = hijosXML(parrafo, "r")[0];
  if (!run) return;
  const rPr = asegurarHijoXML(documentoXML, run, "rPr", run.firstChild);
  const color = asegurarHijoXML(documentoXML, rPr, "color");
  asignarAtributoWord(color, "val", colorHex.replace("#", ""));
}

function colorEstadoWord(estado) {
  const est = (estado || "").toUpperCase();
  if (est.includes("ATENDIDO")) return { relleno: "C8E6C9", texto: "1B5E20" };
  if (est.includes("ATENCIÓN") || est.includes("ATENCION")) return { relleno: "FFE0B2", texto: "E65100" };
  return { relleno: "FFCDD2", texto: "B71C1C" };
}

function numeroEventoWord(indice, total) {
  return total >= 100 ? String(indice + 1).padStart(3, "0") : String(indice + 1).padStart(2, "0");
}

function fechaMapaTecnico(iso) {
  const [anio, mes, dia] = partesFechaISO(iso);
  return String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0") + "/" + anio;
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

async function generarMapaTecnicoWord(novedades, fechaISO) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1050;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("No se pudo inicializar canvas 2D");

  const eventos = novedades.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  const area = { x: 82, y: 142, ancho: 1100, alto: 762 };
  const panelX = 1214;

  const limites = eventos.length
    ? limitesMapaTecnico(eventos, area.ancho, area.alto)
    : { xMin: -80.05, xMax: -79.80, yMin: -2.30, yMax: -2.05, latMedia: -2.17 };

  const proyectar = (lng, lat) => ({
    x: area.x + ((lng - limites.xMin) / (limites.xMax - limites.xMin)) * area.ancho,
    y: area.y + ((limites.yMax - lat) / (limites.yMax - limites.yMin)) * area.alto
  });

  // Fondo
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, canvas.width, canvas.height);

  // Cabecera institucional
  contexto.fillStyle = "#0a3d62";
  contexto.fillRect(0, 0, canvas.width, 110);
  contexto.fillStyle = "#ffffff";
  contexto.font = "700 30px Segoe UI, Arial";
  contexto.fillText("SALA SITUACIONAL - SEGURA EP", 82, 48);
  contexto.font = "600 18px Segoe UI, Arial";
  contexto.fillStyle = "#dcebf4";
  contexto.fillText("MAPA TECNICO DE GEORREFERENCIACION Y NOVEDADES REGISTRADAS", 82, 82);
  contexto.textAlign = "right";
  contexto.fillText("CORTE: " + fechaMapaTecnico(fechaISO), canvas.width - 82, 65);
  contexto.textAlign = "left";

  // Area de mapa
  contexto.fillStyle = "#f4f8fb";
  contexto.fillRect(area.x, area.y, area.ancho, area.alto);

  // Poligonos AGA
  AGAS_WGS84.forEach((poligono, i) => {
    poligono.rings.forEach(anillo => {
      contexto.beginPath();
      anillo.forEach((coord, idx) => {
        const pt = proyectar(coord[0], coord[1]);
        if (idx === 0) contexto.moveTo(pt.x, pt.y);
        else contexto.lineTo(pt.x, pt.y);
      });
      contexto.closePath();
      contexto.fillStyle = i % 2 === 0 ? "rgba(10, 61, 98, 0.06)" : "rgba(30, 55, 153, 0.08)";
      contexto.fill();
      contexto.strokeStyle = "rgba(10, 61, 98, 0.35)";
      contexto.lineWidth = 1;
      contexto.stroke();
    });
  });

  // Eventos
  eventos.forEach((item, idx) => {
    const pt = proyectar(item.lng, item.lat);
    const estilo = estiloMapaPorTipo[item.tipo] || { color: "#0a3d62" };
    contexto.beginPath();
    contexto.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
    contexto.fillStyle = estilo.color;
    contexto.fill();
    contexto.strokeStyle = "#ffffff";
    contexto.lineWidth = 2.5;
    contexto.stroke();

    contexto.font = "700 10px Segoe UI, Arial";
    contexto.fillStyle = "#ffffff";
    contexto.textAlign = "center";
    contexto.fillText(String(idx + 1), pt.x, pt.y + 3.5);
  });

  // Marco de mapa
  contexto.strokeStyle = "#0a3d62";
  contexto.lineWidth = 2;
  contexto.strokeRect(area.x, area.y, area.ancho, area.alto);

  // Panel lateral derecho
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(panelX, 142, 304, 762);
  contexto.strokeStyle = "#b9c9d3";
  contexto.lineWidth = 1.5;
  contexto.strokeRect(panelX, 142, 304, 762);

  contexto.fillStyle = "#0a3d62";
  contexto.font = "700 20px Segoe UI, Arial";
  contexto.textAlign = "left";
  contexto.fillText("LEYENDA", panelX + 20, 180);

  let leyY = 220;
  const tiposPresentes = Array.from(new Set(eventos.map(item => item.tipo)));
  tiposPresentes.forEach(tipo => {
    const estilo = estiloMapaPorTipo[tipo] || { color: "#0a3d62", nombre: tipo };
    contexto.beginPath();
    contexto.arc(panelX + 32, leyY - 5, 8, 0, Math.PI * 2);
    contexto.fillStyle = estilo.color;
    contexto.fill();
    contexto.fillStyle = "#263b47";
    contexto.font = "600 13px Segoe UI, Arial";
    contexto.fillText((estilo.nombre || tipo).toUpperCase(), panelX + 50, leyY);
    leyY += 28;
  });

  // Informacion tecnica
  leyY += 20;
  contexto.fillStyle = "#0a3d62";
  contexto.font = "700 16px Segoe UI, Arial";
  contexto.fillText("INFORMACION TECNICA", panelX + 20, leyY);
  contexto.fillStyle = "#4a6572";
  contexto.font = "500 13px Segoe UI, Arial";
  const ficha = [
    "Sistema: WGS 84 (EPSG:4326)",
    "Geometria: Puntos",
    "Total Eventos: " + eventos.length,
    "Sala Situacional Segura EP"
  ];
  ficha.forEach((lin, i) => {
    contexto.fillText(lin, panelX + 20, leyY + 26 + i * 22);
  });

  // Pie
  contexto.fillStyle = "#0a3d62";
  contexto.fillRect(0, 972, canvas.width, 78);
  contexto.fillStyle = "#ffffff";
  contexto.font = "600 15px Segoe UI, Arial";
  contexto.fillText("Fuente: Registro diario de eventos · Sala Situacional de Segura EP", 82, 1018);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.96));
  return { blob, titulo: "Georreferenciacion de Eventos " + fechaMapaTecnico(fechaISO), total: eventos.length };
}

async function agregarImagenMapaAlPaqueteWord(zip, blobMapa) {
  const REL_PACKAGE_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
  const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
  const bytesMapa = new Uint8Array(await blobMapa.arrayBuffer());

  const rutaRelaciones = "word/_rels/document.xml.rels";
  const archivoRelaciones = zip.file(rutaRelaciones);
  if (!archivoRelaciones) throw new Error("La plantilla Word no contiene las relaciones.");
  const relacionesTexto = await archivoRelaciones.async("string");
  const relacionesXML = new DOMParser().parseFromString(relacionesTexto, "application/xml");
  
  let indice = 11;
  let idRelacion = "rId" + indice;
  const idsExistentes = new Set(Array.from(relacionesXML.documentElement.childNodes)
    .filter(n => n.nodeType === 1)
    .map(n => n.getAttribute("Id")));
  while (idsExistentes.has(idRelacion)) idRelacion = "rId" + (++indice);

  const relacion = relacionesXML.createElementNS(REL_PACKAGE_NS, "Relationship");
  relacion.setAttribute("Id", idRelacion);
  relacion.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
  relacion.setAttribute("Target", "media/mapa_eventos.png");
  relacionesXML.documentElement.appendChild(relacion);
  zip.file(rutaRelaciones, new XMLSerializer().serializeToString(relacionesXML));

  const archivoTipos = zip.file("[Content_Types].xml");
  if (archivoTipos) {
    const tiposTexto = await archivoTipos.async("string");
    const tiposXML = new DOMParser().parseFromString(tiposTexto, "application/xml");
    const pngDeclarado = Array.from(tiposXML.documentElement.childNodes).filter(n => n.nodeType === 1).some(n =>
      n.localName === "Default" && String(n.getAttribute("Extension") || "").toLowerCase() === "png"
    );
    if (!pngDeclarado) {
      const tipoPNG = tiposXML.createElementNS(CT_NS, "Default");
      tipoPNG.setAttribute("Extension", "png");
      tipoPNG.setAttribute("ContentType", "image/png");
      tiposXML.documentElement.insertBefore(tipoPNG, tiposXML.documentElement.firstChild);
      zip.file("[Content_Types].xml", new XMLSerializer().serializeToString(tiposXML));
    }
  }

  zip.file("word/media/mapa_eventos.png", bytesMapa, { binary: true });
  return idRelacion;
}

function crearParrafoTextoWord(documentoXML, texto, negrita, tamano) {
  const parrafo = documentoXML.createElementNS(W_NS, "w:p");
  const propiedadesParrafo = documentoXML.createElementNS(W_NS, "w:pPr");
  const alineacion = documentoXML.createElementNS(W_NS, "w:jc");
  asignarAtributoWord(alineacion, "val", "center");
  propiedadesParrafo.appendChild(alineacion);
  parrafo.appendChild(propiedadesParrafo);
  const run = documentoXML.createElementNS(W_NS, "w:r");
  const propiedadesRun = documentoXML.createElementNS(W_NS, "w:rPr");
  if (negrita) propiedadesRun.appendChild(documentoXML.createElementNS(W_NS, "w:b"));
  const colorNodo = documentoXML.createElementNS(W_NS, "w:color");
  asignarAtributoWord(colorNodo, "val", "000000");
  propiedadesRun.appendChild(colorNodo);
  const tamanoNodo = documentoXML.createElementNS(W_NS, "w:sz");
  asignarAtributoWord(tamanoNodo, "val", String(tamano || 18));
  propiedadesRun.appendChild(tamanoNodo);
  run.appendChild(propiedadesRun);
  const textoNodo = documentoXML.createElementNS(W_NS, "w:t");
  textoNodo.textContent = texto;
  run.appendChild(textoNodo);
  parrafo.appendChild(run);
  return parrafo;
}

function insertarMapaEnDocumentoWord(documentoXML, idRelacion, tituloMapa, totalEventos) {
  const cuerpo = documentoXML.getElementsByTagNameNS(W_NS, "body")[0];
  const seccion = hijosXML(cuerpo, "sectPr")[0] || null;
  const insertar = nodo => seccion ? cuerpo.insertBefore(nodo, seccion) : cuerpo.appendChild(nodo);

  const salto = documentoXML.createElementNS(W_NS, "w:p");
  const runSalto = documentoXML.createElementNS(W_NS, "w:r");
  const br = documentoXML.createElementNS(W_NS, "w:br");
  asignarAtributoWord(br, "type", "page");
  runSalto.appendChild(br);
  salto.appendChild(runSalto);
  insertar(salto);

  insertar(crearParrafoTextoWord(documentoXML, "ANEXO CARTOGRAFICO", true, 22));
  insertar(crearParrafoTextoWord(documentoXML, tituloMapa, true, 18));

  const parrafo = documentoXML.createElementNS(W_NS, "w:p");
  const propiedadesParrafo = documentoXML.createElementNS(W_NS, "w:pPr");
  const alineacion = documentoXML.createElementNS(W_NS, "w:jc");
  asignarAtributoWord(alineacion, "val", "center");
  propiedadesParrafo.appendChild(alineacion);
  parrafo.appendChild(propiedadesParrafo);

  const run = documentoXML.createElementNS(W_NS, "w:r");
  const dibujo = documentoXML.createElementNS(W_NS, "w:drawing");
  const inline = documentoXML.createElementNS(WP_NS, "wp:inline");
  ["distT", "distB", "distL", "distR"].forEach(n => inline.setAttribute(n, "0"));
  const cx = 5800000;
  const cy = 3800000;
  const extension = documentoXML.createElementNS(WP_NS, "wp:extent");
  extension.setAttribute("cx", String(cx)); extension.setAttribute("cy", String(cy));
  inline.appendChild(extension);

  const docPr = documentoXML.createElementNS(WP_NS, "wp:docPr");
  docPr.setAttribute("id", "9001");
  docPr.setAttribute("name", "Mapa tecnico de eventos");
  inline.appendChild(docPr);

  const grafico = documentoXML.createElementNS(A_NS, "a:graphic");
  const datosGrafico = documentoXML.createElementNS(A_NS, "a:graphicData");
  datosGrafico.setAttribute("uri", "http://schemas.openxmlformats.org/drawingml/2006/picture");

  const imagen = documentoXML.createElementNS(PIC_NS, "pic:pic");
  const nvPicPr = documentoXML.createElementNS(PIC_NS, "pic:nvPicPr");
  const cNvPr = documentoXML.createElementNS(PIC_NS, "pic:cNvPr");
  cNvPr.setAttribute("id", "9002"); cNvPr.setAttribute("name", "mapa.png");
  nvPicPr.appendChild(cNvPr);
  nvPicPr.appendChild(documentoXML.createElementNS(PIC_NS, "pic:cNvPicPr"));
  imagen.appendChild(nvPicPr);

  const blipFill = documentoXML.createElementNS(PIC_NS, "pic:blipFill");
  const blip = documentoXML.createElementNS(A_NS, "a:blip");
  blip.setAttributeNS(R_NS, "r:embed", idRelacion);
  blipFill.appendChild(blip);
  blipFill.appendChild(documentoXML.createElementNS(A_NS, "a:stretch"));
  imagen.appendChild(blipFill);

  const spPr = documentoXML.createElementNS(PIC_NS, "pic:spPr");
  const xfrm = documentoXML.createElementNS(A_NS, "a:xfrm");
  const ext = documentoXML.createElementNS(A_NS, "a:ext");
  ext.setAttribute("cx", String(cx)); ext.setAttribute("cy", String(cy));
  xfrm.appendChild(ext);
  spPr.appendChild(xfrm);
  const prstGeom = documentoXML.createElementNS(A_NS, "a:prstGeom");
  prstGeom.setAttribute("prst", "rect");
  spPr.appendChild(prstGeom);
  imagen.appendChild(spPr);

  datosGrafico.appendChild(imagen);
  grafico.appendChild(datosGrafico);
  inline.appendChild(grafico);
  dibujo.appendChild(inline);
  run.appendChild(dibujo);
  parrafo.appendChild(run);
  insertar(parrafo);

  insertar(crearParrafoTextoWord(documentoXML, "Figura 1. " + tituloMapa + " (WGS 84 / EPSG:4326).", true, 16));
  insertar(crearParrafoTextoWord(documentoXML, "Total de eventos: " + totalEventos + ". Sala Situacional de Segura EP.", false, 14));
}

export async function exportarReporteWord(reporte, novedades) {
  const zip = await JSZip.loadAsync(bytesDesdeBase64(PLANTILLA_DOCX_BASE64));
  const archivoDoc = zip.file("word/document.xml");
  if (!archivoDoc) throw new Error("La plantilla Word no contiene el documento principal.");

  const xmlTexto = await archivoDoc.async("string");
  const documentoXML = new DOMParser().parseFromString(xmlTexto, "application/xml");

  const tabla = documentoXML.getElementsByTagNameNS(W_NS, "tbl")[0];
  const filas = hijosXML(tabla, "tr");
  if (filas.length < 43) throw new Error("Estructura de plantilla no valida.");

  const filaClara = filas[6].cloneNode(true);
  const filaAzul = filas[7].cloneNode(true);
  const filaAnclaResumen = filas[37];

  for (let i = 6; i <= 36; i++) tabla.removeChild(filas[i]);

  const lista = novedades && novedades.length ? novedades : [{
    tipo: "AGUA",
    fecha: reporte.fecha_reporte,
    aga: "N/D",
    hora: "00:00",
    direccion: "NO SE REGISTRARON EVENTOS RELEVANTES DURANTE EL PERIODO DE CORTE",
    recurso_asignado: "N/A",
    estado_operativo: "ATENDIDO"
  }];

  lista.forEach((item, indice) => {
    const fila = (indice % 2 === 0 ? filaClara : filaAzul).cloneNode(true);
    const celdas = celdasFilaXML(fila);
    const fechaBase = item.fecha_evento || item.fecha || reporte.fecha_reporte;
    const tipoKey = item.tipo_evento || item.tipo || "AGUA";
    const tipoEvento = eventoWordPorTipo[tipoKey] || textoEventoIndividual[tipoKey] || "Evento relevante";
    const horaBase = item.hora_evento || item.hora || "00:00";

    setTextoCeldaXML(documentoXML, celdas[0], numeroEventoWord(indice, lista.length) + ".- " + tipoEvento);
    setTextoCeldaXML(documentoXML, celdas[1], fechaTablaWord(fechaBase));
    setTextoCeldaXML(documentoXML, celdas[2], (item.aga || "N/D").toUpperCase());
    setTextoCeldaXML(documentoXML, celdas[3], horaTablaWord(horaBase));
    setTextoCeldaXML(documentoXML, celdas[4], normalizarDescripcionNLP(item.direccion || item.dir || ""));
    setTextoCeldaXML(documentoXML, celdas[5], (item.recurso_asignado || item.recurso || "N/A").toUpperCase());

    const colores = colorEstadoWord(item.estado_operativo || item.estado);
    setRellenoCeldaXML(documentoXML, celdas[5], colores.relleno);
    setColorTextoCeldaXML(documentoXML, celdas[5], colores.texto);
    tabla.insertBefore(fila, filaAnclaResumen);
  });

  const numRds = reporte.numero_rds || "SEGURA-EP-GASGEC-SS-2026";
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[1])[1], "RDS#: " + numRds);
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[2])[2], fechaLargaWord(reporte.fecha_reporte));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[2])[3], horaCorteWord(reporte.hora_inicio) + " - " + horaCorteWord(reporte.hora_fin));
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[3])[1], reporte.elaborado_por || "");
  setTextoCeldaXML(documentoXML, celdasFilaXML(filas[3])[3], reporte.revisado_por || "");

  const mapaTecnico = await generarMapaTecnicoWord(lista, reporte.fecha_reporte);
  const idRelacion = await agregarImagenMapaAlPaqueteWord(zip, mapaTecnico.blob);
  insertarMapaEnDocumentoWord(documentoXML, idRelacion, mapaTecnico.titulo, mapaTecnico.total);

  const serializado = new XMLSerializer().serializeToString(documentoXML);
  zip.file("word/document.xml", serializado);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE"
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "RDS-" + numRds.replace(/[<>:"/\\|?*]/g, "-") + ".docx";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
