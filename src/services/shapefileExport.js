import JSZip from 'jszip';
import { textoEventoIndividual } from './nlpDetector.js';

const ORDEN_TIPOS_REPORTE = ["AGUA", "ARBOL", "DESLIZAMIENTO", "POSTE", "SINIESTRO", "INUNDACION", "VENDAVAL", "AFECTACION"];

export function eventosEnOrdenReporteConsolidado(fuente) {
  const lista = Array.isArray(fuente) ? fuente : [];
  const resultado = [];
  ORDEN_TIPOS_REPORTE.forEach(tipo => {
    lista.forEach(item => {
      const t = item.tipo_evento || item.tipo;
      if (t === tipo) resultado.push(item);
    });
  });
  lista.forEach(item => {
    const t = item.tipo_evento || item.tipo;
    if (!ORDEN_TIPOS_REPORTE.includes(t)) resultado.push(item);
  });
  return resultado;
}

export function obtenerEventosSIGPorFecha(novedades, fecha) {
  return eventosEnOrdenReporteConsolidado(novedades)
    .map((item, indice) => ({
      id_evento: indice + 1,
      tipo: item.tipo_evento || item.tipo || 'AGUA',
      fecha: item.fecha_evento || item.fecha || '',
      hora: item.hora_evento || item.hora || '00:00',
      aga: item.aga || 'N/D',
      dir: item.direccion || item.dir || '',
      ficha: item.ficha || item.numero_ficha || item.datos_adicionales?.ficha || '',
      recurso: item.recurso_asignado || item.recurso || 'INS-ALC 🚙',
      estado: item.estado_operativo || item.estado || '⛔PENDIENTE',
      lat: Number(item.coordenadas?.lat ?? item.latitud ?? item.lat),
      lng: Number(item.coordenadas?.lng ?? item.longitud ?? item.lng)
    }))
    .filter(item => {
      const fechaValida = !fecha || item.fecha === fecha;
      return fechaValida && Number.isFinite(item.lat) && Number.isFinite(item.lng);
    });
}

function escribirCabeceraShapefile(vista, longitudBytes, limites) {
  vista.setInt32(0, 9994, false);
  vista.setInt32(24, longitudBytes / 2, false);
  vista.setInt32(28, 1000, true);
  vista.setInt32(32, 1, true);
  vista.setFloat64(36, limites.xMin, true);
  vista.setFloat64(44, limites.yMin, true);
  vista.setFloat64(52, limites.xMax, true);
  vista.setFloat64(60, limites.yMax, true);
  vista.setFloat64(68, 0, true);
  vista.setFloat64(76, 0, true);
  vista.setFloat64(84, 0, true);
  vista.setFloat64(92, 0, true);
}

function crearGeometriaShapefilePuntos(eventos) {
  const xValores = eventos.map(item => item.lng);
  const yValores = eventos.map(item => item.lat);
  const limites = {
    xMin: xValores.length ? Math.min(...xValores) : 0,
    yMin: yValores.length ? Math.min(...yValores) : 0,
    xMax: xValores.length ? Math.max(...xValores) : 0,
    yMax: yValores.length ? Math.max(...yValores) : 0
  };

  const longitudShp = 100 + eventos.length * 28;
  const shp = new ArrayBuffer(longitudShp);
  const vistaShp = new DataView(shp);
  escribirCabeceraShapefile(vistaShp, longitudShp, limites);

  eventos.forEach((item, indice) => {
    const posicion = 100 + indice * 28;
    vistaShp.setInt32(posicion, indice + 1, false);
    vistaShp.setInt32(posicion + 4, 10, false);
    vistaShp.setInt32(posicion + 8, 1, true);
    vistaShp.setFloat64(posicion + 12, item.lng, true);
    vistaShp.setFloat64(posicion + 20, item.lat, true);
  });

  const longitudShx = 100 + eventos.length * 8;
  const shx = new ArrayBuffer(longitudShx);
  const vistaShx = new DataView(shx);
  escribirCabeceraShapefile(vistaShx, longitudShx, limites);
  eventos.forEach((item, indice) => {
    const posicion = 100 + indice * 8;
    vistaShx.setInt32(posicion, 50 + indice * 14, false);
    vistaShx.setInt32(posicion + 4, 10, false);
  });

  return { shp: new Uint8Array(shp), shx: new Uint8Array(shx), limites };
}

function textoUTF8Limitado(valor, longitud) {
  const codificador = new TextEncoder();
  const salida = [];
  for (const caracter of String(valor == null ? "" : valor)) {
    const bytes = Array.from(codificador.encode(caracter));
    if (salida.length + bytes.length > longitud) break;
    salida.push(...bytes);
  }
  return new Uint8Array(salida);
}

function crearDBFEventos(eventos) {
  const campos = [
    { nombre: "ID_EVENTO", tipo: "N", longitud: 8, decimales: 0, valor: item => item.id_evento },
    { nombre: "FICHA", tipo: "C", longitud: 20, decimales: 0, valor: item => item.ficha || "" },
    { nombre: "TIPO", tipo: "C", longitud: 24, decimales: 0, valor: item => textoEventoIndividual[item.tipo] || item.tipo },
    { nombre: "FECHA", tipo: "D", longitud: 8, decimales: 0, valor: item => (item.fecha || "").replace(/-/g, "") },
    { nombre: "HORA", tipo: "C", longitud: 5, decimales: 0, valor: item => item.hora || "" },
    { nombre: "AGA", tipo: "C", longitud: 10, decimales: 0, valor: item => item.aga || "" },
    { nombre: "DIRECCION", tipo: "C", longitud: 150, decimales: 0, valor: item => item.dir || "" },
    { nombre: "RECURSO", tipo: "C", longitud: 80, decimales: 0, valor: item => item.recurso || "" },
    { nombre: "ESTADO", tipo: "C", longitud: 25, decimales: 0, valor: item => item.estado || "" },
    { nombre: "LATITUD", tipo: "N", longitud: 13, decimales: 6, valor: item => item.lat },
    { nombre: "LONGITUD", tipo: "N", longitud: 14, decimales: 6, valor: item => item.lng }
  ];

  const longitudCabecera = 32 + campos.length * 32 + 1;
  const longitudRegistro = 1 + campos.reduce((suma, campo) => suma + campo.longitud, 0);
  const buffer = new ArrayBuffer(longitudCabecera + longitudRegistro * eventos.length + 1);
  const bytes = new Uint8Array(buffer);
  const vista = new DataView(buffer);
  const hoy = new Date();

  bytes.fill(0);
  vista.setUint8(0, 3);
  vista.setUint8(1, Math.max(0, hoy.getFullYear() - 1900));
  vista.setUint8(2, hoy.getMonth() + 1);
  vista.setUint8(3, hoy.getDate());
  vista.setUint32(4, eventos.length, true);
  vista.setUint16(8, longitudCabecera, true);
  vista.setUint16(10, longitudRegistro, true);

  campos.forEach((campo, indice) => {
    const posicion = 32 + indice * 32;
    for (let i = 0; i < Math.min(10, campo.nombre.length); i++) bytes[posicion + i] = campo.nombre.charCodeAt(i);
    bytes[posicion + 11] = campo.tipo.charCodeAt(0);
    bytes[posicion + 16] = campo.longitud;
    bytes[posicion + 17] = campo.decimales;
  });
  bytes[longitudCabecera - 1] = 13;

  eventos.forEach((item, indiceRegistro) => {
    let posicion = longitudCabecera + indiceRegistro * longitudRegistro;
    bytes[posicion++] = 32;
    campos.forEach(campo => {
      bytes.fill(32, posicion, posicion + campo.longitud);
      const valor = campo.valor(item);
      let texto;
      if (campo.tipo === "N") {
        const numero = Number(valor);
        texto = Number.isFinite(numero) ? numero.toFixed(campo.decimales) : "";
      } else {
        texto = String(valor == null ? "" : valor);
      }
      const contenido = textoUTF8Limitado(texto, campo.longitud);
      const inicio = campo.tipo === "N" ? posicion + campo.longitud - contenido.length : posicion;
      bytes.set(contenido, inicio);
      posicion += campo.longitud;
    });
  });
  bytes[bytes.length - 1] = 26;
  return bytes;
}

export function crearArchivosShapefile(eventos) {
  const geometria = crearGeometriaShapefilePuntos(eventos);
  const prj = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.0174532925199433]]';
  return {
    shp: geometria.shp,
    shx: geometria.shx,
    dbf: crearDBFEventos(eventos),
    prj,
    cpg: "UTF-8"
  };
}

export async function exportarShapefileEventos(novedades, fecha) {
  const eventos = obtenerEventosSIGPorFecha(novedades, fecha);
  if (!eventos.length) {
    throw new Error("No existen eventos con coordenadas válidas para la fecha seleccionada.");
  }

  const fechaLimpia = (fecha || new Date().toISOString().split('T')[0]).replace(/-/g, "");
  const archivos = crearArchivosShapefile(eventos);
  const nombreBase = "EVENTOS_SEGURA_EP_" + fechaLimpia;
  const zip = new JSZip();

  zip.file(nombreBase + ".shp", archivos.shp);
  zip.file(nombreBase + ".shx", archivos.shx);
  zip.file(nombreBase + ".dbf", archivos.dbf);
  zip.file(nombreBase + ".prj", archivos.prj);
  zip.file(nombreBase + ".cpg", archivos.cpg);
  zip.file("LEEME.txt", "Sala Situacional de Segura EP\r\nFecha de eventos: " + (fecha || "Consolidado") + "\r\nRegistros exportados: " + eventos.length + "\r\nGeometría: puntos (Point 2D)\r\nSistema de referencia: WGS 84 (EPSG:4326)\r\nCodificación de atributos: UTF-8\r\n");

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreBase + ".zip";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
