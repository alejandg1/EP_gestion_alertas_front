<template>
  <div class="reporte-container">
    <!-- BARRA SUPERIOR DE SALA SITUACIONAL -->
    <div class="top-nav-bar">
      <div class="nav-left">
        <router-link to="/reportes" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-arrow-left fa-lg" style="color: rgb(236, 234, 234);"></i> Volver a Reportes
        </router-link>
        <img src="/icons/icon_blanco.png" alt="Segura EP" class="report-nav-logo" />
        <span class="report-current-tag">
          <b>RDS:</b> {{ reporte.numero_rds || 'Cargando...' }}
        </span>
      </div>

      <div class="nav-right">
        <div class="status-pill" :class="isSocketConnected ? 'online' : 'offline'">
          <span class="dot"></span>
          <span>{{ isSocketConnected ? 'Conectado' : 'Desconectado' }}</span>
        </div>
        <span v-if="usuario" class="user-pill">
          {{usuario.rol}}: {{ usuario.nombre || usuario.correo }}
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
              <label for="indiv_instituciones">Instituciones Notificadas (@):</label>
              <input
                id="indiv_instituciones"
                type="text"
                v-model="formNovedad.instituciones"
                @input="generarAlertaInmediata"
              />
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label for="indiv_fecha">Fecha del Evento:</label>
              <input id="indiv_fecha" type="date" v-model="formNovedad.fecha" />
            </div>

            <div class="form-group">
              <label for="indiv_aga">Zona AGA (Automática / Editable):</label>
              <input
                id="indiv_aga"
                type="text"
                v-model="formNovedad.aga"
                placeholder="A01, A09..."
                @input="onAgaManualInput"
              />
              <div v-if="agaStatus.mensaje" :class="['aga-spatial-status', agaStatus.tipo]">
                {{ agaStatus.mensaje }}
              </div>
              <button
                type="button"
                class="btn-geo"
                @click="recalcularAGADesdeCoordenadas"
                title="Recalcular zona AGA a partir de las coordenadas WGS84"
              >
                <i class="fa-solid fa-location-crosshairs"></i> Recalcular desde coordenadas
              </button>
            </div>

            <div class="form-group">
              <label for="indiv_hora">Hora del Evento:</label>
              <input id="indiv_hora" type="time" v-model="formNovedad.hora" @input="generarAlertaInmediata" />
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
                  <span>{{ fotosSeleccionadas.length >= 2 ? 'Límite de 2 fotos alcanzado' : 'Adjuntar fotografías' }}</span>
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
              class="btn btn-secondary btn-xs"
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
            <input
              id="p_titulo"
              type="text"
              v-model="reporte.titulo"
              placeholder="Reporte de Novedades e Incidentes"
              @blur="onFieldBlur('titulo', reporte.titulo)"
            />
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
                <span class="item-index">#{{ idx + 1 }}</span>
                <span class="item-tipo">{{ obtenerNombreTipo(nov.tipo_evento || nov.tipo) }}</span>
                <span class="item-aga">AGA: {{ nov.aga || 'N/D' }}</span>
                <span class="item-hora">{{ nov.hora_evento || nov.hora || '00:00' }}</span>
                <button
                  type="button"
                  class="btn btn-danger btn-xs"
                  @click="eliminarNovedad(idx)"
                  title="Eliminar novedad"
                >
                  <i class="fa-solid fa-trash-can"></i> Eliminar
                </button>
              </div>

              <p class="item-dir">{{ nov.direccion || nov.dir }}</p>

              <div class="item-meta-grid">
                <div class="meta-field">
                  <label>Recurso Asignado:</label>
                  <select v-model="nov.recurso_asignado">
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

                <div class="meta-field">
                  <label>Estado:</label>
                  <select v-model="nov.estado_operativo">
                    <option value="⛔PENDIENTE">⛔PENDIENTE</option>
                    <option value="🔄EN ATENCIÓN">🔄EN ATENCIÓN</option>
                    <option value="✅ATENDIDO">✅ATENDIDO</option>
                  </select>
                </div>
              </div>

              <div v-if="nov.fotos && nov.fotos.length" class="item-photos">
                <div
                  v-for="(f, fIdx) in nov.fotos"
                  :key="fIdx"
                  class="item-photo-wrapper"
                  @click="abrirFotoModal(f)"
                  title="Clic para ampliar fotografia"
                >
                  <img
                    :src="resolverUrlFoto(f)"
                    alt="Evidencia fotografica"
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
            <button type="button" class="btn btn-secondary btn-sm" @click="copiarConsolidado">
              <i class="fa-solid fa-clipboard"></i> Copiar Reporte Consolidado
            </button>
            <button type="button" class="btn btn-success btn-sm" @click="enviarWaConsolidado">
              <i class="fa-brands fa-whatsapp"></i> Abrir en WhatsApp
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="descargandoWord"
              @click="generarWord"
            >
              <i v-if="descargandoWord" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-file-word"></i>
              {{ descargandoWord ? 'Generando documento Word...' : 'Descargar Informe Word Oficial (.docx)' }}
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
            <div class="sig-export-note">
              {{ resumenExportacionSIG }}
            </div>
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
  aga: 'A09',
  agaManual: false,
  coordenadasTexto: '-2.138694, -79.936833',
  lat: -2.138694,
  lng: -79.936833,
  recurso_asignado: 'INS-ALC 🚙',
  estado_operativo: '⛔PENDIENTE'
});

const nlpDetectado = ref(false);
const nlpLabel = ref('');
const previewAlertaInmediata = ref('');
const fotosSeleccionadas = ref([]);
const agaStatus = ref({
  mensaje: '📍 A09 asignada automáticamente mediante el nuevo shapefile WGS84. Puede corregirla manualmente.',
  tipo: 'success'
});

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
  if (socket && socket.connected && reporte._id) {
    socket.emit('lock_campo', { reporteId: reporte._id, campoKey });
  }
}

function onFieldBlur(campoKey, valor) {
  const socket = getSocket();
  if (socket && socket.connected && reporte._id) {
    socket.emit('unlock_campo', { reporteId: reporte._id, campoKey });
    socket.emit('actualizar_parametros', {
      reporteId: reporte._id,
      parametros: { [campoKey]: valor }
    });
  }
}

function obtenerNombreTipo(tipo) {
  return textoEventoIndividual[tipo] || tipo || 'Evento';
}

function actualizarEstadoAGA() {
  const coords = parsearCoordenadasNLP(formNovedad.coordenadasTexto);
  agaStatus.value = evaluarEstadoAGA(coords, formNovedad.aga, formNovedad.agaManual);
}

function onAgaManualInput() {
  formNovedad.agaManual = true;
  formNovedad.aga = String(formNovedad.aga || '').trim().toUpperCase();
  actualizarEstadoAGA();
}

function recalcularAGADesdeCoordenadas() {
  formNovedad.agaManual = false;
  alCambiarCoordenadas();
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
    formNovedad.coordenadasTexto = coords.texto;
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
  const coord = formNovedad.coordenadasTexto.trim() || '-2.138694, -79.936833';
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
  if (reporte._id && reporte._id !== 'nuevo') return reporte._id;

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
  const id = nuevo?._id || nuevo?.reporte?._id;
  reporte._id = id;
  router.replace(`/reportes/${id}`);
  setupSockets();
  return id;
}

async function guardarParametrosReporte() {
  guardandoParametros.value = true;
  try {
    const id = await asegurarReporteCreado();
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('actualizar_parametros', {
        reporteId: id,
        parametros: {
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
        }
      });
    }
    toast.success('Parametros guardados y sincronizados en la Sala Situacional.');
  } catch (err) {
    toast.error('Error al guardar parametros: ' + err.message);
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

function eliminarNovedad(index) {
  if (confirm(`Desea eliminar la novedad #${index + 1}?`)) {
    reporte.novedades.splice(index, 1);
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
  if (!reporte._id || reporte._id === 'nuevo') return;

  const socket = initSocket();
  if (!socket) return;

  socket.emit('unirse_reporte', { reporteId: reporte._id });

  socket.on('reporte_cargado', (payload) => {
    const r = payload.reporte;
    if (r) {
      Object.assign(reporte, {
        _id: r._id,
        titulo: r.titulo,
        numero_rds: r.numero_rds,
        fecha_reporte: r.fecha_reporte,
        hora_inicio: r.hora_inicio || '06:00',
        hora_fin: r.hora_fin || '22:00',
        revisado_por: r.revisado_por,
        colaboradores: r.colaboradores || [],
        cabecera: r.cabecera,
        periodo: r.periodo,
        inocar_fecha: r.inocar_fecha,
        inocar_pleamar: r.inocar_pleamar,
        inocar_bajamar: r.inocar_bajamar,
        novedades: r.novedades || []
      });
      if (!formNovedad.fecha) formNovedad.fecha = r.fecha_reporte;
    }

    if (payload.locks) {
      Object.keys(fieldLocks).forEach(k => delete fieldLocks[k]);
      Object.assign(fieldLocks, payload.locks);
    }
  });

  socket.on('novedad_agregada', (payload) => {
    if (payload.novedad) {
      const existe = reporte.novedades.some(n =>
        (n._id && payload.novedad._id && String(n._id) === String(payload.novedad._id)) ||
        (n.direccion === payload.novedad.direccion && n.hora === payload.novedad.hora)
      );
      if (!existe) {
        reporte.novedades.push(payload.novedad);
      }
    }
    if (payload.colaboradores) {
      reporte.colaboradores = payload.colaboradores;
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
  });
}

async function cargarListaReportes() {
  try {
    const data = await reportesService.getAll();
    listaReportes.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Error al cargar lista de reportes:', e);
  }
}

// Actualizacion automatica al cambiar fecha en modo nuevo reporte
watch(() => reporte.fecha_reporte, (nuevaFecha) => {
  if (nuevaFecha && (!reporte._id || reporte._id === 'nuevo')) {
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
        Object.assign(reporte, data);
        formNovedad.fecha = data.fecha_reporte || fechaHoy;
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
      const idCreado = nuevo?._id || nuevo?.reporte?._id;
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
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 10px 40px;
}

.top-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: #0a3d62;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 8px;
  margin-bottom: 18px;
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.report-nav-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.report-current-tag {
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 6px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-pill.online {
  background: rgba(16, 185, 129, 0.2);
  color: #a7f3d0;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.status-pill.offline {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.status-pill .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.user-pill {
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 6px;
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
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.card-header h2, .card-header-with-actions h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0a3d62;
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
  font-size: 0.76rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.3px;
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
  background: #f1f5f9;
  cursor: not-allowed;
  color: #64748b;
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

@media (max-width: 640px) {
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}

.nlp-detection-badge {
  background: #e0f2fe;
  border: 1px solid #7dd3fc;
  color: #0284c7;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.aga-spatial-status {
  margin-top: 5px;
  padding: 6px 9px;
  border-radius: 5px;
  background: #edf7f3;
  border: 1px solid #b8e0d1;
  color: #176b4d;
  font-size: 0.72rem;
  line-height: 1.35;
}

.aga-spatial-status.warning {
  background: #fff5e6;
  border-color: #f1d3a1;
  color: #8a5b14;
}

.aga-spatial-status.error {
  background: #fff0ef;
  border-color: #efc2bf;
  color: #9b3833;
}

.btn-geo {
  width: 100%;
  margin-top: 5px;
  padding: 6px 9px;
  background: #e8f4fd;
  border: 1px solid #9dcced;
  color: #0984e3;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-geo:hover {
  background: #d0e8fa;
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

.locked-wrapper {
  position: relative;
}

.field-locked {
  background-color: #fffbeb !important;
  border: 1.5px dashed #f59e0b !important;
  cursor: not-allowed !important;
  color: #78716c !important;
}

.lock-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 3px;
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

/* En ReporteView.vue */
.reporte-container {
  width: 100%;
  height: 100vh;           /* O 100% según tu estructura */
  overflow-y: auto;        /* Habilita el scroll dentro del reporte */
  overflow-x: hidden;      /* Evita scroll horizontal indeseado */
  box-sizing: border-box;
}
</style>
