export const EPOCAS = {
  LLUVIOSA: 'LLUVIOSA',
  SECA: 'SECA'
};

export const EPOCA_ACTUAL = EPOCAS.LLUVIOSA;

export const CATALOGO_EVENTOS = [
  { id: 'AGUA', label: 'Acumulación de agua', icon: 'fa-droplet', color: '#0284c7', bg: '#e0f2fe', epocas: [EPOCAS.LLUVIOSA] },
  { id: 'ARBOL', label: 'Caída de árbol', icon: 'fa-tree', color: '#16a34a', bg: '#dcfce7', epocas: [EPOCAS.LLUVIOSA, EPOCAS.SECA] },
  { id: 'DESLIZAMIENTO', label: 'Deslizamiento', icon: 'fa-hill-rockslide', color: '#b45309', bg: '#fef3c7', epocas: [EPOCAS.LLUVIOSA] },
  { id: 'POSTE', label: 'Caída de poste', icon: 'fa-bolt', color: '#d97706', bg: '#fef3c7', epocas: [EPOCAS.LLUVIOSA, EPOCAS.SECA] },
  { id: 'SINIESTRO', label: 'Siniestro de tránsito', icon: 'fa-car-burst', color: '#dc2626', bg: '#fee2e2', epocas: [EPOCAS.LLUVIOSA, EPOCAS.SECA] },
  { id: 'INUNDACION', label: 'Inundación', icon: 'fa-house-flood-water', color: '#0369a1', bg: '#bae6fd', epocas: [EPOCAS.LLUVIOSA] },
  { id: 'VENDAVAL', label: 'Vendaval', icon: 'fa-wind', color: '#475569', bg: '#f1f5f9', epocas: [EPOCAS.LLUVIOSA, EPOCAS.SECA] },
  { id: 'AFECTACION', label: 'Afectación estructural', icon: 'fa-building-crack', color: '#7c3aed', bg: '#ede9fe', epocas: [EPOCAS.LLUVIOSA, EPOCAS.SECA] },
];

export const ESTADOS_NOVEDAD = [
  { id: 'PENDIENTE', label: '⛔ PENDIENTE', value: '⛔PENDIENTE', color: '#dc2626', bg: '#fee2e2' },
  { id: 'EN_ATENCION', label: '🔄 EN ATENCIÓN', value: '🔄EN ATENCIÓN', color: '#d97706', bg: '#fef3c7' },
  { id: 'EN_SITIO', label: '📍 EN SITIO', value: '📍EN SITIO', color: '#0284c7', bg: '#e0f2fe' },
  { id: 'SOLUCIONADO', label: '✅ SOLUCIONADO', value: '✅ATENDIDO', color: '#16a34a', bg: '#dcfce7' }
];

export const CATALOGO_RECURSOS = [
  { id: 'INS-ALC', value: 'INS-ALC 🚙', label: 'INS-ALC 🚙 (Inspección Alcantarillado)' },
  { id: 'HK', value: 'HK 🚛', label: 'HK 🚛 (Hidrocleaner)' },
  { id: 'CAMIONETA-OP-CN', value: 'CAMIONETA-OP-CN 🚙', label: 'CAMIONETA-OP-CN 🚙 (Camioneta Operativa)' },
  { id: 'MAQUINARIA-OOPP', value: 'MAQUINARIA OBRAS PÚBLICAS 🚜', label: 'MAQUINARIA OBRAS PÚBLICAS 🚜' },
  { id: 'EQUIPO-GGRR', value: 'EQUIPO GESTIÓN DE RIESGOS 🦺', label: 'EQUIPO GESTIÓN DE RIESGOS 🦺' },
  { id: 'CUADRILLA-PARQUES', value: 'CUADRILLA PARQUES 🌳', label: 'CUADRILLA PARQUES 🌳' },
  { id: 'MAQUINARIA-PARQUES', value: 'MAQUINARIA PARQUES 🚜', label: 'MAQUINARIA PARQUES 🚜' },
  { id: 'PATRULLAS-ATM', value: 'PATRULLAS ATM 🚓', label: 'PATRULLAS ATM 🚓' },
  { id: 'ASEO-URVASEO', value: 'ASEO CANTONAL - URVASEO 🚛', label: 'ASEO CANTONAL - URVASEO 🚛' },
  { id: 'INSPECTOR-URVASEO', value: 'INSPECTOR URVASEO 🚙', label: 'INSPECTOR URVASEO 🚙' },
  { id: 'CUADRILLA-URVASEO', value: 'CUADRILLA URVASEO 👷', label: 'CUADRILLA URVASEO 👷' }
];

export const INSTITUCIONES_CATALOGO = [
  {
    id: 'bcbg',
    key_recurso: 'bcbg',
    key_personal: '#_bcbg',
    nombre: 'Cuerpo de Bomberos (BCBG)',
    siglas: 'BCBG',
    multiplicador: 2,
    icon: 'fa-fire-extinguisher',
    aliases: ['@bomberosgye', 'bomberos', 'bcbg', 'bombero']
  },
  {
    id: 'atm',
    key_recurso: 'atm',
    key_personal: '#_atm',
    nombre: 'Agencia de Tránsito y Movilidad (ATM)',
    siglas: 'ATM',
    multiplicador: 2,
    icon: 'fa-car',
    aliases: ['@atm_transito', '@atm', 'atm', 'transito', 'tránsito']
  },
  {
    id: 'ia',
    key_recurso: 'interagua',
    key_personal: '#_interagua',
    nombre: 'Interagua / Emapag',
    siglas: 'INTERAGUA',
    multiplicador: 3,
    icon: 'fa-faucet-drip',
    aliases: ['@emapagye', '@interagua', 'interagua', 'emapag', 'ia', 'alcantarillado']
  },
  {
    id: 'parques_ep',
    key_recurso: 'parques_ep',
    key_personal: '#_parques_ep',
    nombre: 'Parques EP',
    siglas: 'PARQUES EP',
    multiplicador: 5,
    icon: 'fa-tree',
    aliases: ['@parquesgye', '@ambientegye', 'parques', 'dapav', 'ambiente']
  },
  {
    id: 'ooppmm',
    key_recurso: 'ooppmm',
    key_personal: '#_ooppmm',
    nombre: 'Obras Públicas Municipales',
    siglas: 'OOPPMM',
    multiplicador: 3,
    icon: 'fa-trowel-bricks',
    aliases: ['@obrasguayaquil', 'obras', 'ooppmm', 'publicas', 'públicas']
  },
  {
    id: 'cnel',
    key_recurso: 'cnel',
    key_personal: '#_cnel',
    nombre: 'CNEL EP',
    siglas: 'CNEL',
    multiplicador: 3,
    icon: 'fa-bolt',
    aliases: ['@cnel_ep', '@cnel', 'cnel', 'electrico', 'eléctrico']
  },
  {
    id: 'urvaseo',
    key_recurso: 'urvaseo',
    key_personal: '#_urvaseo',
    nombre: 'Urvaseo',
    siglas: 'URVASEO',
    multiplicador: 3,
    icon: 'fa-broom',
    aliases: ['@urvaseo', 'urvaseo', 'aseo']
  },
  {
    id: 'ggrr',
    key_recurso: 'ggrr',
    key_personal: '#_ggrr',
    nombre: 'Gestión de Riesgos',
    siglas: 'GGRR',
    multiplicador: 4,
    icon: 'fa-shield-heart',
    aliases: ['@segura_ep', 'ggrr', 'riesgos', 'segura']
  }
];

export function filtrarInstitucionesNotificadas(textoInstituciones = '') {
  if (!textoInstituciones || typeof textoInstituciones !== 'string') return [];
  const lower = textoInstituciones.toLowerCase();

  return INSTITUCIONES_CATALOGO.filter(inst => {
    return (inst.aliases || []).some(alias => lower.includes(alias.toLowerCase()));
  });
}

export function getEventosPorEpoca(epoca = EPOCA_ACTUAL) {
  return CATALOGO_EVENTOS.filter(e => e.epocas.includes(epoca));
}

export function calcularPersonalSugerido(recursos = {}) {
  const personalSugerido = {};
  INSTITUCIONES_CATALOGO.forEach(inst => {
    const cantRecursos = parseInt(recursos[inst.key_recurso] || recursos[inst.id] || 0, 10);
    if (cantRecursos > 0) {
      personalSugerido[inst.key_personal] = cantRecursos * inst.multiplicador;
    }
  });
  return personalSugerido;
}
