<template>
  <div class="reporte-container">
    <!-- BARRA SUPERIOR DE SALA SITUACIONAL -->
    <div class="top-nav-bar">
      <div class="nav-left">
        <router-link to="/reportes" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-arrow-left"></i> Volver a Reportes
        </router-link>
        <img src="/icons/icon_blanco.png" alt="Segura EP" class="report-nav-logo" />
        <span class="report-current-tag">
          <b>RDS:</b> {{ reporte.numero_rds || 'Cargando...' }}
        </span>
      </div>

      <div class="nav-right">
        <!-- Indicador de Colaboradores Conectados en Tiempo Real -->
        <div v-if="colaboradoresConectados.length > 0" class="collab-presence-bar">
          <span class="collab-presence-label">
            <span class="live-dot pulse"></span>
            <i class="fa-solid fa-users"></i> Colaborando:
          </span>
          <div class="collab-chips">
            <span
              v-for="c in colaboradoresConectados"
              :key="c.usuarioId || c.correo"
              class="collab-chip"
              :title="c.correo"
            >
              {{ c.nombre || c.correo }}
            </span>
          </div>
        </div>

        <button
          v-if="(reporte._id || reporte.id) && (reporte._id !== 'nuevo' && reporte.id !== 'nuevo')"
          type="button"
          class="btn btn-danger btn-m btn-del-report-nav"
          @click="eliminarReporteActual"
          title="Eliminar este reporte"
        >
          <i class="fa-solid fa-trash-can"></i> Eliminar Reporte
        </button>
        <span v-if="usuario" class="user-pill">
          <i class="fa-solid fa-user-shield"></i>{{ usuario.nombre || usuario.correo }}
        </span>
      </div>
    </div>

    <!-- Indicador de Carga -->
    <div v-if="cargandoReporte" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando datos de la Sala Situacional...</p>
    </div>

    <div v-else class="reporte-grid-layout">
      <!-- COLUMNA IZQUIERDA: 1. Registro Inmediato y 2. Parametros -->
      <div class="layout-column">
        <!-- 1. REGISTRO DEL EVENTO (ALERTA INMEDIATA) -->
        <div class="card section-registro">
          <div class="card-header">
            <h2>1. Registro del Evento (Alerta Inmediata)</h2>
          </div>

          <div class="form-group">
            <label for="indiv_dir">Direccion y Referencia:</label>
            <input
              id="indiv_dir"
              type="text"
              v-model="formNovedad.direccion"
              placeholder="Ej: PROSPERINA 6TO CALLEJON Y AV 41 DIAGONAL A LAS ROSAS"
              @input="analizarTextoNLP"
            />
          </div>

          <div v-if="nlpDetectado" class="nlp-detection-badge">
            <span>🤖 <b>Detección Inteligente:</b> {{ nlpLabel }}</span>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="indiv_tipo">Tipo de Evento:</label>
              <select id="indiv_tipo" v-model="formNovedad.tipo" @change="alCambiarTipoManual">
                <option value="AGUA">Acumulacion de agua</option>
                <option value="ARBOL">Caida de arbol</option>
                <option value="DESLIZAMIENTO">Deslizamiento</option>
                <option value="POSTE">Caida de postes</option>
                <option value="SINIESTRO">Siniestros de transito</option>
                <option value="INUNDACION">Inundaciones</option>
                <option value="VENDAVAL">Vendavales</option>
                <option value="AFECTACION">Afectacion estructural</option>
              </select>
            </div>

            <div class="form-group">
              <label for="indiv_instituciones">Instituciones Notificadas:</label>
              <input
                id="indiv_instituciones"
                type="text"
                v-model="formNovedad.instituciones"
                @input="generarAlertaInmediata"
              />
            </div>
          </div>

          <div class="grid-fecha-aga-hora">
            <div class="form-group">
              <div class="field-label-row">
                <label for="indiv_fecha">Fecha:</label>
              </div>
              <input id="indiv_fecha" type="date" v-model="formNovedad.fecha" class="form-control-aligned" />
            </div>

            <div class="form-group">
              <div class="field-label-row">
                <label for="indiv_aga">Zona AGA:</label>
                <div
                  v-if="agaStatus.mensaje"
                  class="aga-info-wrapper"
                  @mouseenter="mostrarPopupAGA = true"
                  @mouseleave="mostrarPopupAGA = false"
                >
                  <button
                    type="button"
                    class="btn-info-icon"
                    :class="agaStatus.tipo"
                    @click="mostrarPopupAGA = !mostrarPopupAGA"
                    :title="agaStatus.mensaje"
                  >
                    <i class="fa-solid fa-circle-info"></i>
                  </button>
                  <transition name="fade-popup">
                    <div v-if="mostrarPopupAGA" class="aga-floating-popup" :class="agaStatus.tipo">
                      <span class="popup-text">{{ agaStatus.mensaje }}</span>
                      <button type="button" class="btn-close-popup" @click.stop="mostrarPopupAGA = false">×</button>
                    </div>
                  </transition>
                </div>
              </div>

              <div class="input-with-action">
                <input
                  id="indiv_aga"
                  type="text"
                  v-model="formNovedad.aga"
                  placeholder="Ej: A09"
                  @input="onAgaManualInput"
                  title="Zona AGA calculada mediante cartografía WGS84 o corregida manualmente"
                  class="form-control-aligned"
                />
                <button
                  type="button"
                  class="btn-inline-geo"
                  @click="recalcularAGADesdeCoordenadas"
                  title="Recalcular AGA desde coordenadas WGS84"
                >
                  <i class="fa-solid fa-location-crosshairs"></i>
                </button>
              </div>
            </div>

            <div class="form-group">
              <div class="field-label-row">
                <label for="indiv_hora">Hora:</label>
              </div>
              <input id="indiv_hora" type="time" v-model="formNovedad.hora" @input="generarAlertaInmediata" class="form-control-aligned" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="indiv_coord">Coordenadas (Latitud, Longitud):</label>
              <input
                id="indiv_coord"
                type="text"
                v-model="formNovedad.coordenadasTexto"
                placeholder="-2.138694, -79.936833"
                @input="alCambiarCoordenadas"
              />
            </div>

            <div class="form-group">
              <label for="indiv_recurso">Recurso Asignado Inicial:</label>
              <select id="indiv_recurso" v-model="formNovedad.recurso_asignado">
                <option value="INS-ALC 🚙">INS-ALC 🚙</option>
                <option value="HK 🚛">HK 🚛</option>
                <option value="CAMIONETA-OP-CN 🚙">CAMIONETA-OP-CN 🚙</option>
                <option value="MAQUINARIA OBRAS PÚBLICAS 🚜">MAQUINARIA OBRAS PÚBLICAS 🚜</option>
                <option value="EQUIPO GESTIÓN DE RIESGOS 🦺">EQUIPO GESTIÓN DE RIESGOS 🦺</option>
                <option value="CUADRILLA PARQUES 🌳">CUADRILLA PARQUES 🌳</option>
                <option value="MAQUINARIA PARQUES 🚜">MAQUINARIA PARQUES 🚜</option>
                <option value="PATRULLAS ATM 🚓">PATRULLAS ATM 🚓</option>
                <option value="ASEO CANTONAL - URVASEO 🚛">ASEO CANTONAL - URVASEO 🚛</option>
                <option value="INSPECTOR URVASEO 🚙">INSPECTOR URVASEO 🚙</option>
                <option value="CUADRILLA URVASEO 👷">CUADRILLA URVASEO 👷</option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="indiv_estado">Estado Inicial:</label>
              <select id="indiv_estado" v-model="formNovedad.estado_operativo">
                <option value="⛔PENDIENTE">⛔PENDIENTE</option>
                <option value="🔄EN ATENCIÓN">🔄EN ATENCIÓN</option>
                <option value="✅ATENDIDO">✅ATENDIDO</option>
              </select>
            </div>

            <div class="form-group photo-field-group">
              <label>Fotografias del Evento (Max. 2):</label>
              <div class="file-upload-wrapper">
                <input
                  id="indiv_fotos_input"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden-file-input"
                  @change="manejarCargaFotos"
                />
                <label for="indiv_fotos_input" class="upload-trigger-btn" :class="{ 'disabled-upload': fotosSeleccionadas.length >= 2 }">
                  <i class="fa-solid fa-camera"></i>
                  <span>{{ fotosSeleccionadas.length >= 2 ? 'Límite de 2 fotos alcanzado' : ' Adjuntar fotografías' }}</span>
                </label>
              </div>

              <!-- Preview Fotos -->
              <div v-if="fotosSeleccionadas.length" class="photo-preview-grid">
                <div v-for="(foto, idx) in fotosSeleccionadas" :key="idx" class="photo-preview-box">
                  <img
                    :src="foto.previewUrl"
                    alt="Foto evento"
                    @click="abrirFotoModal(foto.previewUrl)"
                    title="Clic para ampliar"
                  />
                  <span class="photo-badge">Foto {{ idx + 1 }}</span>
                  <button type="button" class="btn-remove-photo" @click.stop="removerFoto(idx)" title="Quitar foto">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Alerta Inmediata Generada (Formato Oficial):</label>
            <textarea v-model="previewAlertaInmediata" rows="7" readonly></textarea>
          </div>

          <div class="btn-row">
            <button type="button" class="btn btn-secondary btn-sm" @click="copiarAlertaIndividual">
              <i class="fa-solid fa-copy"></i> Copiar Texto
            </button>
            <button type="button" class="btn btn-success btn-sm" @click="enviarWaIndividual">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </button>
          <button
            type="button"
            class="btn btn-primary btn-sm btn-consolidar"
            :disabled="guardandoNovedad"
            @click="registrarYConsolidar"
          >
            <i v-if="guardandoNovedad" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-circle-plus"></i>
            {{ guardandoNovedad ? 'Registrando novedad...' : 'Registrar y Consolidar en Reporte General' }}
          </button>
          </div>
        </div>

        <!-- 2. PARAMETROS DEL REPORTE CONSOLIDADO -->
        <div class="card section-parametros">
          <div class="card-header-with-actions">
            <h2>2. Parametros del Reporte Consolidado</h2>
            <button
              type="button"
              class="btn btn-secondary btn-m"
              @click="guardarParametrosReporte"
              :disabled="guardandoParametros"
            >
              <i v-if="guardandoParametros" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ guardandoParametros ? 'Guardando...' : 'Guardar Parámetros' }}
            </button>
          </div>

          <div class="form-group">
            <label for="p_titulo">Titulo del Reporte:</label>
            <div class="locked-wrapper">
              <input
                id="p_titulo"
                type="text"
                v-model="reporte.titulo"
                placeholder="Reporte de Novedades e Incidentes"
                :disabled="isFieldLocked('titulo')"
                :class="{ 'field-locked': isFieldLocked('titulo') }"
                @focus="onFieldFocus('titulo')"
                @blur="onFieldBlur('titulo', reporte.titulo)"
              />
              <span v-if="isFieldLocked('titulo')" class="lock-tag">
                <i class="fa-solid fa-lock"></i> [En edición por: {{ getLockedBy('titulo') }}]
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="p_rds">Numero de Reporte RDS:</label>
            <div class="locked-wrapper">
              <input
                id="p_rds"
                type="text"
                v-model="reporte.numero_rds"
                :disabled="isFieldLocked('numero_rds')"
                :class="{ 'field-locked': isFieldLocked('numero_rds') }"
                @focus="onFieldFocus('numero_rds')"
                @blur="onFieldBlur('numero_rds', reporte.numero_rds)"
              />
              <span v-if="isFieldLocked('numero_rds')" class="lock-tag">
                [En edicion por: {{ getLockedBy('numero_rds') }}]
              </span>
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label for="p_fecha">Fecha del Reporte:</label>
              <div class="locked-wrapper">
                <input
                  id="p_fecha"
                  type="date"
                  v-model="reporte.fecha_reporte"
                  :disabled="isFieldLocked('fecha_reporte')"
                  :class="{ 'field-locked': isFieldLocked('fecha_reporte') }"
                  @focus="onFieldFocus('fecha_reporte')"
                  @blur="onFieldBlur('fecha_reporte', reporte.fecha_reporte)"
                />
                <span v-if="isFieldLocked('fecha_reporte')" class="lock-tag">
                  [En edicion por: {{ getLockedBy('fecha_reporte') }}]
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="p_inicio">Hora Inicial:</label>
              <div class="locked-wrapper">
                <input
                  id="p_inicio"
                  type="time"
                  v-model="reporte.hora_inicio"
                  :disabled="isFieldLocked('hora_inicio')"
                  :class="{ 'field-locked': isFieldLocked('hora_inicio') }"
                  @focus="onFieldFocus('hora_inicio')"
                  @blur="onFieldBlur('hora_inicio', reporte.hora_inicio)"
                />
                <span v-if="isFieldLocked('hora_inicio')" class="lock-tag">
                  [En edicion por: {{ getLockedBy('hora_inicio') }}]
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="p_fin">Hora de Corte:</label>
              <div class="locked-wrapper">
                <input
                  id="p_fin"
                  type="time"
                  v-model="reporte.hora_fin"
                  :disabled="isFieldLocked('hora_fin')"
                  :class="{ 'field-locked': isFieldLocked('hora_fin') }"
                  @focus="onFieldFocus('hora_fin')"
                  @blur="onFieldBlur('hora_fin', reporte.hora_fin)"
                />
                <span v-if="isFieldLocked('hora_fin')" class="lock-tag">
                  [En edicion por: {{ getLockedBy('hora_fin') }}]
                </span>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="p_elaborado">Elaborado por:</label>
              <input
                id="p_elaborado"
                type="text"
                :value="elaboradoPorTexto"
                readonly
                placeholder="Se actualiza automaticamente con los colaboradores"
                class="input-readonly"
              />
            </div>

            <div class="form-group">
              <label for="p_revisado">Revisado por:</label>
              <div class="locked-wrapper">
                <input
                  id="p_revisado"
                  type="text"
                  v-model="reporte.revisado_por"
                  :disabled="isFieldLocked('revisado_por')"
                  :class="{ 'field-locked': isFieldLocked('revisado_por') }"
                  @focus="onFieldFocus('revisado_por')"
                  @blur="onFieldBlur('revisado_por', reporte.revisado_por)"
                />
                <span v-if="isFieldLocked('revisado_por')" class="lock-tag">
                  [En edicion por: {{ getLockedBy('revisado_por') }}]
                </span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="p_cabecera">Encabezado y Hora Inicial:</label>
            <div class="locked-wrapper">
              <input
                id="p_cabecera"
                type="text"
                v-model="reporte.cabecera"
                :disabled="isFieldLocked('cabecera')"
                :class="{ 'field-locked': isFieldLocked('cabecera') }"
                @focus="onFieldFocus('cabecera')"
                @blur="onFieldBlur('cabecera', reporte.cabecera)"
              />
              <span v-if="isFieldLocked('cabecera')" class="lock-tag">
                [En edicion por: {{ getLockedBy('cabecera') }}]
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="p_periodo">Periodo del Reporte:</label>
            <div class="locked-wrapper">
              <input
                id="p_periodo"
                type="text"
                v-model="reporte.periodo"
                :disabled="isFieldLocked('periodo')"
                :class="{ 'field-locked': isFieldLocked('periodo') }"
                @focus="onFieldFocus('periodo')"
                @blur="onFieldBlur('periodo', reporte.periodo)"
              />
              <span v-if="isFieldLocked('periodo')" class="lock-tag">
                [En edicion por: {{ getLockedBy('periodo') }}]
              </span>
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label for="p_inocar_f">Fecha INOCAR:</label>
              <div class="locked-wrapper">
                <input
                  id="p_inocar_f"
                  type="text"
                  v-model="reporte.inocar_fecha"
                  :disabled="isFieldLocked('inocar_fecha')"
                  :class="{ 'field-locked': isFieldLocked('inocar_fecha') }"
                  @focus="onFieldFocus('inocar_fecha')"
                  @blur="onFieldBlur('inocar_fecha', reporte.inocar_fecha)"
                />
                <span v-if="isFieldLocked('inocar_fecha')" class="lock-tag">
                  [En edicion por: {{ getLockedBy('inocar_fecha') }}]
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="p_pleamar">Pleamar (Marea Alta):</label>
              <div class="locked-wrapper">
                <input
                  id="p_pleamar"
                  type="text"
                  v-model="reporte.inocar_pleamar"
                  :disabled="isFieldLocked('inocar_pleamar')"
                  :class="{ 'field-locked': isFieldLocked('inocar_pleamar') }"
                  @focus="onFieldFocus('inocar_pleamar')"
                  @blur="onFieldBlur('inocar_pleamar', reporte.inocar_pleamar)"
                />
                <span v-if="isFieldLocked('inocar_pleamar')" class="lock-tag">
                  [En edicion por: {{ getLockedBy('inocar_pleamar') }}]
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="p_bajamar">Bajamar (Marea Baja):</label>
              <div class="locked-wrapper">
                <input
                  id="p_bajamar"
                  type="text"
                  v-model="reporte.inocar_bajamar"
                  :disabled="isFieldLocked('inocar_bajamar')"
                  :class="{ 'field-locked': isFieldLocked('inocar_bajamar') }"
                  @focus="onFieldFocus('inocar_bajamar')"
                  @blur="onFieldBlur('inocar_bajamar', reporte.inocar_bajamar)"
                />
                <span v-if="isFieldLocked('inocar_bajamar')" class="lock-tag">
                  [En edicion por: {{ getLockedBy('inocar_bajamar') }}]
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COLUMNA DERECHA: 3. Novedades Consolidadas, 4. Reporte Oficial, 5. Mapa -->
      <div class="layout-column">
        <!-- 3. NOVEDADES CONSOLIDADAS -->
        <div class="card section-novedades">
          <div class="card-header">
            <h2>3. Novedades Consolidadas ({{ (reporte.novedades || []).length }})</h2>
          </div>

          <div v-if="!reporte.novedades || reporte.novedades.length === 0" class="empty-novedades">
            <p>No hay novedades registradas en este reporte aun.</p>
          </div>

          <div v-else class="novedades-list">
            <div
              v-for="(nov, idx) in reporte.novedades"
              :key="nov._id || idx"
              class="novedad-item-card"
            >
              <div class="item-header">
                <span>#{{ idx + 1 }}
                  <select
                    v-model="nov.tipo_evento"
                    @change="onNovedadTipoChange(nov)"
                    style="width:auto; display:inline-block; margin-left: 5px;"
                  >
                    <option value="AGUA">🚰 Vía anegada / Acumulación de agua</option>
                    <option value="ARBOL">🌳 Caída de árbol</option>
                    <option value="DESLIZAMIENTO">⛰️ Deslizamiento / Socavón</option>
                    <option value="POSTE">⚡ Caída de postes</option>
                    <option value="SINIESTRO">🚗 Siniestros de tránsito</option>
                    <option value="INUNDACION">🌊 Inundaciones</option>
                    <option value="VENDAVAL">💨 Vendavales</option>
                    <option value="AFECTACION">🏚️ Afectación estructural</option>
                  </select>
                </span>
                <button
                  type="button"
                  class="btn btn-danger btn-xs"
                  @click="eliminarNovedad(nov, idx)"
                  title="Eliminar novedad"
                >
                  ✕ Eliminar
                </button>
              </div>

              <input
                type="text"
                v-model="nov.direccion"
                @blur="guardarEdicionNovedad(nov)"
              />

              <div class="grid-novedad-meta" style="margin-top:6px;">
                <input
                  type="date"
                  aria-label="Fecha del evento"
                  v-model="nov.fecha_evento"
                  @blur="guardarEdicionNovedad(nov)"
                />
                <input
                  type="text"
                  aria-label="AGA"
                  v-model="nov.aga"
                  title="AGA vinculada a las coordenadas WGS84; puede corregirse manualmente"
                  @blur="guardarEdicionNovedad(nov)"
                />
                <input
                  type="time"
                  aria-label="Hora del evento"
                  v-model="nov.hora_evento"
                  @blur="guardarEdicionNovedad(nov)"
                />
                <input
                  type="text"
                  aria-label="Coordenadas"
                  title="Latitud, longitud"
                  :value="nov.coordTexto !== undefined ? nov.coordTexto : obtenerCoordsTexto(nov)"
                  @input="onInputCoordsNovedad(nov, $event.target.value)"
                  @blur="guardarEdicionNovedad(nov)"
                  placeholder="-2.1894, -79.8891"
                />
              </div>

              <div class="grid-2" style="margin-top:6px;">
                <select v-model="nov.recurso_asignado" @change="guardarEdicionNovedad(nov)">
                  <option value="INS-ALC 🚙">INS-ALC 🚙</option>
                  <option value="HK 🚛">HK 🚛</option>
                  <option value="CAMIONETA-OP-CN 🚙">CAMIONETA-OP-CN 🚙</option>
                  <option value="MAQUINARIA OBRAS PÚBLICAS 🚜">MAQUINARIA OBRAS PÚBLICAS 🚜</option>
                  <option value="EQUIPO GESTIÓN DE RIESGOS 🦺">EQUIPO GESTIÓN DE RIESGOS 🦺</option>
                  <option value="CUADRILLA PARQUES 🌳">CUADRILLA PARQUES 🌳</option>
                  <option value="MAQUINARIA PARQUES 🚜">MAQUINARIA PARQUES 🚜</option>
                  <option value="PATRULLAS ATM 🚓">PATRULLAS ATM 🚓</option>
                  <option value="ASEO CANTONAL - URVASEO 🚛">ASEO CANTONAL - URVASEO 🚛</option>
                  <option value="INSPECTOR URVASEO 🚙">INSPECTOR URVASEO 🚙</option>
                  <option value="CUADRILLA URVASEO 👷">CUADRILLA URVASEO 👷</option>
                </select>

                <select v-model="nov.estado_operativo" @change="guardarEdicionNovedad(nov)">
                  <option value="⛔PENDIENTE">⛔PENDIENTE</option>
                  <option value="🔄EN ATENCIÓN">🔄EN ATENCIÓN</option>
                  <option value="✅ATENDIDO">✅ATENDIDO</option>
                </select>
              </div>

              <div v-if="nov.fotos && nov.fotos.length" class="item-photos" style="margin-top:8px;">
                <div
                  v-for="(f, fIdx) in nov.fotos"
                  :key="fIdx"
                  class="item-photo-wrapper"
                  @click="abrirFotoModal(f)"
                  title="Clic para ampliar fotografía"
                >
                  <img
                    :src="resolverUrlFoto(f)"
                    alt="Evidencia fotográfica"
                    class="thumb-img"
                    loading="lazy"
                  />
                  <span class="photo-count-tag">Foto {{ fIdx + 1 }}</span>
                  <div class="zoom-overlay">
                    <span><i class="fa-solid fa-magnifying-glass-plus"></i></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. REPORTE CONSOLIDADO OFICIAL -->
        <div class="card section-reporte">
          <div class="card-header">
            <h2>4. Reporte Consolidado Oficial</h2>
          </div>

          <textarea
            :value="reporteConsolidadoTexto"
            rows="16"
            readonly
            class="consolidado-textarea"
          ></textarea>

          <div class="btn-row" style="margin-top: 10px;">
            <button type="button" class="btn btn-secondary btn-m" @click="copiarConsolidado">
              <i class="fa-solid fa-clipboard"></i> Copiar Reporte Consolidado
            </button>
            <button type="button" class="btn btn-success btn-m" @click="enviarWaConsolidado">
              <i class="fa-brands fa-whatsapp"></i> Abrir en WhatsApp
            </button>
            <button
              type="button"
              class="btn btn-primary btn-m"
              :disabled="descargandoWord"
              @click="generarWord"
            >
              <i v-if="descargandoWord" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-file-word"></i>
              {{ descargandoWord ? 'Generando documento Word...' : 'Descargar Informe Word' }}
            </button>
          </div>

        </div>

        <!-- 5. MAPA DE NOVEDADES (CARTO + LEAFLET) -->
        <div class="card section-mapa">
          <div class="card-header">
            <h2>5. Mapa de Georreferenciacion y Densidad</h2>
          </div>

          <!-- Exportación SIG / Shapefile WGS84 -->
          <div class="sig-export">
            <div class="sig-export-note">
              {{ resumenExportacionSIG }}
            </div>
            <div class="sig-field">
              <label for="shp_fecha">Fecha de los eventos:</label>
              <input type="date" id="shp_fecha" v-model="shpFecha" />
            </div>
            <button
              type="button"
              class="btn-sig"
              :disabled="exportandoShapefile"
              @click="descargarShapefile"
            >
              <i v-if="exportandoShapefile" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-file-zipper"></i>
              {{ exportandoShapefile ? 'Generando Shapefile...' : 'Descargar Shapefile (.zip)' }}
            </button>
          </div>

          <MapLeaflet :novedades="reporte.novedades || []" />
        </div>
      </div>
    </div>

    <ModalRegister v-model="showModalRegister" />

    <!-- Modal Visor de Fotografia Ampliada (Lightbox) -->
    <div v-if="fotoModalUrl" class="lightbox-backdrop" @click="cerrarFotoModal">
      <div class="lightbox-card" @click.stop>
        <button type="button" class="lightbox-close" @click="cerrarFotoModal" title="Cerrar">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <img :src="fotoModalUrl" alt="Fotografia en alta resolucion" class="lightbox-image" />
        <div class="lightbox-footer">
          <a :href="fotoModalUrl" target="_blank" rel="noopener" class="btn btn-sm btn-outline-white">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir en pestaña nueva
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authService, reportesService } from '../services/api.js';
import { initSocket, getSocket, disconnectSocket, isSocketConnected } from '../services/socket.js';
import {
  detectarCategoriaNLP,
  extraerMetadatosNLP,
  institucionesPorTipo,
  textoEventoIndividual,
  obtenerAGAPorCoordenadas,
  parsearCoordenadasNLP,
  normalizarDescripcionNLP,
  evaluarEstadoAGA,
  abrirWhatsApp,
  emojisNumeros,
  preservarEmoticonesWhatsApp
} from '../services/nlpDetector.js';
import { exportarReporteWord } from '../services/wordExport.js';
import { exportarShapefileEventos, obtenerEventosSIGPorFecha } from '../services/shapefileExport.js';
import {
  obtenerFechaActualISO,
  obtenerHoraActual,
  generarCabeceraDinamica,
  generarPeriodoDinamico,
  calcularPronosticoInocar
} from '../services/timeAndTides.js';
import MapLeaflet from '../components/MapLeaflet.vue';
import ModalRegister from '../components/ModalRegister.vue';
import { toast } from '../services/toast.js';

const route = useRoute();
const router = useRouter();

const reporteId = computed(() => route.params.id || 'nuevo');
const usuario = computed(() => authService.getUsuarioSesion());

const cargandoReporte = ref(false);
const guardandoNovedad = ref(false);
const guardandoParametros = ref(false);
const descargandoWord = ref(false);
const exportandoShapefile = ref(false);
const sincronizandoExcel = ref(false);
const showModalRegister = ref(false);
const listaReportes = ref([]);
const colaboradoresConectados = ref([]);

const hoy = new Date().toISOString().split('T')[0];
const shpFecha = ref(hoy);

const reporte = reactive({
  _id: '',
  titulo: 'Reporte de Novedades e Incidentes - Sala Situacional',
  numero_rds: `SEGURA-EP-GASGEC-SS-${new Date().getFullYear()}-001`,
  fecha_reporte: hoy,
  hora_inicio: '06:00',
  hora_fin: '22:00',
  revisado_por: '',
  elaborado_por: '',
  cabecera: `REPORTE DE NOVEDADES POR LLUVIAS INICIAL: ${hoy} 06h00`,
  periodo: 'Durante el turno de monitoreo se han registrado las siguientes novedades en el canton Guayaquil:',
  inocar_fecha: '',
  inocar_pleamar: '',
  inocar_bajamar: '',
  colaboradores: [],
  novedades: []
});

const elaboradoPorTexto = computed(() => {
  if (reporte.colaboradores && Array.isArray(reporte.colaboradores) && reporte.colaboradores.length > 0) {
    return reporte.colaboradores
      .map(c => typeof c === 'string' ? c : (c.nombre || c.correo))
      .filter(Boolean)
      .join(', ');
  }
  return usuario.value?.nombre || usuario.value?.correo || 'Sin colaboradores';
});

const formNovedad = reactive({
  direccion: '',
  tipo: 'AGUA',
  instituciones: '@emapagye @interagua',
  fecha: hoy,
  hora: obtenerHoraActual(),
  aga: '',
  agaManual: false,
  coordenadasTexto: '',
  lat: null,
  lng: null,
  recurso_asignado: 'INS-ALC 🚙',
  estado_operativo: '⛔PENDIENTE'
});

const nlpDetectado = ref(false);
const nlpLabel = ref('');
const previewAlertaInmediata = ref('');
const fotosSeleccionadas = ref([]);
const agaStatus = ref({
  mensaje: '',
  tipo: ''
});

const mostrarPopupAGA = ref(false);
let agaPopupTimer = null;

function dispararPopupAGA() {
  mostrarPopupAGA.value = true;
  if (agaPopupTimer) clearTimeout(agaPopupTimer);
  agaPopupTimer = setTimeout(() => {
    mostrarPopupAGA.value = false;
  }, 4000);
}

// Field Locks de Socket.io
const fieldLocks = reactive({});

function isFieldLocked(campoKey) {
  const lock = fieldLocks[campoKey];
  if (!lock) return false;

  const currentUserId = usuario.value?.id || usuario.value?._id;
  const currentCorreo = usuario.value?.correo;
  const currentNombre = usuario.value?.nombre;

  // Si el bloqueo lo tiene el operador actual, no se bloquea a si mismo
  if (currentUserId && String(lock.usuarioId) === String(currentUserId)) {
    return false;
  }
  if (lock.usuarioNombre && (lock.usuarioNombre === currentCorreo || (currentNombre && lock.usuarioNombre === currentNombre))) {
    return false;
  }

  return true;
}

function getLockedBy(campoKey) {
  return fieldLocks[campoKey]?.usuarioNombre || 'Otro operador';
}

function onFieldFocus(campoKey) {
  if (isFieldLocked(campoKey)) return;
  const socket = getSocket();
  const currentId = reporte._id || reporte.id;
  if (socket && socket.connected && currentId && currentId !== 'nuevo') {
    socket.emit('lock_campo', {
      reporteId: currentId,
      campoKey,
      usuarioId: usuario.value?.id || usuario.value?._id,
      usuarioNombre: usuario.value?.nombre || usuario.value?.correo
    });
  }
}

function onFieldBlur(campoKey, valor) {
  const socket = getSocket();
  const currentId = reporte._id || reporte.id;
  if (socket && socket.connected && currentId && currentId !== 'nuevo') {
    socket.emit('unlock_campo', { reporteId: currentId, campoKey });
    socket.emit('actualizar_parametros', {
      reporteId: currentId,
      parametros: { [campoKey]: valor }
    });
  }
}

function obtenerNombreTipo(tipo) {
  return textoEventoIndividual[tipo] || tipo || 'Evento';
}

function actualizarEstadoAGA() {
  const coords = parsearCoordenadasNLP(formNovedad.coordenadasTexto);
  const nuevoEstado = evaluarEstadoAGA(coords, formNovedad.aga, formNovedad.agaManual);
  if (nuevoEstado?.mensaje !== agaStatus.value?.mensaje) {
    agaStatus.value = nuevoEstado;
    if (nuevoEstado?.mensaje && formNovedad.coordenadasTexto) {
      dispararPopupAGA();
    }
  } else {
    agaStatus.value = nuevoEstado;
  }
}

function onAgaManualInput() {
  formNovedad.agaManual = true;
  formNovedad.aga = String(formNovedad.aga || '').trim().toUpperCase();
  actualizarEstadoAGA();
}

function recalcularAGADesdeCoordenadas() {
  formNovedad.agaManual = false;
  const coords = parsearCoordenadasNLP(formNovedad.coordenadasTexto);
  if (coords) {
    formNovedad.lat = coords.lat;
    formNovedad.lng = coords.lng;
    formNovedad.coordenadasTexto = coords.texto;
    const calculada = obtenerAGAPorCoordenadas(coords.lat, coords.lng);
    formNovedad.aga = calculada || 'N/D';
  } else {
    formNovedad.lat = null;
    formNovedad.lng = null;
    formNovedad.aga = 'N/D';
  }
  actualizarEstadoAGA();
  generarAlertaInmediata();
}

function analizarTextoNLP() {
  const dir = formNovedad.direccion;
  if (dir && dir.trim().length > 3) {
    const cat = detectarCategoriaNLP(dir);
    const meta = extraerMetadatosNLP(dir);
    if (cat) {
      formNovedad.tipo = cat;
      formNovedad.instituciones = institucionesPorTipo[cat] || '@Segura_EP';
      nlpDetectado.value = true;
      nlpLabel.value = textoEventoIndividual[cat];
    } else {
      nlpDetectado.value = false;
    }
    if (meta.aga && !formNovedad.agaManual) {
      formNovedad.aga = meta.aga;
    }
    if (meta.hora) {
      formNovedad.hora = meta.hora;
    }
    if (meta.coordenadas && !formNovedad.coordenadasTexto) {
      formNovedad.coordenadasTexto = meta.coordenadas.texto;
      formNovedad.lat = meta.coordenadas.lat;
      formNovedad.lng = meta.coordenadas.lng;
      if (!formNovedad.agaManual) {
        const calcAga = obtenerAGAPorCoordenadas(meta.coordenadas.lat, meta.coordenadas.lng);
        if (calcAga) formNovedad.aga = calcAga;
      }
    }
    actualizarEstadoAGA();
  } else {
    nlpDetectado.value = false;
  }
  generarAlertaInmediata();
}

function alCambiarTipoManual() {
  formNovedad.instituciones = institucionesPorTipo[formNovedad.tipo] || '@Segura_EP';
  generarAlertaInmediata();
}

function alCambiarCoordenadas() {
  const coords = parsearCoordenadasNLP(formNovedad.coordenadasTexto);
  if (coords) {
    formNovedad.lat = coords.lat;
    formNovedad.lng = coords.lng;
    if (!formNovedad.agaManual) {
      const calculada = obtenerAGAPorCoordenadas(coords.lat, coords.lng);
      formNovedad.aga = calculada || 'N/D';
    }
  } else {
    formNovedad.lat = null;
    formNovedad.lng = null;
    if (!formNovedad.agaManual) {
      formNovedad.aga = 'N/D';
    }
  }
  actualizarEstadoAGA();
  generarAlertaInmediata();
}

function generarAlertaInmediata() {
  const dir = formNovedad.direccion.trim() || 'PROSPERINA 6TO CALLEJON Y AV 41 DIAGONAL A LAS ROSAS';
  const coord = formNovedad.coordenadasTexto.trim();
  const tipo = formNovedad.tipo;
  const inst = formNovedad.instituciones.trim() || '@emapagye @interagua';
  const eventoStr = textoEventoIndividual[tipo] || 'acumulación de agua';

  const numeroIcono = emojisNumeros[reporte.novedades?.length || 0] || `${(reporte.novedades?.length || 0) + 1}️⃣`;

  previewAlertaInmediata.value = `${numeroIcono}Desde el C5 de #SeguraEP se visualiza ${eventoStr} en ${dir}, #LluviasEc, se notificó a ${inst}.

Coordenadas
${coord}

*Sala Situacional de Segura EP* | 098-896-1307 | salasituacional@seguraep.gob.ec`;
}

function copiarAlertaIndividual() {
  navigator.clipboard.writeText(previewAlertaInmediata.value);
  toast.info('Alerta individual copiada al portapapeles.');
}

function enviarWaIndividual() {
  abrirWhatsApp(previewAlertaInmediata.value);
}

async function compartirAlertaIndividual() {
  const texto = previewAlertaInmediata.value;
  const files = fotosSeleccionadas.value.map(f => f.file);

  if (navigator.share) {
    try {
      const shareData = { text: texto };
      if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files;
      }
      await navigator.share(shareData);
      return;
    } catch (e) {
      if (e.name !== 'AbortError') enviarWaIndividual();
    }
  } else {
    enviarWaIndividual();
  }
}

function manejarCargaFotos(e) {
  const files = Array.from(e.target.files || []);
  if (fotosSeleccionadas.value.length + files.length > 2) {
    toast.warning('Unicamente se permite adjuntar hasta 2 fotografias.');
    e.target.value = '';
    return;
  }

  files.forEach(file => {
    if (fotosSeleccionadas.value.length < 2) {
      fotosSeleccionadas.value.push({
        file,
        previewUrl: URL.createObjectURL(file)
      });
    }
  });

  e.target.value = '';
}

function removerFoto(index) {
  fotosSeleccionadas.value.splice(index, 1);
}

const fotoModalUrl = ref('');

function resolverUrlFoto(foto) {
  if (!foto) return '';
  const url = typeof foto === 'string' ? foto : (foto.url || foto.previewUrl || foto.path || '');
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://10.10.80.70:3090').replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
}

function abrirFotoModal(foto) {
  fotoModalUrl.value = resolverUrlFoto(foto);
}

function cerrarFotoModal() {
  fotoModalUrl.value = '';
}

async function asegurarReporteCreado() {
  const currentId = reporte._id || reporte.id;
  if (currentId && currentId !== 'nuevo') return currentId;

  const uId = usuario.value?.id || usuario.value?._id || '';
  const uCorreo = usuario.value?.correo || '';
  const dataCreacion = {
    titulo: reporte.titulo || '',
    observaciones_generales: '',
    numero_rds: reporte.numero_rds || `SEGURA-EP-GASGEC-SS-${new Date().getFullYear()}-001`,
    fecha_reporte: reporte.fecha_reporte || hoy,
    hora_inicio: reporte.hora_inicio || '',
    hora_fin: reporte.hora_fin || '',
    revisado_por: reporte.revisado_por || '',
    cabecera: reporte.cabecera,
    periodo: reporte.periodo,
    inocar_fecha: reporte.inocar_fecha,
    inocar_pleamar: reporte.inocar_pleamar,
    inocar_bajamar: reporte.inocar_bajamar,
    usuario_id: uId,
    correo_colaborador: uCorreo,
    colaboradores: uCorreo ? [uCorreo] : []
  };

  const nuevo = await reportesService.create(dataCreacion);
  const id = nuevo?.id || nuevo?._id || nuevo?.reporte?.id || nuevo?.reporte?._id;
  reporte._id = id;
  reporte.id = id;
  router.replace(`/reportes/${id}`);
  setupSockets();
  return id;
}

async function guardarParametrosReporte() {
  guardandoParametros.value = true;
  try {
    const id = await asegurarReporteCreado();
    const payloadParametros = {
      titulo: reporte.titulo,
      numero_rds: reporte.numero_rds,
      fecha_reporte: reporte.fecha_reporte,
      hora_inicio: reporte.hora_inicio,
      hora_fin: reporte.hora_fin,
      revisado_por: reporte.revisado_por,
      cabecera: reporte.cabecera,
      periodo: reporte.periodo,
      inocar_fecha: reporte.inocar_fecha,
      inocar_pleamar: reporte.inocar_pleamar,
      inocar_bajamar: reporte.inocar_bajamar
    };

    // Actualizar via REST API
    await reportesService.actualizarParametros(id, payloadParametros);

    // Notificar via WebSocket en tiempo real
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('actualizar_parametros', {
        reporteId: id,
        parametros: payloadParametros
      });
    }
    toast.success('Parámetros guardados y sincronizados en la Sala Situacional.');
  } catch (err) {
    toast.error('Error al guardar parámetros: ' + (err.response?.data?.error || err.message));
  } finally {
    guardandoParametros.value = false;
  }
}

async function registrarYConsolidar() {
  const dir = formNovedad.direccion.trim();
  if (!dir) {
    toast.warning('Ingrese la direccion en el formulario.');
    return;
  }

  const coords = parsearCoordenadasNLP(formNovedad.coordenadasTexto);
  if (!coords) {
    toast.warning('Ingrese coordenadas validas (latitud, longitud).');
    return;
  }

  guardandoNovedad.value = true;

  try {
    const id = await asegurarReporteCreado();

    let fotosSubidas = [];
    if (fotosSeleccionadas.value.length > 0) {
      const formData = new FormData();
      fotosSeleccionadas.value.forEach(f => formData.append('fotos', f.file));
      try {
        const uploadRes = await reportesService.uploadFotos(formData);
        fotosSubidas = uploadRes.fotos || [];
      } catch (errUpload) {
        console.warn('Error subiendo fotos:', errUpload);
      }
    }

    const payload = {
      tipo: formNovedad.tipo,
      tipo_evento: formNovedad.tipo,
      fecha: formNovedad.fecha || reporte.fecha_reporte,
      fecha_evento: formNovedad.fecha || reporte.fecha_reporte,
      hora: formNovedad.hora || '00:00',
      hora_evento: formNovedad.hora || '00:00',
      direccion: normalizarDescripcionNLP(dir),
      coordenadas: coords,
      latitud: coords.lat,
      longitud: coords.lng,
      aga: formNovedad.aga || 'N/D',
      instituciones: formNovedad.instituciones || '@Segura_EP',
      recurso_asignado: formNovedad.recurso_asignado,
      estado_operativo: formNovedad.estado_operativo,
      fotos: fotosSubidas,
      descripcion: `${textoEventoIndividual[formNovedad.tipo] || formNovedad.tipo} en ${dir}`,
      acciones_inmediatas: `Notificado a ${formNovedad.instituciones}`
    };

    // 1. Guardar siempre en backend vía API REST
    const res = await reportesService.addNovedad(id, payload);

    if (res && res.reporte && Array.isArray(res.reporte.novedades)) {
      reporte.novedades = res.reporte.novedades;
      if (res.reporte.colaboradores) {
        reporte.colaboradores = res.reporte.colaboradores;
      }
    } else if (res && res.novedad) {
      reporte.novedades.push(res.novedad);
    } else {
      reporte.novedades.push(payload);
    }

    // Resetear formulario completo y fotos
    formNovedad.direccion = '';
    formNovedad.coordenadasTexto = '';
    formNovedad.aga = '';
    formNovedad.agaManual = false;
    formNovedad.lat = null;
    formNovedad.lng = null;
    formNovedad.tipo = 'AGUA';
    formNovedad.instituciones = '@emapagye @interagua';
    formNovedad.hora = obtenerHoraActual();
    formNovedad.recurso_asignado = 'INS-ALC 🚙';
    formNovedad.estado_operativo = '⛔PENDIENTE';
    nlpDetectado.value = false;
    nlpLabel.value = '';
    fotosSeleccionadas.value = [];
    actualizarEstadoAGA();
    generarAlertaInmediata();
    toast.success('Novedad registrada y consolidada en el reporte.');
  } catch (err) {
    toast.error('Error al registrar novedad: ' + (err.response?.data?.error || err.message));
  } finally {
    guardandoNovedad.value = false;
  }
}

async function guardarEdicionNovedad(nov) {
  if (!nov) return;
  if (!nov.tipo_evento && nov.tipo) nov.tipo_evento = nov.tipo;
  if (!nov.fecha_evento && nov.fecha) nov.fecha_evento = nov.fecha;
  if (!nov.hora_evento && nov.hora) nov.hora_evento = nov.hora;
  if (!nov.direccion && nov.dir) nov.direccion = nov.dir;

  const textoCoords = nov.coordTexto !== undefined ? nov.coordTexto : obtenerCoordsTexto(nov);
  const coords = parsearCoordenadasNLP(textoCoords);
  const lat = coords ? coords.lat : (nov.latitud !== undefined && nov.latitud !== null ? Number(nov.latitud) : (nov.lat !== undefined ? Number(nov.lat) : -2.1894));
  const lng = coords ? coords.lng : (nov.longitud !== undefined && nov.longitud !== null ? Number(nov.longitud) : (nov.lng !== undefined ? Number(nov.lng) : -79.8891));
  delete nov.coordTexto;

  const payload = {
    tipo_evento: nov.tipo_evento || 'AGUA',
    tipo: nov.tipo_evento || 'AGUA',
    direccion: normalizarDescripcionNLP(nov.direccion || ''),
    aga: nov.aga || 'N/D',
    instituciones: nov.instituciones || '@Segura_EP',
    fecha_evento: nov.fecha_evento || reporte.fecha_reporte || hoy,
    fecha: nov.fecha_evento || reporte.fecha_reporte || hoy,
    hora_evento: nov.hora_evento || '00:00',
    hora: nov.hora_evento || '00:00',
    latitud: lat,
    longitud: lng,
    recurso_asignado: nov.recurso_asignado || 'INS-ALC 🚙',
    estado_operativo: nov.estado_operativo || '⛔PENDIENTE',
    fotos: Array.isArray(nov.fotos) ? nov.fotos : [],
    descripcion: nov.descripcion || `${textoEventoIndividual[nov.tipo_evento] || nov.tipo_evento} en ${nov.direccion}`,
    acciones_inmediatas: nov.acciones_inmediatas || `Notificado a ${nov.instituciones}`
  };

  const id = reporte._id || reporte.id;
  const novId = nov._id || nov.id;
  if (id && id !== 'nuevo' && novId) {
    try {
      const res = await reportesService.updateNovedad(id, novId, payload);
      if (res && res.colaboradores) {
        reporte.colaboradores = res.colaboradores;
      }
      if (res && res.elaborado_por) {
        reporte.elaborado_por = res.elaborado_por;
      }
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('actualizar_novedad', {
          reporteId: id,
          novedadId: novId,
          cambios: payload
        });
      }
      toast.success('Novedad actualizada correctamente.');
    } catch (err) {
      toast.error('Error al actualizar novedad: ' + (err.response?.data?.error || err.message));
    }
  }
}

function onNovedadTipoChange(nov) {
  nov.tipo = nov.tipo_evento;
  if (!nov.instituciones || nov.instituciones === '@emapagye @interagua' || nov.instituciones.startsWith('@')) {
    nov.instituciones = institucionesPorTipo[nov.tipo_evento] || '@Segura_EP';
  }
  guardarEdicionNovedad(nov);
}

function obtenerCoordsTexto(nov) {
  const lat = nov.latitud !== undefined && nov.latitud !== null ? nov.latitud : (nov.coordenadas?.lat !== undefined ? nov.coordenadas.lat : nov.lat);
  const lng = nov.longitud !== undefined && nov.longitud !== null ? nov.longitud : (nov.coordenadas?.lng !== undefined ? nov.coordenadas.lng : nov.lng);
  if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
    return `${lat}, ${lng}`;
  }
  return '';
}

function onInputCoordsNovedad(nov, texto) {
  nov.coordTexto = texto;
  const coords = parsearCoordenadasNLP(texto);
  if (coords) {
    nov.latitud = coords.lat;
    nov.longitud = coords.lng;
    nov.lat = coords.lat;
    nov.lng = coords.lng;
    const calcAga = obtenerAGAPorCoordenadas(coords.lat, coords.lng);
    if (calcAga) nov.aga = calcAga;
  }
}

async function eliminarNovedad(nov, index) {
  if (!confirm(`¿Desea eliminar la novedad #${index + 1}?`)) {
    return;
  }

  const id = reporte._id || reporte.id;
  const novedadId = nov?._id || nov?.id;

  if (id && id !== 'nuevo' && novedadId) {
    try {
      const res = await reportesService.deleteNovedad(id, novedadId);
      if (res && res.colaboradores) {
        reporte.colaboradores = res.colaboradores;
      }
      if (res && res.elaborado_por) {
        reporte.elaborado_por = res.elaborado_por;
      }
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('eliminar_novedad', {
          reporteId: id,
          novedadId
        });
      }
      reporte.novedades.splice(index, 1);
      toast.success('Novedad eliminada exitosamente.');
    } catch (err) {
      toast.error('Error al eliminar novedad: ' + (err.response?.data?.error || err.message));
    }
  } else {
    reporte.novedades.splice(index, 1);
    toast.success('Novedad eliminada.');
  }
}

async function eliminarFotoDeNovedad(nov, fIdx) {
  if (nov.fotos && nov.fotos.length > fIdx) {
    nov.fotos.splice(fIdx, 1);
    await guardarEdicionNovedad(nov);
  }
}

async function subirFotoDirectaANovedad(nov, event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  if ((nov.fotos?.length || 0) + files.length > 2) {
    toast.warning('Únicamente se permite adjuntar hasta 2 fotografías por novedad.');
    event.target.value = '';
    return;
  }

  const formData = new FormData();
  files.forEach(f => formData.append('fotos', f));

  try {
    const uploadRes = await reportesService.uploadFotos(formData);
    const subidas = uploadRes.fotos || [];
    if (!Array.isArray(nov.fotos)) nov.fotos = [];
    nov.fotos = nov.fotos.concat(subidas);
    await guardarEdicionNovedad(nov);
  } catch (err) {
    toast.error('Error al subir fotografía: ' + err.message);
  } finally {
    event.target.value = '';
  }
}

function formatearRecursoConEmoji(rec) {
  if (!rec) return 'INS-ALC 🚙';
  if (/[🚙🚛🚜🦺🌳🚓👷]/.test(rec)) return rec;
  const mapa = {
    'INS-ALC': 'INS-ALC 🚙',
    'HK': 'HK 🚛',
    'CAMIONETA-OP-CN': 'CAMIONETA-OP-CN 🚙',
    'MAQUINARIA OBRAS PUBLICAS': 'MAQUINARIA OBRAS PÚBLICAS 🚜',
    'MAQUINARIA OBRAS PÚBLICAS': 'MAQUINARIA OBRAS PÚBLICAS 🚜',
    'EQUIPO GESTION DE RIESGOS': 'EQUIPO GESTIÓN DE RIESGOS 🦺',
    'EQUIPO GESTIÓN DE RIESGOS': 'EQUIPO GESTIÓN DE RIESGOS 🦺',
    'CUADRILLA PARQUES': 'CUADRILLA PARQUES 🌳',
    'MAQUINARIA PARQUES': 'MAQUINARIA PARQUES 🚜',
    'PATRULLAS ATM': 'PATRULLAS ATM 🚓',
    'ASEO CANTONAL - URVASEO': 'ASEO CANTONAL - URVASEO 🚛',
    'INSPECTOR URVASEO': 'INSPECTOR URVASEO 🚙',
    'CUADRILLA URVASEO': 'CUADRILLA URVASEO 👷'
  };
  return mapa[rec] || `${rec} 🚙`;
}

function formatearEstadoConEmoji(est) {
  if (!est) return '⛔PENDIENTE';
  if (/[⛔🔄✅]/.test(est)) return est;
  const upper = String(est).toUpperCase();
  if (upper.includes('ATENDIDO')) return '✅ATENDIDO';
  if (upper.includes('ATENCION') || upper.includes('ATENCIÓN')) return '🔄EN ATENCIÓN';
  return '⛔PENDIENTE';
}

// Reporte Consolidado Texto
const reporteConsolidadoTexto = computed(() => {
  const cabecera = reporte.cabecera || `REPORTE DE NOVEDADES POR LLUVIAS INICIAL: ${reporte.fecha_reporte || ''} ${reporte.hora_inicio || ''}`;
  const frase = reporte.periodo || 'Durante la noche del 7 de mayo se han registrado las siguientes novedades en el cantón Guayaquil por efecto de las lluvias:';
  const fechaInocar = reporte.inocar_fecha || '7 de mayo';
  const pleamar = reporte.inocar_pleamar || 'a las 22h42 con 4.13m';
  const bajamar = reporte.inocar_bajamar || 'a las 05h27 del 08/05/2026 con 0.79m';

  const categorias = {
    AGUA: { titulo: "𝗧𝗿𝗮𝗯𝗮𝗷𝗼𝘀 𝗲𝗻 𝘃𝗶́𝗮𝘀 𝗽𝗼𝗿 𝗮𝗰𝘂𝗺𝘂𝗹𝗮𝗰𝗶𝗼́𝗻 𝗱𝗲 𝗮𝗴𝘂𝗮:🚰", items: [] },
    ARBOL: { titulo: "𝗖𝗮𝗶́𝗱𝗮 𝗱𝗲 𝗮́𝗿𝗯𝗼𝗹𝗲𝘀 / 𝗿𝗮𝗺𝗮𝘀:🌳", items: [] },
    DESLIZAMIENTO: { titulo: "𝗗𝗲𝘀𝗹𝗶𝘇𝗮𝗺𝗶𝗲𝗻𝘁𝗼𝘀 / 𝗦𝗼𝗰𝗮𝘃𝗼𝗻𝗲𝘀:⛰️", items: [] },
    POSTE: { titulo: "𝗖𝗮𝗶́𝗱𝗮 𝗱𝗲 𝗽𝗼𝘀𝘁𝗲𝘀 / 𝗰𝗮𝗯𝗹𝗲𝗮𝗱𝗼:⚡", items: [] },
    SINIESTRO: { titulo: "𝗦𝗶𝗻𝗶𝗲𝘀𝘁𝗿𝗼𝘀 𝗱𝗲 𝘁𝗿𝗮́𝗻𝘀𝗶𝘁𝗼:🚗", items: [] },
    INUNDACION: { titulo: "𝗜𝗻𝘂𝗻𝗱𝗮𝗰𝗶𝗼𝗻𝗲𝘀:🌊", items: [] },
    VENDAVAL: { titulo: "𝗔𝗳𝗲𝗰𝘁𝗮𝗰𝗶𝗼𝗻𝗲𝘀 𝗽𝗼𝗿 𝘃𝗲𝗻𝗱𝗮𝘃𝗮𝗹𝗲𝘀:💨", items: [] },
    AFECTACION: { titulo: "𝗔𝗳𝗲𝗰𝘁𝗮𝗰𝗶𝗼́𝗻 𝗲𝘀𝘁𝗿𝘂𝗰𝘁𝘂𝗿𝗮𝗹:🏚️", items: [] }
  };

  const lista = reporte.novedades || [];
  lista.forEach(item => {
    const t = item.tipo_evento || item.tipo || 'AGUA';
    if (categorias[t]) {
      categorias[t].items.push(item);
    }
  });

  let cuerpoNovedades = "";
  for (const [clave, cat] of Object.entries(categorias)) {
    if (cat.items.length > 0) {
      cuerpoNovedades += `${cat.titulo}\n\n`;
      cat.items.forEach((item, i) => {
        const num = emojisNumeros[i] || `${i + 1}️⃣`;
        const dir = item.direccion || item.dir || '';
        const rec = formatearRecursoConEmoji(item.recurso_asignado || item.recurso);
        const est = formatearEstadoConEmoji(item.estado_operativo || item.estado);
        cuerpoNovedades += `${num}${dir} (${rec}-(${est}))\n`;
      });
      cuerpoNovedades += "\n";
    }
  }

  // Reglas de lenguaje natural para eliminar lo reportado
  const tiposOcurridos = new Set(lista.map(n => n.tipo_evento || n.tipo));
  const noOcurridos = [];

  if (!tiposOcurridos.has("POSTE")) noOcurridos.push("caída de postes");
  if (!tiposOcurridos.has("ARBOL")) noOcurridos.push("árboles");
  if (!tiposOcurridos.has("INUNDACION")) noOcurridos.push("inundaciones");
  if (!tiposOcurridos.has("DESLIZAMIENTO")) { 
    noOcurridos.push("socavones"); 
    noOcurridos.push("deslizamientos"); 
  }
  if (!tiposOcurridos.has("VENDAVAL")) noOcurridos.push("vendavales");
  if (!tiposOcurridos.has("SINIESTRO")) noOcurridos.push("siniestros de tránsito");
  if (!tiposOcurridos.has("AFECTACION")) noOcurridos.push("afectaciones estructurales");

  let textoNota = "";
  if (noOcurridos.length > 0) {
    if (noOcurridos.length === 1) {
      textoNota = `No se han reportado , ${noOcurridos[0]}.`;
    } else {
      const ultimo = noOcurridos.pop();
      textoNota = `No se han reportado , ${noOcurridos.join(", ")} ni ${ultimo}.`;
    }
  } else {
    textoNota = "Todas las tipologías de eventos han presentado novedades durante el monitoreo.";
  }

  return `${cabecera}

${frase}

✔️ ʜᴋ = ᴠᴇʜɪ́ᴄᴜʟᴏ ʜʏᴅʀᴏᴄʟᴇᴀɴᴇʀ🚛
✔️ ɪɴs-ᴀʟᴄ = ɪɴsᴘᴇᴄᴛᴏʀ ᴅᴇ ɪɴᴛᴇʀᴀɢᴜᴀ🚙
✔️ ᴄᴀᴍɪᴏɴᴇᴛᴀ-ᴏᴘ-ᴄɴ = ᴄᴀᴍɪᴏɴᴇᴛᴀ ᴅᴇ ᴄᴏɴᴛʀᴀᴛɪsᴛᴀ🚙

${cuerpoNovedades}Nota:

${textoNota}

Para hoy ${fechaInocar} el Instituto Oceanográfico de la Armada (INOCAR) pronostica ${pleamar} Pleamar (marea alta) y ${bajamar} Bajamar (marea baja).

*Sala Situacional de Segura EP* | 098-896-1307 | salasituacional@seguraep.gob.ec`;
});

function copiarConsolidado() {
  navigator.clipboard.writeText(reporteConsolidadoTexto.value);
  toast.info('Reporte consolidado copiado al portapapeles.');
}

function enviarWaConsolidado() {
  abrirWhatsApp(reporteConsolidadoTexto.value);
}

async function generarWord() {
  descargandoWord.value = true;
  try {
    await exportarReporteWord(reporte, reporte.novedades);
  } catch (err) {
    toast.error('Error al generar informe Word: ' + err.message);
  } finally {
    descargandoWord.value = false;
  }
}

const resumenExportacionSIG = computed(() => {
  const fecha = shpFecha.value || reporte.fecha_reporte || hoy;
  const totalFecha = (reporte.novedades || []).filter(item => (item.fecha_evento || item.fecha) === fecha).length;
  const georreferenciados = obtenerEventosSIGPorFecha(reporte.novedades || [], fecha).length;
  return `${georreferenciados} de ${totalFecha} evento(s) de la fecha seleccionada tienen coordenadas válidas. Sistema de referencia: WGS 84 (EPSG:4326).`;
});

async function descargarShapefile() {
  const fecha = shpFecha.value || reporte.fecha_reporte || hoy;
  exportandoShapefile.value = true;
  try {
    await exportarShapefileEventos(reporte.novedades || [], fecha);
    toast.success('Shapefile (.zip) generado y descargado correctamente.');
  } catch (err) {
    toast.error('Error al exportar Shapefile: ' + err.message);
  } finally {
    exportandoShapefile.value = false;
  }
}

watch(
  () => reporte.fecha_reporte,
  (nuevaFecha) => {
    if (nuevaFecha && (!shpFecha.value || shpFecha.value === hoy)) {
      shpFecha.value = nuevaFecha;
    }
  }
);

async function sincronizarSharePoint() {
  if (!reporte._id || reporte._id === 'nuevo') {
    toast.warning('Guarde primero el reporte antes de sincronizar con SharePoint.');
    return;
  }
  sincronizandoExcel.value = true;
  try {
    await reportesService.exportarExcel(reporte._id);
    toast.success('Novedades sincronizadas exitosamente en SharePoint Excel.');
  } catch (err) {
    toast.error('Error al sincronizar con SharePoint: ' + (err.response?.data?.error || err.message));
  } finally {
    sincronizandoExcel.value = false;
  }
}

async function eliminarReporteActual() {
  const currentId = reporte._id || reporte.id;
  if (!currentId || currentId === 'nuevo') return;

  const nombreRep = reporte.numero_rds || reporte.titulo || 'este reporte';
  const confirmacion = window.confirm(`¿Está seguro de eliminar el reporte "${nombreRep}"?\n\nEsta acción es irreversible y eliminará todas sus novedades registradas.`);
  if (!confirmacion) return;

  try {
    await reportesService.deleteReporte(currentId);
    toast.success('Reporte eliminado exitosamente');
    disconnectSocket();
    router.push('/reportes');
  } catch (err) {
    toast.error('Error al eliminar reporte: ' + (err.response?.data?.mensaje || err.message));
  }
}

function onCambiarReporte(id) {
  disconnectSocket();
  if (!id) {
    irANuevoReporte();
  } else {
    router.push(`/reportes/${id}`);
  }
}

function irANuevoReporte() {
  disconnectSocket();
  router.push('/reportes/nuevo');
}

// Configurar WebSockets para este Reporte (inicia colaboracion solo al entrar al reporte)
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
      if (!formNovedad.fecha) formNovedad.fecha = r.fecha_reporte || r.fecha;
    }

    if (payload.locks) {
      Object.keys(fieldLocks).forEach(k => delete fieldLocks[k]);
      Object.assign(fieldLocks, payload.locks);
    }

    if (payload.usuariosActivos) {
      const myId = usuario.value?.id || usuario.value?._id;
      const myCorreo = usuario.value?.correo;
      colaboradoresConectados.value = payload.usuariosActivos.filter(
        u => (myId && String(u.usuarioId) !== String(myId)) || (!myId && u.correo !== myCorreo)
      );
    }
  });

  socket.on('usuarios_actualizados', (payload) => {
    if (payload.usuariosActivos) {
      const myId = usuario.value?.id || usuario.value?._id;
      const myCorreo = usuario.value?.correo;
      colaboradoresConectados.value = payload.usuariosActivos.filter(
        u => (myId && String(u.usuarioId) !== String(myId)) || (!myId && u.correo !== myCorreo)
      );
    }
  });

  socket.on('novedad_agregada', (payload) => {
    if (payload.novedad) {
      const novId = payload.novedad._id || payload.novedad.id;
      const existe = reporte.novedades.some(n =>
        ((n._id || n.id) && novId && String(n._id || n.id) === String(novId)) ||
        (n.direccion === payload.novedad.direccion && n.hora === payload.novedad.hora)
      );
      if (!existe) {
        reporte.novedades.push(payload.novedad);
      }
    }
    if (payload.colaboradores) {
      reporte.colaboradores = payload.colaboradores;
    }
    if (payload.elaborado_por) {
      reporte.elaborado_por = payload.elaborado_por;
    }
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
    if (payload.colaboradores) {
      reporte.colaboradores = payload.colaboradores;
    }
    if (payload.elaborado_por) {
      reporte.elaborado_por = payload.elaborado_por;
    }
  });

  socket.on('novedad_actualizada', (payload) => {
    if (payload.novedad) {
      const novId = payload.novedad._id || payload.novedad.id;
      const idx = reporte.novedades.findIndex(n =>
        ((n._id || n.id) && novId && String(n._id || n.id) === String(novId))
      );
      if (idx >= 0) {
        Object.assign(reporte.novedades[idx], payload.novedad);
      }
    }
    if (payload.colaboradores) {
      reporte.colaboradores = payload.colaboradores;
    }
    if (payload.elaborado_por) {
      reporte.elaborado_por = payload.elaborado_por;
    }
  });

  socket.on('novedad_eliminada', (payload) => {
    if (payload.novedadId) {
      const idx = reporte.novedades.findIndex(n =>
        ((n._id || n.id) && String(n._id || n.id) === String(payload.novedadId))
      );
      if (idx >= 0) {
        reporte.novedades.splice(idx, 1);
      }
    }
    if (payload.colaboradores) {
      reporte.colaboradores = payload.colaboradores;
    }
    if (payload.elaborado_por) {
      reporte.elaborado_por = payload.elaborado_por;
    }
  });

  socket.on('reporte_eliminado', (payload) => {
    toast.info(`El reporte ha sido eliminado por ${payload.eliminadoPor || 'otro colaborador'}.`);
    disconnectSocket();
    router.push('/reportes');
  });
}

async function cargarListaReportes() {
  try {
    const data = await reportesService.getAll();
    listaReportes.value = Array.isArray(data) ? data : (data?.reportes || []);
  } catch (e) {
    console.warn('Error al cargar lista de reportes:', e);
  }
}

// Actualizacion automatica al cambiar fecha en modo nuevo reporte
watch(() => reporte.fecha_reporte, (nuevaFecha) => {
  const currentId = reporte._id || reporte.id;
  if (nuevaFecha && (!currentId || currentId === 'nuevo')) {
    const pronostico = calcularPronosticoInocar(nuevaFecha);
    reporte.inocar_fecha = pronostico.fecha;
    reporte.inocar_pleamar = pronostico.pleamar;
    reporte.inocar_bajamar = pronostico.bajamar;
    reporte.periodo = generarPeriodoDinamico(nuevaFecha);
    reporte.cabecera = generarCabeceraDinamica(nuevaFecha, reporte.hora_inicio);
    formNovedad.fecha = nuevaFecha;
  }
});

watch(() => reporte.novedades?.length, () => {
  generarAlertaInmediata();
});

async function inicializarVista() {
  await cargarListaReportes();

  const fechaHoy = obtenerFechaActualISO();
  const horaHoy = obtenerHoraActual();
  const pronosticoHoy = calcularPronosticoInocar(fechaHoy);

  if (reporteId.value && reporteId.value !== 'nuevo') {
    cargandoReporte.value = true;
    try {
      const data = await reportesService.getById(reporteId.value);
      if (data) {
        Object.assign(reporte, {
          _id: data.id || data._id,
          id: data.id || data._id,
          titulo: data.titulo,
          numero_rds: data.numero_rds,
          fecha_reporte: data.fecha_reporte || data.fecha || fechaHoy,
          hora_inicio: data.hora_inicio || '06:00',
          hora_fin: data.hora_fin || '22:00',
          revisado_por: data.revisado_por || '',
          elaborado_por: data.elaborado_por || '',
          cabecera: data.cabecera || '',
          periodo: data.periodo || '',
          inocar_fecha: data.inocar_fecha || '',
          inocar_pleamar: data.inocar_pleamar || '',
          inocar_bajamar: data.inocar_bajamar || '',
          observaciones_generales: data.observaciones_generales || '',
          colaboradores: (data.reporte_colaboradores || data.colaboradores || []).map(c => ({
            usuario_id: c.usuario_id || c.usuario?.id,
            nombre: c.usuario?.nombre || c.nombre || c.correo,
            correo: c.usuario?.correo || c.correo,
            primer_aporte: c.primer_aporte,
            ultimo_aporte: c.ultimo_aporte,
            total_ediciones: c.total_ediciones,
          })),
          novedades: (data.novedades || []).map(n => ({
            ...n,
            _id: n.id || n._id,
            id: n.id || n._id,
            tipo_evento: n.tipo_evento || n.tipo,
            recurso_asignado: n.recurso_asignado || n.recurso,
            estado_operativo: n.estado_operativo || n.estado,
            acciones_inmediatas: n.acciones_inmediatas || n.acciones,
            fecha_evento: n.fecha_evento || (n.fecha ? new Date(n.fecha).toISOString().split('T')[0] : ''),
            hora_evento: n.hora_evento || (n.fecha ? new Date(n.fecha).toTimeString().split(' ')[0].substring(0, 5) : ''),
            fotos: (n.fotos || []).map(f => typeof f === 'string' ? f : (f.url_foto || ''))
          }))
        });
        formNovedad.fecha = reporte.fecha_reporte || fechaHoy;
        formNovedad.hora = horaHoy;
      }
      setupSockets();
    } catch (err) {
      console.error('Error al cargar reporte:', err);
      toast.error('No se pudo cargar el reporte.');
    } finally {
      cargandoReporte.value = false;
    }
  } else {
    // Modo Nuevo Reporte: Crear registro en BD antes de iniciar sesion de colaboracion
    disconnectSocket();
    cargandoReporte.value = true;
    try {
      const uId = usuario.value?.id || usuario.value?._id || '';
      const uCorreo = usuario.value?.correo || '';
      const dataCreacion = {
        titulo: 'Reporte de Novedades e Incidentes - Sala Situacional',
        observaciones_generales: 'Monitoreo en tiempo real de lluvias y acumulacion de agua.',
        numero_rds: `SEGURA-EP-GASGEC-SS-${new Date().getFullYear()}-${String(listaReportes.value.length + 1).padStart(3, '0')}`,
        fecha_reporte: fechaHoy,
        hora_inicio: '06:00',
        hora_fin: horaHoy,
        revisado_por: 'Jefe de Sala Situacional | MSc. Ing. Santiago Jaramillo',
        cabecera: generarCabeceraDinamica(fechaHoy, '06:00'),
        periodo: generarPeriodoDinamico(fechaHoy),
        inocar_fecha: pronosticoHoy.fecha,
        inocar_pleamar: pronosticoHoy.pleamar,
        inocar_bajamar: pronosticoHoy.bajamar,
        usuario_id: uId,
        correo_colaborador: uCorreo,
        colaboradores: uCorreo ? [uCorreo] : []
      };
      const nuevo = await reportesService.create(dataCreacion);
      const idCreado = nuevo?.id || nuevo?._id || nuevo?.reporte?.id || nuevo?.reporte?._id;
      if (idCreado) {
        router.replace(`/reportes/${idCreado}`);
        return;
      } else {
        throw new Error('No se recibio el ID del reporte creado');
      }
    } catch (e) {
      console.error('Error al crear reporte inicial:', e);
      toast.error('Error al crear el nuevo reporte: ' + (e.response?.data?.error || e.message));
    } finally {
      cargandoReporte.value = false;
    }
  }

  generarAlertaInmediata();
}

watch(() => route.params.id, () => {
  inicializarVista();
});

onMounted(() => {
  inicializarVista();
});

onBeforeUnmount(() => {
  disconnectSocket();
});
</script>

<style scoped>
.reporte-container {
  width: 100%;
  margin: 0;
  flex: 1;
  padding: 16px 24px 24px;
  box-sizing: border-box;
}

.top-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: linear-gradient(135deg, #0f2744 0%, #163b65 100%);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.report-nav-logo {
  height: 34px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.report-current-tag {
  font-size: 0.82rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}

.user-pill {
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reporte-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 1024px) {
  .reporte-grid-layout {
    grid-template-columns: 1fr;
  }
}

.layout-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #ffffff;
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #cbd5e1;
}

.card-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.card-header h2, .card-header-with-actions h2 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--primary-navy);
}

.header-btns-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.86rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #0984e3;
  outline: none;
}

.input-readonly {
  background: var(--bg-subtle);
  cursor: not-allowed;
  color: var(--text-muted);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.grid-fecha-aga-hora {
  display: grid;
  grid-template-columns: 1.15fr 115px 1fr;
  gap: 10px;
  align-items: stretch;
}

.grid-fecha-aga-hora .form-group {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.field-label-row {
  height: 20px;
  min-height: 20px;
  max-height: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  box-sizing: border-box;
}

.field-label-row label {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
}

.form-control-aligned {
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  box-sizing: border-box !important;
  padding: 8px 10px !important;
  font-size: 0.86rem !important;
  line-height: 1.3 !important;
}

.grid-fecha-aga-hora .input-with-action {
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.grid-fecha-aga-hora .input-with-action input {
  width: 100%;
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  padding-right: 36px !important;
}

.grid-novedad-meta {
  display: grid;
  grid-template-columns: 1.15fr 95px 1fr 1.6fr;
  gap: 8px;
}

@media (max-width: 640px) {
  .grid-2, .grid-3, .grid-4, .grid-fecha-aga-hora {
    grid-template-columns: 1fr;
  }
  .grid-novedad-meta {
    grid-template-columns: 1fr 1fr;
  }
}

.nlp-detection-badge {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-with-action {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-action input {
  padding-right: 38px;
}

.btn-inline-geo {
  position: absolute;
  right: 4px;
  top: 5px;
  bottom: 5px;
  margin: auto 0;
  background: var(--bg-subtle);
  border: 1px solid var(--border-strong);
  color: var(--accent-blue);
  border-radius: var(--radius-sm);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}

.btn-inline-geo:hover {
  background: var(--accent-blue);
  color: #ffffff;
  border-color: var(--accent-blue);
}

.aga-info-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.btn-info-icon {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: var(--accent-blue);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  line-height: 1;
  transition: transform 0.15s ease, color 0.15s ease;
}

.btn-info-icon:hover {
  transform: scale(1.15);
}

.btn-info-icon.warning {
  color: var(--accent-amber);
}

.btn-info-icon.error {
  color: var(--accent-red);
}

.aga-floating-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: max-content;
  max-width: 280px;
  background: #ffffff;
  border: 1px solid var(--border-strong);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--text-main);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  pointer-events: auto;
}

.aga-floating-popup::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: #ffffff transparent transparent transparent;
}

.aga-floating-popup.success {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}
.aga-floating-popup.success::after {
  border-color: #f0fdf4 transparent transparent transparent;
}

.aga-floating-popup.warning {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}
.aga-floating-popup.warning::after {
  border-color: #fffbeb transparent transparent transparent;
}

.aga-floating-popup.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}
.aga-floating-popup.error::after {
  border-color: #fef2f2 transparent transparent transparent;
}

.aga-floating-popup .popup-text {
  flex: 1;
}

.btn-close-popup {
  background: transparent;
  border: none;
  font-size: 0.95rem;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0 2px;
}

.btn-close-popup:hover {
  opacity: 1;
}

.fade-popup-enter-active,
.fade-popup-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-popup-enter-from,
.fade-popup-leave-to {
  opacity: 0;
  transform: translate(-50%, 4px);
}

.photo-field-group {
  margin-bottom: 12px;
}

.file-upload-wrapper {
  margin-top: 4px;
}

.hidden-file-input {
  display: none;
}

.upload-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  border: 1.5px dashed #0984e3;
  color: #0a3d62;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-trigger-btn:hover {
  background: #e0f2fe;
  border-color: #0284c7;
}

.upload-trigger-btn.disabled-upload {
  opacity: 0.6;
  cursor: not-allowed;
  border-color: #cbd5e1;
}

.photo-preview-grid {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.photo-preview-box {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
}

.photo-preview-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.photo-preview-box:hover img {
  transform: scale(1.05);
}

.photo-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(10, 61, 98, 0.85);
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 700;
  text-align: center;
  padding: 2px 0;
}

.btn-remove-photo {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(239, 68, 68, 0.9);
  color: #ffffff;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 13px;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.btn-remove-photo:hover {
  background: #dc2626;
}

.btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.btn-consolidar {
  padding: 12px;
  font-size: 0.92rem;
  font-weight: 700;
}

/* Estilos de Presencia de Colaboradores en Tiempo Real */
.collab-presence-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(2, 132, 199, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.4);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: #e0f2fe;
}

.collab-presence-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #7dd3fc;
}

.live-dot {
  width: 8px;
  height: 8px;
  background-color: #22c55e;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 6px #22c55e;
}

.live-dot.pulse {
  animation: dotPulse 1.5s infinite;
}

@keyframes dotPulse {
  0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  70% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.collab-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.collab-chip {
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  color: #ffffff;
  font-size: 0.74rem;
}

.locked-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
}

.field-locked {
  background-color: #fffbeb !important;
  border: 2px dashed #f59e0b !important;
  cursor: not-allowed !important;
  color: #92400e !important;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15) !important;
  transition: all 0.2s ease;
}

.lock-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 3px 8px;
  border-radius: 4px;
  margin-top: 4px;
  animation: lockFadeIn 0.2s ease;
}

@keyframes lockFadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}

.novedades-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.novedad-item-card {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #0984e3;
  border-radius: 6px;
  padding: 10px 12px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.item-index {
  background: #0a3d62;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
}

.item-tipo {
  color: #0369a1;
  text-transform: uppercase;
}

.item-aga {
  color: #475569;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
}

.item-hora {
  margin-left: auto;
  color: #64748b;
}

.item-dir {
  font-size: 0.84rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.item-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.meta-field label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  display: block;
  margin-bottom: 2px;
}

.meta-field select {
  width: 100%;
  padding: 4px 6px;
  font-size: 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}

.item-photos {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.item-photo-wrapper {
  position: relative;
  width: 80px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.item-photo-wrapper:hover .thumb-img {
  transform: scale(1.08);
}

.photo-count-tag {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  text-align: center;
  padding: 1px 0;
}

.zoom-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 61, 98, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  font-size: 14px;
}

.item-photo-wrapper:hover .zoom-overlay {
  opacity: 1;
}

/* Lightbox Modal */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(6px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

.lightbox-card {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.lightbox-close {
  position: absolute;
  top: -16px;
  right: -16px;
  background: #ffffff;
  color: #0a3d62;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease;
}

.lightbox-close:hover {
  transform: scale(1.1);
  background: #f1f5f9;
}

.lightbox-footer {
  margin-top: 14px;
}

.empty-novedades {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.consolidado-textarea {
  width: 100%;
  font-family: Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.4;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px;
  resize: vertical;
}

.export-actions-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.loading-state {
  background: #ffffff;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #cbd5e1;
  border-top-color: #0a3d62;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sig-export {
  display: grid;
  grid-template-columns: minmax(180px, 0.55fr) minmax(220px, auto) 1fr;
  gap: 12px;
  align-items: end;
  padding: 12px 14px;
  margin-bottom: 12px;
  border: 1px solid #b8d8f0;
  border-radius: 8px;
  background: #f3f9fd;
}

.sig-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sig-field label {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 700;
  color: #0a3d62;
  text-transform: uppercase;
}

.sig-field input[type="date"] {
  padding: 7px 10px;
  border: 1px solid #93c5fd;
  border-radius: 6px;
  font-size: 0.86rem;
  background: #ffffff;
}

.sig-export-note {
  align-self: center;
  color: #4b6584;
  font-size: 0.76rem;
  line-height: 1.4;
  font-weight: 500;
}

.btn-sig {
  background: #0b6b45;
  color: #ffffff;
  white-space: nowrap;
  cursor: pointer;
  font-weight: 700;
  border: none;
  border-radius: 6px;
  padding: 9px 14px;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-sig:hover:not(:disabled) {
  background: #084e32;
}

.btn-sig:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .sig-export {
    grid-template-columns: 1fr;
  }
}
</style>
