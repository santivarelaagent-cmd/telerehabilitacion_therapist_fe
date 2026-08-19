<template>
  <transition name="modal">
    <div class="modal-mask" v-if="visible" @click.self="close">
      <div class="modal-wrapper">
        <div class="modal-container">
          <!-- Encabezado del Modal -->
          <div class="modal-header">
            <div class="header-title-area">
              <h3>🔬 Comparación con Datos de Laboratorio (Ground Truth)</h3>
              <p class="subtitle">Carga el archivo .txt/.csv de sensores y configura qué 3 puntos forman cada ángulo</p>
            </div>
            <button type="button" class="close-btn" @click="close">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Zona de Carga de Archivo -->
            <div 
              class="drop-zone" 
              :class="{ 'drag-over': isDragging, 'has-file': !!parsedData }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              @click="$refs.fileInput.click()"
            >
              <input 
                ref="fileInput" 
                type="file" 
                accept=".txt,.csv" 
                style="display: none;" 
                @change="handleFileSelect"
              />
              
              <div v-if="!parsedData" class="drop-prompt">
                <div class="upload-icon">📄</div>
                <p class="main-text">Arrastra aquí el archivo <strong>.txt / .csv</strong> del laboratorio o haz clic para seleccionarlo</p>
                <span class="sub-text">Formato: Time, Point #1 (X,Y,Z), Point #2 (X,Y,Z)... a 60 Hz</span>
              </div>

              <div v-else class="file-summary">
                <div class="summary-badge">
                  <span class="file-icon">✅</span>
                  <div>
                    <strong class="file-name">{{ currentFileName || 'Archivo cargado' }}</strong>
                    <div class="file-meta">
                      {{ parsedData.metadata.totalFrames }} frames &bull; 
                      {{ parsedData.metadata.frequency }} Hz &bull; 
                      {{ parsedData.metadata.duration.toFixed(2) }}s &bull; 
                      {{ parsedData.pointNames.length }} marcadores detectados
                    </div>
                  </div>
                </div>
                <button type="button" class="btn-change-file" @click.stop="$refs.fileInput.click()">Cambiar Archivo</button>
              </div>
            </div>

            <div v-if="errorMessage" class="error-banner">
              ⚠️ {{ errorMessage }}
            </div>

            <!-- Panel de Mapeo de Puntos Articulares -->
            <div v-if="parsedData" class="mapping-section">
              <div class="section-title-row">
                <h4>📐 Mapeo de Sensores por Articulación</h4>
                <p class="desc-text">Para cada articulación del ejercicio, indica qué 3 marcadores del TXT forman el ángulo:</p>
              </div>

              <div class="joint-cards-grid">
                <div 
                  v-for="point in trackedPoints" 
                  :key="point.codename" 
                  class="joint-config-card"
                >
                  <div class="joint-card-header">
                    <span class="joint-indicator-dot"></span>
                    <strong class="joint-name">{{ point.verbose }}</strong>
                    <span class="joint-codename">({{ point.codename }})</span>
                  </div>

                  <div class="mapping-dropdowns">
                    <!-- Punto Extremo Superior / Proximal -->
                    <div class="dropdown-group">
                      <label>🔵 Extremo Superior / Proximal:</label>
                      <select v-model="localMappings[point.codename].left" class="form-select select-left">
                        <option :value="null">-- Seleccionar Punto --</option>
                        <option 
                          v-for="pName in parsedData.pointNames" 
                          :key="pName" 
                          :value="pName"
                          :disabled="pName === localMappings[point.codename].center || pName === localMappings[point.codename].right"
                        >
                          {{ pName }} {{ (pName === localMappings[point.codename].center || pName === localMappings[point.codename].right) ? '(En uso)' : '' }}
                        </option>
                      </select>
                    </div>

                    <!-- Punto Vértice (Centro) -->
                    <div class="dropdown-group center-group">
                      <label>📍 Vértice / Centro (Articulación):</label>
                      <select v-model="localMappings[point.codename].center" class="form-select select-center">
                        <option :value="null">-- Seleccionar Vértice --</option>
                        <option 
                          v-for="pName in parsedData.pointNames" 
                          :key="pName" 
                          :value="pName"
                          :disabled="pName === localMappings[point.codename].left || pName === localMappings[point.codename].right"
                        >
                          {{ pName }} {{ (pName === localMappings[point.codename].left || pName === localMappings[point.codename].right) ? '(En uso)' : '' }}
                        </option>
                      </select>
                    </div>

                    <!-- Punto Extremo Inferior / Distal -->
                    <div class="dropdown-group">
                      <label>🟠 Extremo Inferior / Distal:</label>
                      <select v-model="localMappings[point.codename].right" class="form-select select-right">
                        <option :value="null">-- Seleccionar Punto --</option>
                        <option 
                          v-for="pName in parsedData.pointNames" 
                          :key="pName" 
                          :value="pName"
                          :disabled="pName === localMappings[point.codename].left || pName === localMappings[point.codename].center"
                        >
                          {{ pName }} {{ (pName === localMappings[point.codename].left || pName === localMappings[point.codename].center) ? '(En uso)' : '' }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <!-- Vista rápida de estado de configuración -->
                  <div class="joint-status-tag" :class="{ 'ready': isJointConfigured(point.codename) }">
                    {{ isJointConfigured(point.codename) ? '✅ Triangulación 3D lista' : '⚠️ Faltan puntos por asignar' }}
                  </div>
                </div>
              </div>

              <!-- Sincronización de Tiempos (Offset) -->
              <div class="sync-offset-card">
                <div class="sync-header">
                  <div class="sync-icon">⏱️</div>
                  <div>
                    <strong>Sincronización Temporal (Desfase &Delta;t)</strong>
                    <p class="sync-desc">Ajusta si el video inició unos milisegundos antes o después del sistema de laboratorio.</p>
                  </div>
                </div>

                <div class="offset-controls">
                  <button type="button" class="btn-step" @click="adjustOffset(-0.05)">-50ms</button>
                  <button type="button" class="btn-step" @click="adjustOffset(-0.01)">-10ms</button>
                  
                  <div class="offset-input-wrapper">
                    <input 
                      type="number" 
                      step="0.01" 
                      v-model.number="localTimeOffset" 
                      class="offset-number-input"
                    />
                    <span class="offset-unit">segundos</span>
                  </div>

                  <button type="button" class="btn-step" @click="adjustOffset(0.01)">+10ms</button>
                  <button type="button" class="btn-step" @click="adjustOffset(0.05)">+50ms</button>
                  <button type="button" class="btn-step btn-reset" @click="localTimeOffset = 0" title="Restablecer a 0">0.0s</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pie del Modal -->
          <div class="modal-footer">
            <button v-if="hasActiveReference" type="button" class="btn btn-danger-outline" @click="clearReference">
              🗑️ Quitar Referencia
            </button>
            <div style="flex: 1;"></div>
            <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
            <button 
              type="button" 
              class="btn btn-success" 
              :disabled="!parsedData || !hasAnyValidMapping" 
              @click="applyConfiguration"
            >
              Aplicar Comparación en Gráficas
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { parseLabFile } from '@/services/labDataParser';

export default {
  name: 'LabReferenceModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    trackedPoints: {
      type: Array,
      default: () => [],
    },
    initialConfig: {
      type: Object,
      default: () => null,
    },
  },
  emits: ['close', 'apply', 'clear'],
  data() {
    return {
      isDragging: false,
      parsedData: null,
      currentFileName: '',
      errorMessage: '',
      localMappings: {},
      localTimeOffset: 0,
    };
  },
  watch: {
    visible(val) {
      if (val) {
        this.initFromProps();
      }
    },
    trackedPoints: {
      immediate: true,
      handler() {
        this.initMappingsStructure();
      }
    }
  },
  computed: {
    hasActiveReference() {
      return !!(this.initialConfig && this.initialConfig.parsedData);
    },
    hasAnyValidMapping() {
      if (!this.parsedData) return false;
      return this.trackedPoints.some(p => this.isJointConfigured(p.codename));
    }
  },
  methods: {
    close() {
      this.$emit('close');
    },
    initMappingsStructure() {
      const mappings = {};
      for (const p of this.trackedPoints) {
        mappings[p.codename] = { center: null, left: null, right: null };
      }
      this.localMappings = { ...mappings, ...this.localMappings };
    },
    initFromProps() {
      this.errorMessage = '';
      if (this.initialConfig && this.initialConfig.parsedData) {
        this.parsedData = this.initialConfig.parsedData;
        this.currentFileName = this.initialConfig.filename || 'Datos de laboratorio';
        this.localTimeOffset = this.initialConfig.timeOffset || 0;
        
        // Restaurar mapeos si existen
        if (this.initialConfig.mappings) {
          const map = {};
          for (const p of this.trackedPoints) {
            map[p.codename] = {
              center: this.initialConfig.mappings[p.codename]?.center || null,
              left: this.initialConfig.mappings[p.codename]?.left || null,
              right: this.initialConfig.mappings[p.codename]?.right || null,
            };
          }
          this.localMappings = map;
        }
      } else {
        this.initMappingsStructure();
      }
    },
    handleFileSelect(e) {
      const file = e.target.files?.[0];
      if (file) this.processFile(file);
    },
    handleFileDrop(e) {
      this.isDragging = false;
      const file = e.dataTransfer?.files?.[0];
      if (file) this.processFile(file);
    },
    async processFile(file) {
      this.errorMessage = '';
      try {
        const text = await file.text();
        const parsed = parseLabFile(text);
        this.parsedData = parsed;
        this.currentFileName = file.name;

        // Auto-asignación inteligente por defecto si hay al menos 3 puntos
        if (parsed.pointNames.length >= 3) {
          this.autoSuggestMappings(parsed.pointNames);
        }
      } catch (err) {
        console.error('Error al parsear archivo de laboratorio:', err);
        this.errorMessage = err.message || 'Error al procesar el archivo. Verifica el formato.';
      }
    },
    autoSuggestMappings(pointNames) {
      // Sugerencia predeterminada secuencial para agilizar
      this.trackedPoints.forEach((p, idx) => {
        if (!this.localMappings[p.codename] || !this.localMappings[p.codename].center) {
          const cIdx = Math.min(idx * 2 + 1, pointNames.length - 2);
          const lIdx = Math.max(0, cIdx - 1);
          const rIdx = Math.min(pointNames.length - 1, cIdx + 1);

          this.localMappings[p.codename] = {
            center: pointNames[cIdx] || null,
            left: pointNames[lIdx] || null,
            right: pointNames[rIdx] || null,
          };
        }
      });
    },
    isJointConfigured(codename) {
      const m = this.localMappings[codename];
      return !!(m && m.center && m.left && m.right && m.center !== m.left && m.center !== m.right && m.left !== m.right);
    },
    adjustOffset(delta) {
      this.localTimeOffset = Number((this.localTimeOffset + delta).toFixed(3));
    },
    applyConfiguration() {
      if (!this.parsedData) return;
      this.$emit('apply', {
        parsedData: this.parsedData,
        filename: this.currentFileName,
        mappings: JSON.parse(JSON.stringify(this.localMappings)),
        timeOffset: this.localTimeOffset,
      });
      this.close();
    },
    clearReference() {
      this.parsedData = null;
      this.currentFileName = '';
      this.initMappingsStructure();
      this.localTimeOffset = 0;
      this.$emit('clear');
      this.close();
    }
  }
};
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 0.3s ease;
}

.modal-wrapper {
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  margin: 20px;
  display: flex;
}

.modal-container {
  width: 100%;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Open Sans', sans-serif;
}

.modal-header {
  padding: 18px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #1e293b;
    font-weight: 700;
  }
  .subtitle {
    margin: 4px 0 0 0;
    font-size: 0.85rem;
    color: #64748b;
  }
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.8rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.2s;
  &:hover { color: #0f172a; }
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(90vh - 140px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover, &.drag-over {
    border-color: #4BC0C0;
    background: #f0fdfa;
  }

  &.has-file {
    border-style: solid;
    border-color: #10b981;
    background: #ecfdf5;
    padding: 16px 20px;
  }
}

.upload-icon {
  font-size: 2.2rem;
  margin-bottom: 6px;
}

.drop-prompt {
  .main-text {
    margin: 0 0 4px 0;
    font-size: 0.95rem;
    color: #334155;
  }
  .sub-text {
    font-size: 0.8rem;
    color: #64748b;
  }
}

.file-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}

.summary-badge {
  display: flex;
  align-items: center;
  gap: 12px;

  .file-icon { font-size: 1.6rem; }
  .file-name { color: #065f46; font-size: 0.95rem; }
  .file-meta { font-size: 0.8rem; color: #047857; margin-top: 2px; }
}

.btn-change-file {
  background: #ffffff;
  border: 1px solid #10b981;
  color: #047857;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #d1fae5; }
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.section-title-row {
  margin-bottom: 12px;
  h4 { margin: 0; font-size: 1.05rem; color: #1e293b; }
  .desc-text { margin: 4px 0 0 0; font-size: 0.85rem; color: #64748b; }
}

.joint-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.joint-config-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.joint-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .joint-indicator-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #9966FF;
  }
  .joint-name { font-size: 0.95rem; color: #0f172a; }
  .joint-codename { font-size: 0.8rem; color: #94a3b8; }
}

.mapping-dropdowns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.dropdown-group {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #475569;
  }

  select {
    padding: 6px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.85rem;
    background: #f8fafc;
    color: #1e293b;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #4BC0C0;
      background: #ffffff;
    }
  }

  &.center-group label {
    color: #7c3aed;
  }
}

.joint-status-tag {
  margin-top: 10px;
  font-size: 0.78rem;
  color: #d97706;
  font-weight: 600;

  &.ready {
    color: #16a34a;
  }
}

.sync-offset-card {
  margin-top: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.sync-header {
  display: flex;
  align-items: center;
  gap: 10px;
  .sync-icon { font-size: 1.4rem; }
  strong { color: #1e293b; font-size: 0.9rem; }
  .sync-desc { margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b; }
}

.offset-controls {
  display: flex;
  align-items: center;
  gap: 6px;

  .btn-step {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #334155;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: #e2e8f0; }
  }

  .btn-reset {
    color: #7c3aed;
    border-color: #c4b5fd;
  }
}

.offset-input-wrapper {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 2px 8px;

  .offset-number-input {
    width: 60px;
    border: none;
    outline: none;
    font-weight: 700;
    font-size: 0.85rem;
    color: #0f172a;
    text-align: right;
    padding-right: 4px;
  }
  .offset-unit {
    font-size: 0.75rem;
    color: #94a3b8;
  }
}

.modal-footer {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background: #e2e8f0;
  color: #334155;
  &:hover { background: #cbd5e1; }
}

.btn-success {
  background: #10b981;
  color: #ffffff;
  &:hover:not(:disabled) { background: #059669; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.btn-danger-outline {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  &:hover { background: #fee2e2; }
}
</style>
