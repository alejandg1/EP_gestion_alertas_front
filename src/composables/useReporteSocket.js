import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { initSocket, disconnectSocket } from '../services/socket.js';
import { toast } from '../services/toast.js';

export function useReporteSocket(reporte, usuario, options = {}) {
  const router = useRouter();
  const colaboradoresConectados = ref([]);
  const fieldLocks = reactive({});

  function setupSockets() {
    const currentId = reporte._id || reporte.id;
    if (!currentId || currentId === 'nuevo') return;

    const socket = initSocket();
    if (!socket) return;

    socket.emit('unirse_reporte', { reporteId: currentId });

    socket.on('reporte_cargado', (payload) => {
      const r = payload.reporte;
      if (r) {
        Object.assign(reporte, {
          _id: r._id || r.id,
          id: r.id || r._id,
          titulo: r.titulo,
          numero_rds: r.numero_rds,
          fecha_reporte: r.fecha_reporte || r.fecha,
          hora_inicio: r.hora_inicio || '06:00',
          hora_fin: r.hora_fin || '22:00',
          revisado_por: r.revisado_por,
          elaborado_por: r.elaborado_por || '',
          colaboradores: r.colaboradores || [],
          cabecera: r.cabecera,
          periodo: r.periodo,
          inocar_fecha: r.inocar_fecha,
          inocar_pleamar: r.inocar_pleamar,
          inocar_bajamar: r.inocar_bajamar,
          novedades: r.novedades || []
        });
        if (options.onReporteCargado) {
          options.onReporteCargado(r);
        }
      }

      if (payload.locks) {
        Object.keys(fieldLocks).forEach(k => delete fieldLocks[k]);
        Object.assign(fieldLocks, payload.locks);
      }

      if (payload.usuariosActivos) {
        actualizarUsuariosActivos(payload.usuariosActivos);
      }
    });

    socket.on('usuarios_actualizados', (payload) => {
      if (payload.usuariosActivos) {
        actualizarUsuariosActivos(payload.usuariosActivos);
      }
    });

    socket.on('novedad_agregada', (payload) => {
      if (payload.novedad) {
        const novId = payload.novedad._id || payload.novedad.id;
        const existe = (reporte.novedades || []).some(n =>
          ((n._id || n.id) && novId && String(n._id || n.id) === String(novId)) ||
          (n.direccion === payload.novedad.direccion && n.hora === payload.novedad.hora)
        );
        if (!existe) {
          if (!reporte.novedades) reporte.novedades = [];
          reporte.novedades.push(payload.novedad);
        }
      }
      actualizarMetadatosReporte(payload);
    });

    socket.on('campo_bloqueado', (payload) => {
      fieldLocks[payload.campoKey] = {
        usuarioNombre: payload.usuarioNombre,
        usuarioId: payload.usuarioId
      };
    });

    socket.on('campo_liberado', (payload) => {
      delete fieldLocks[payload.campoKey];
    });

    socket.on('parametros_actualizados', (payload) => {
      if (payload.parametros) {
        Object.assign(reporte, payload.parametros);
      }
      actualizarMetadatosReporte(payload);
    });

    socket.on('novedad_actualizada', (payload) => {
      if (payload.novedad && reporte.novedades) {
        const novId = payload.novedad._id || payload.novedad.id;
        const idx = reporte.novedades.findIndex(n =>
          ((n._id || n.id) && novId && String(n._id || n.id) === String(novId))
        );
        if (idx >= 0) {
          Object.assign(reporte.novedades[idx], payload.novedad);
        }
      }
      actualizarMetadatosReporte(payload);
    });

    socket.on('novedad_eliminada', (payload) => {
      if (payload.novedadId && reporte.novedades) {
        const idx = reporte.novedades.findIndex(n =>
          ((n._id || n.id) && String(n._id || n.id) === String(payload.novedadId))
        );
        if (idx >= 0) {
          reporte.novedades.splice(idx, 1);
        }
      }
      actualizarMetadatosReporte(payload);
    });

    socket.on('reporte_eliminado', (payload) => {
      toast.info(`El reporte ha sido eliminado por ${payload.eliminadoPor || 'otro colaborador'}.`);
      disconnectSocket();
      if (router) {
        router.push('/reportes');
      }
    });
  }

  function actualizarUsuariosActivos(usuariosActivos) {
    const myId = usuario.value?.id || usuario.value?._id;
    const myCorreo = usuario.value?.correo;
    colaboradoresConectados.value = usuariosActivos.filter(
      u => (myId && String(u.usuarioId) !== String(myId)) || (!myId && u.correo !== myCorreo)
    );
  }

  function actualizarMetadatosReporte(payload) {
    if (payload.colaboradores) {
      reporte.colaboradores = payload.colaboradores;
    }
    if (payload.elaborado_por) {
      reporte.elaborado_por = payload.elaborado_por;
    }
  }

  function limpiarSockets() {
    disconnectSocket();
    colaboradoresConectados.value = [];
    Object.keys(fieldLocks).forEach(k => delete fieldLocks[k]);
  }

  return {
    colaboradoresConectados,
    fieldLocks,
    setupSockets,
    limpiarSockets
  };
}
