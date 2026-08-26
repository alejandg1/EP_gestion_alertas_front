const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const DIAS_SEMANA_ES = [
  "domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"
];

export function obtenerFechaActualISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function obtenerHoraActual() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatearFechaCortaTexto(fechaISO) {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-').map(Number);
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia} de ${MESES_ES[mes - 1]}`;
}

export function formatearFechaLargaTexto(fechaISO) {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-').map(Number);
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia} de ${MESES_ES[mes - 1]} de ${anio}`;
}

export function formatearFechaDDMMYYYY(fechaISO) {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function generarCabeceraDinamica(fechaISO, hora) {
  const f = fechaISO || obtenerFechaActualISO();
  const h = (hora || obtenerHoraActual()).replace(':', 'h');
  const fFormateada = formatearFechaDDMMYYYY(f);
  return `REPORTE DE NOVEDADES POR LLUVIAS INICIAL: ${fFormateada} ${h}`;
}

export function generarPeriodoDinamico(fechaISO) {
  const f = fechaISO || obtenerFechaActualISO();
  const partes = f.split('-').map(Number);
  if (partes.length === 3) {
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    const nombreDia = DIAS_SEMANA_ES[d.getDay()];
    const diaNum = partes[2];
    const mesNom = MESES_ES[partes[1] - 1];
    return `Durante el turno del ${nombreDia} ${diaNum} de ${mesNom} se han registrado las siguientes novedades en el canton Guayaquil por efecto de las lluvias:`;
  }
  return `Durante el turno de monitoreo se han registrado las siguientes novedades en el canton Guayaquil por efecto de las lluvias:`;
}

/**
 * Calculo y modelo de pronostico de mareas de INOCAR para el Puerto de Guayaquil (Rio Guayas).
 * Sigue el ciclo semidiurno M2 (12.42 horas) y ciclo lunar sinodico (pleamar 3.8m - 4.6m, bajamar 0.4m - 1.1m).
 */
export function calcularPronosticoInocar(fechaISO) {
  const f = fechaISO || obtenerFechaActualISO();
  const partes = f.split('-').map(Number);
  if (partes.length !== 3) {
    return {
      fecha: 'Fecha actual',
      pleamar: 'a las 22h42 con 4.13m',
      bajamar: 'a las 05h27 con 0.79m'
    };
  }

  const [anio, mes, dia] = partes;
  const fechaObj = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));

  // Epoca de referencia lunar (Luna nueva conocida: 2026-01-18)
  const referenciaLuna = new Date(Date.UTC(2026, 0, 18, 18, 50, 0));
  const diffDias = (fechaObj.getTime() - referenciaLuna.getTime()) / (1000 * 60 * 60 * 24);
  const cicloLunar = 29.530588853; // Periodo sinodico lunar en dias
  const faseLunar = (diffDias % cicloLunar + cicloLunar) % cicloLunar;

  // Variacion de marea viva / marea muerta (Spring / Neap)
  const factorViva = Math.cos(2 * Math.PI * (faseLunar / (cicloLunar / 2))); // 1 en lunas llenas/nuevas

  // Amplitud en Guayaquil: media pleamar 4.15m +- 0.35m; bajamar 0.75m +- 0.25m
  const alturaPleamar = (4.15 + 0.32 * factorViva).toFixed(2);
  const alturaBajamar = (0.75 - 0.22 * factorViva).toFixed(2);

  // Estimacion de desfase diario (~50 min cada dia por el movimiento orbital lunar)
  const desfaseMinutosDiario = Math.round((diffDias * 50.4) % 720);
  
  // Hora base para Pleamar diurna/nocturna en Guayaquil (~21h00 base + desfase)
  let minutosPleamar = (21 * 60 + 15 + desfaseMinutosDiario) % 1440;
  if (minutosPleamar < 0) minutosPleamar += 1440;
  const horaPleamar = Math.floor(minutosPleamar / 60);
  const minPleamar = minutosPleamar % 60;

  // Bajamar aproximadamente 6 horas y 12 minutos despues de Pleamar
  let minutosBajamar = (minutosPleamar + 372) % 1440;
  const horaBajamar = Math.floor(minutosBajamar / 60);
  const minBajamar = minutosBajamar % 60;

  const strHoraPleamar = String(horaPleamar).padStart(2, '0') + 'h' + String(minPleamar).padStart(2, '0');
  const strHoraBajamar = String(horaBajamar).padStart(2, '0') + 'h' + String(minBajamar).padStart(2, '0');

  const fechaTexto = `${dia} de ${MESES_ES[mes - 1]}`;

  return {
    fecha: fechaTexto,
    pleamar: `a las ${strHoraPleamar} con ${alturaPleamar}m`,
    bajamar: `a las ${strHoraBajamar} con ${alturaBajamar}m`
  };
}
