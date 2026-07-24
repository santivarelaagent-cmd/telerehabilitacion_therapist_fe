<template>
  <div class="analysis-panel">
    <div class="analysis-status-bar" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <span :class="['analysis-badge', analysisState]">
        <span v-if="analysisState === 'running'">● Analizando en segundo plano...</span>
        <span v-else-if="analysisState === 'initializing'">⟳ Cargando motor de análisis...</span>
        <span v-else-if="analysisState === 'paused'">⏸ Análisis pausado</span>
        <span v-else-if="analysisState === 'complete'">✓ Análisis completado ({{ analysisProgress }}%)</span>
        <span v-else>○ Sin análisis activo</span>
      </span>

      <!-- Indicador del Motor de IA -->
      <span :class="['engine-badge', isEngineReady ? 'ready' : 'waiting']">
        <span v-if="isEngineReady">● Motor listo</span>
        <span v-else>⟳ Motor en espera</span>
      </span>
    </div>

    <!-- Selector de Frecuencia de Muestreo (FPS) -->
    <div class="fps-selector-container">
      <span class="fps-label">Muestreo:</span>
      <select
        id="fps-select"
        :value="targetFps"
        @change="$emit('update:targetFps', Number($event.target.value))"
        :disabled="!['idle', 'complete'].includes(analysisState)"
        class="fps-select"
      >
        <option :value="15">15 FPS (Ligero)</option>
        <option :value="30" :disabled="nativeVideoFps < 30">30 FPS</option>
        <option :value="60" :disabled="nativeVideoFps < 60">60 FPS</option>
        <option :value="80" :disabled="nativeVideoFps < 80">80 FPS</option>
        <option :value="0">Original (Máx)</option>
      </select>
    </div>

    <div class="analysis-actions">
      <button
        class="btn analysis-btn btn-start"
        :disabled="['running', 'initializing', 'complete'].includes(analysisState)"
        @click="$emit('start')"
      >
        <PlayCircle class="action-icon" />
        <span>{{ analysisState === 'paused' ? 'Reanudar análisis' : 'Iniciar análisis' }}</span>
      </button>
      <button
        class="btn analysis-btn btn-pause"
        :disabled="analysisState !== 'running'"
        @click="$emit('pause')"
      >
        <PauseCircle class="action-icon" />
        <span>Pausar análisis</span>
      </button>
      <button
        class="btn analysis-btn btn-discard"
        :disabled="analysisState === 'idle' && !hasResultsFlag"
        @click="$emit('discard')"
      >
        <DeleteForever class="action-icon" />
        <span>Descartar análisis</span>
      </button>
    </div>
  </div>
</template>

<script>
import { PlayCircle, PauseCircle, DeleteForever } from 'mdue';

export default {
  name: 'ExerciseAnalysisPanel',
  components: { PlayCircle, PauseCircle, DeleteForever },
  props: {
    analysisState: { type: String, required: true },
    isEngineReady: { type: Boolean, required: true },
    analysisProgress: { type: Number, required: true },
    targetFps: { type: Number, required: true },
    nativeVideoFps: { type: Number, required: true },
    hasResultsFlag: { type: Boolean, required: true },
  },
  emits: ['start', 'pause', 'discard', 'update:targetFps']
}
</script>

<style scoped lang="scss">
.analysis-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
}

.fps-selector-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #262626;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #3d3d3d;
}

.fps-label {
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  color: #a3a3a3;
  margin: 0;
}

.fps-select {
  background: #171717;
  color: #f5f5f5;
  border: 1px solid #404040;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
  font-family: 'Open Sans', sans-serif;
  transition: border-color 0.2s;

  &:hover:not(:disabled) { border-color: #525252; }
  &:focus:not(:disabled) { border-color: #3b82f6; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.analysis-status-bar {
  display: flex;
  align-items: center;
}

.analysis-badge {
  font-size: 0.85em;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  letter-spacing: 0.03em;
  transition: all 0.3s ease;

  &.idle         { background: #2a2a2a; color: #888;    border: 1px solid #444;    }
  &.running      { background: #0d3320; color: #4ade80; border: 1px solid #22c55e; animation: pulse-green 1.8s infinite; }
  &.initializing { background: #0d2233; color: #60a5fa; border: 1px solid #3b82f6; animation: pulse-blue 1.2s infinite; }
  &.paused       { background: #2d2200; color: #fbbf24; border: 1px solid #f59e0b; }
  &.complete     { background: #0a2518; color: #86efac; border: 1px solid #4ade80; }
}

.engine-badge {
  font-size: 0.85em;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  letter-spacing: 0.03em;
  transition: all 0.3s ease;

  &.ready   { background: #0c4a6e; color: #38bdf8; border: 1px solid #0ea5e9; }
  &.waiting { background: #1c1917; color: #a8a29e; border: 1px solid #44403c; }
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
}

@keyframes pulse-blue {
  0%, 100% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(96, 165, 250, 0); }
}

.analysis-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.analysis-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1em !important;
  padding: 9px 20px !important;
  border-radius: 8px !important;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;

  &:disabled { opacity: 0.38; cursor: not-allowed; }
  &:not(:disabled):hover { transform: translateY(-1px); }

  &.btn-start   { background: #166534; color: #bbf7d0; }
  &.btn-pause   { background: #78350f; color: #fde68a; }
  &.btn-discard { background: #7f1d1d; color: #fecaca; }
}
</style>
