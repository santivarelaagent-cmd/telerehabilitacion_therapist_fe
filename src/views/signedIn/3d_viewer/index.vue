<template>
  <div class="viewer-3d-container">
    
    <!-- Header Bar -->
    <div class="viewer-header">
      <div class="header-left">
        <h2 class="light-font dark-text" style="margin: 0;">Visor 3D</h2>
        <div v-if="jsonData" class="source-badge" style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
          <span :style="{ background: dataSource === 'localstorage' ? '#4BC0C0' : '#8e44ad', color: 'white', padding: '4px 8px', borderRadius: '5px', fontSize: '0.75em', fontWeight: 'bold' }">
            {{ dataSource === 'localstorage' ? '💾 Local Storage' : '📁 Archivo JSON' }}
          </span>
          <span style="font-size: 0.85em; color: #555; font-weight: 500;" :title="dataSourceName">{{ dataSourceName }}</span>
          <span v-if="jsonData.exercise_name" style="font-size: 0.85em; color: #333; font-weight: 600;">— {{ jsonData.exercise_name }}</span>
        </div>
      </div>
      <div class="header-right">
        <label class="card" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding: 8px 14px;" v-if="!jsonData">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <span style="font-size: 0.9em; font-weight: 500;">Cargar archivo JSON</span>
          <input type="file" accept=".json" @change="onFileChange" style="display:none" />
        </label>
        <button v-else class="btn btn-dark" style="border-radius: 6px; padding: 8px 16px; font-size: 0.9em;" @click="resetData">
          Cargar otro archivo
        </button>
      </div>
    </div>

    <!-- 3D Viewer -->
    <div class="main-content" ref="mainContent">
      <div class="canvas-wrapper" :class="isDarkMode ? 'dark-bg' : 'light-bg'" v-if="jsonData">
        <Skeleton3D 
          :currentFrame="currentFrame" 
          :trackedIndices="activeTrackedIndices"
          :showAllPoints="showAllPoints"
          @toggle-points="showAllPoints = !showAllPoints"
          :isDarkMode="isDarkMode"
          @toggle-theme="isDarkMode = !isDarkMode"
          :showAxes="showAxes"
          @toggle-axes="showAxes = !showAxes"
          @toggle-fullscreen="toggleFullscreen"
        />
      </div>
      <div v-else class="empty-state" :class="isDarkMode ? 'dark-bg' : 'light-bg'">
        <p class="light-font" style="font-size: 1.2em;">Sube un archivo JSON para visualizar la reconstrucción anatómica 3D.</p>
      </div>

      <!-- Scrubber -->
      <div class="scrubber-container" v-if="jsonData">
        <button class="play-btn" @click="togglePlay">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <input 
          type="range" 
          min="0" 
          :max="totalFrames - 1" 
          v-model.number="currentFrameIndex"
          class="timeline-slider"
          @input="onScrub"
        />
        <span class="time-label">{{ currentTimeFormatted }} / {{ totalTimeFormatted }}</span>
      </div>
    </div>

    <!-- Bottom Tab Panel -->
    <div class="bottom-panel" v-if="jsonData">
      <!-- Tab Bar -->
      <div class="tab-bar">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'metrics' }" 
          @click="activeTab = 'metrics'"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Métricas
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'charts' }" 
          @click="switchToCharts"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Ángulos
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'positions' }" 
          @click="switchToPositions"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          Posición
        </button>
      </div>

      <!-- Metrics Tab -->
      <div v-show="activeTab === 'metrics'" class="tab-content">
        <div v-if="metrics" style="display: flex; flex-wrap: wrap; gap: 14px;">
          <div v-for="(metric, pointName) in metrics" :key="pointName" class="metric-card-item">
            <div style="font-weight: 700; color: #4BC0C0; margin-bottom: 6px; font-size: 0.9em;">{{ formatPointName(pointName) }}</div>
            <div style="font-size: 0.85em; color: #555;">Repeticiones: <strong>{{ metric.reps }}</strong></div>
            <div style="font-size: 0.85em; color: #555;">Rango: {{ metric.min }}° – {{ metric.max }}°</div>
            <div style="font-size: 0.85em; color: #555;">Amplitud: <strong>{{ metric.amplitude }}°</strong></div>
          </div>
        </div>
        <div v-else>
          <p style="font-size: 0.9em; color: #888;">Este archivo JSON no contiene cálculos angulares previos para procesar métricas.</p>
        </div>
      </div>

      <!-- Charts Tab -->
      <div v-show="activeTab === 'charts'" class="tab-content charts-grid">
        <template v-if="metrics">
          <div v-for="(metric, pointName) in metrics" :key="'chart-' + pointName" class="chart-wrapper">
            <div style="font-size: 0.8em; font-weight: 700; color: #4BC0C0; margin-bottom: 4px;">{{ formatPointName(pointName) }}</div>
            <canvas :ref="'chart_' + pointName" height="100"></canvas>
          </div>
        </template>
        <div v-else>
          <p style="font-size: 0.9em; color: #888;">Sin datos de ángulos para graficar.</p>
        </div>
      </div>
      <!-- Positions Tab -->
      <div v-show="activeTab === 'positions'" class="tab-content charts-grid">
        <template v-if="activeTrackedIndices.length > 0">
          <div v-for="idx in activeTrackedIndices" :key="'pos-' + idx" class="chart-wrapper">
            <div style="font-size: 0.8em; font-weight: 700; color: #8e44ad; margin-bottom: 4px;">
              {{ landmarkName(idx) }} — Posición (X, Y, Z)
            </div>
            <canvas :ref="'posChart_' + idx" height="100"></canvas>
          </div>
        </template>
        <div v-else>
          <p style="font-size: 0.9em; color: #888;">No hay puntos rastreados activos para mostrar posición.</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import Skeleton3D from './components/Skeleton3D.vue';
import MetricsService from '@/services/metricsService';
import Chart from 'chart.js/auto';

// Custom Chart.js plugin: draws a red vertical playhead line
const playheadPlugin = {
  id: 'playhead',
  afterDatasetsDraw(chart) {
    const idx = chart._playheadIndex;
    if (idx == null || idx < 0) return;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data[idx]) return;

    const x = meta.data[idx].x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.strokeStyle = '#FF3366';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.restore();
  }
};

const POSE_LANDMARK_IDS = {
  "LEFT_SHOULDER": 11,
  "RIGHT_SHOULDER": 12,
  "LEFT_ELBOW": 13,
  "RIGHT_ELBOW": 14,
  "LEFT_WRIST": 15,
  "RIGHT_WRIST": 16,
  "LEFT_HIP": 23,
  "RIGHT_HIP": 24,
  "LEFT_KNEE": 25,
  "RIGHT_KNEE": 26,
  "LEFT_ANKLE": 27,
  "RIGHT_ANKLE": 28
};

export default {
  name: 'View3DViewer',
  components: { Skeleton3D },
  data() {
    return {
      jsonData: null,
      dataSource: null,
      dataSourceName: '',
      showAllPoints: true,
      isDarkMode: true,
      showAxes: false,
      currentFrameIndex: 0,
      isPlaying: false,
      playbackInterval: null,
      metrics: null,
      activeTab: 'metrics',
      chartInstances: {},
      chartStep: 1,
      posChartInstances: {},
      posChartStep: 1
    };
  },
  computed: {
    activeTrackedIndices() {
      if (!this.metrics) return [];
      return Object.keys(this.metrics)
        .map(key => POSE_LANDMARK_IDS[key])
        .filter(id => id !== undefined);
    },
    currentFrame() {
      if (!this.jsonData || !this.jsonData.frames) return null;
      return this.jsonData.frames[this.currentFrameIndex];
    },
    totalFrames() {
      return this.jsonData && this.jsonData.frames ? this.jsonData.frames.length : 0;
    },
    currentTimeFormatted() {
      if (!this.currentFrame) return '0.0s';
      return this.currentFrame.t.toFixed(1) + 's';
    },
    totalTimeFormatted() {
      if (!this.jsonData || !this.jsonData.frames || this.totalFrames === 0) return '0.0s';
      return this.jsonData.frames[this.totalFrames - 1].t.toFixed(1) + 's';
    }
  },
  watch: {
    currentFrameIndex(newIndex) {
      // Update angle chart playheads
      const instances = Object.values(this.chartInstances);
      if (instances.length) {
        const playheadIdx = Math.floor(newIndex / this.chartStep);
        for (const chart of instances) {
          chart._playheadIndex = playheadIdx;
          chart.draw();
        }
      }
      // Update position chart playheads
      const posInstances = Object.values(this.posChartInstances);
      if (posInstances.length) {
        const posPlayheadIdx = Math.floor(newIndex / this.posChartStep);
        for (const chart of posInstances) {
          chart._playheadIndex = posPlayheadIdx;
          chart.draw();
        }
      }
    }
  },
  methods: {
    onFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.loadJsonData(data, 'file', file.name);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          alert("Archivo JSON inválido.");
        }
      };
      reader.readAsText(file);
    },
    loadJsonData(data, source = 'file', name = '') {
      this.jsonData = data;
      this.dataSource = source;
      this.dataSourceName = name;
      this.currentFrameIndex = 0;
      this.activeTab = 'metrics';
      // Destroy old charts when new data is loaded
      Object.values(this.chartInstances).forEach(c => c.destroy());
      Object.values(this.posChartInstances).forEach(c => c.destroy());
      this.chartInstances = {};
      this.posChartInstances = {};
      this.calculateMetrics();
    },
    calculateMetrics() {
      if (!this.jsonData || !this.jsonData.frames) return;
      const calculated = {};
      
      const sampleFrame = this.jsonData.frames.find(f => f.angles);
      if (sampleFrame && sampleFrame.angles) {
        const angleKeys = Object.keys(sampleFrame.angles);
        for (const key of angleKeys) {
          const angleData = this.jsonData.frames.map(f => f.angles ? f.angles[key] : null);
          calculated[key] = MetricsService.calculateStats(angleData);
        }
      }
      this.metrics = Object.keys(calculated).length > 0 ? calculated : null;
    },
    togglePlay() {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        this.playbackInterval = setInterval(() => {
          if (this.currentFrameIndex < this.totalFrames - 1) {
            this.currentFrameIndex++;
          } else {
            this.pausePlayback();
          }
        }, 33); // Approx 30fps
      } else {
        this.pausePlayback();
      }
    },
    pausePlayback() {
      this.isPlaying = false;
      clearInterval(this.playbackInterval);
    },
    onScrub() {
      if (this.isPlaying) this.pausePlayback();
    },
    resetData() {
      this.pausePlayback();
      this.jsonData = null;
      this.metrics = null;
    },
    toggleFullscreen() {
      const elem = this.$refs.mainContent;
      if (!elem) return;
      
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
    },
    switchToCharts() {
      this.activeTab = 'charts';
      this.$nextTick(() => this.renderCharts());
    },
    renderCharts() {
      if (!this.metrics || !this.jsonData) return;

      // Sample every N frames for performance (max 300 points)
      const frames = this.jsonData.frames;
      const step = Math.max(1, Math.floor(frames.length / 300));
      this.chartStep = step; // Store for the watcher to use
      const sampledFrames = frames.filter((_, i) => i % step === 0);
      const labels = sampledFrames.map(f => f.t ? f.t.toFixed(1) + 's' : '');
      const initialPlayheadIdx = Math.floor(this.currentFrameIndex / step);

      for (const pointName of Object.keys(this.metrics)) {
        const canvasRef = this.$refs['chart_' + pointName];
        const canvas = Array.isArray(canvasRef) ? canvasRef[0] : canvasRef;
        if (!canvas) continue;

        // Destroy previous chart instance if exists
        if (this.chartInstances[pointName]) {
          this.chartInstances[pointName].destroy();
        }

        const angleData = sampledFrames.map(f => f.angles && f.angles[pointName] != null ? f.angles[pointName] : null);

        const chartInstance = new Chart(canvas, {
          type: 'line',
          plugins: [playheadPlugin], // Register custom playhead plugin
          data: {
            labels,
            datasets: [{
              label: this.formatPointName(pointName) + ' (°)',
              data: angleData,
              borderColor: '#4BC0C0',
              backgroundColor: 'rgba(75,192,192,0.08)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.3,
              fill: true,
              spanGaps: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: false,
            onClick: (event, _elements, chart) => {
              const xScale = chart.scales.x;
              if (!xScale) return;
              const sampledIdx = Math.round(xScale.getValueForPixel(event.x));
              if (sampledIdx == null || sampledIdx < 0) return;
              const originalIdx = Math.min(sampledIdx * step, this.totalFrames - 1);
              if (this.isPlaying) this.pausePlayback();
              this.currentFrameIndex = originalIdx;
            },
            plugins: {
              legend: { display: false },
              tooltip: { mode: 'index', intersect: false }
            },
            scales: {
              x: {
                ticks: { maxTicksLimit: 8, font: { size: 10 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
              },
              y: {
                title: { display: true, text: 'Grados (°)', font: { size: 10 } },
                ticks: { font: { size: 10 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
              }
            }
          }
        });

        // Set initial playhead position
        chartInstance._playheadIndex = initialPlayheadIdx;
        this.chartInstances[pointName] = chartInstance;
      }
    },
    switchToPositions() {
      this.activeTab = 'positions';
      this.$nextTick(() => this.renderPositionCharts());
    },
    renderPositionCharts() {
      if (!this.jsonData || !this.activeTrackedIndices.length) return;

      const frames = this.jsonData.frames;
      const step = Math.max(1, Math.floor(frames.length / 300));
      this.posChartStep = step;
      const sampledFrames = frames.filter((_, i) => i % step === 0);
      const labels = sampledFrames.map(f => f.t ? f.t.toFixed(1) + 's' : '');
      const initialPlayheadIdx = Math.floor(this.currentFrameIndex / step);

      for (const landmarkIdx of this.activeTrackedIndices) {
        const canvasRef = this.$refs['posChart_' + landmarkIdx];
        const canvas = Array.isArray(canvasRef) ? canvasRef[0] : canvasRef;
        if (!canvas) continue;

        if (this.posChartInstances[landmarkIdx]) {
          this.posChartInstances[landmarkIdx].destroy();
        }

        const xData = sampledFrames.map(f => {
          const pt = f.points && (f.points[landmarkIdx] || f.points[String(landmarkIdx)]);
          return pt ? parseFloat(pt[0].toFixed(4)) : null;
        });
        const yData = sampledFrames.map(f => {
          const pt = f.points && (f.points[landmarkIdx] || f.points[String(landmarkIdx)]);
          return pt ? parseFloat(pt[1].toFixed(4)) : null;
        });
        const zData = sampledFrames.map(f => {
          const pt = f.points && (f.points[landmarkIdx] || f.points[String(landmarkIdx)]);
          return pt ? parseFloat(pt[2].toFixed(4)) : null;
        });

        const chartInstance = new Chart(canvas, {
          type: 'line',
          plugins: [playheadPlugin],
          data: {
            labels,
            datasets: [
              { label: 'X', data: xData, borderColor: '#e74c3c', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3, spanGaps: true },
              { label: 'Y', data: yData, borderColor: '#2ecc71', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3, spanGaps: true },
              { label: 'Z', data: zData, borderColor: '#3498db', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3, spanGaps: true }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: false,
            onClick: (event, _elements, chart) => {
              const xScale = chart.scales.x;
              if (!xScale) return;
              const sampledIdx = Math.round(xScale.getValueForPixel(event.x));
              if (sampledIdx == null || sampledIdx < 0) return;
              const originalIdx = Math.min(sampledIdx * step, this.totalFrames - 1);
              if (this.isPlaying) this.pausePlayback();
              this.currentFrameIndex = originalIdx;
            },
            plugins: {
              legend: { display: true, position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } },
              tooltip: { mode: 'index', intersect: false }
            },
            scales: {
              x: { ticks: { maxTicksLimit: 8, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
              y: { title: { display: true, text: 'Posición (norm.)', font: { size: 10 } }, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
          }
        });

        chartInstance._playheadIndex = initialPlayheadIdx;
        this.posChartInstances[landmarkIdx] = chartInstance;
      }
    },
    landmarkName(idx) {
      const entry = Object.entries(POSE_LANDMARK_IDS).find(([, v]) => v === idx);
      return entry ? this.formatPointName(entry[0]) : 'Punto ' + idx;
    },
    formatPointName(name) {
      return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  },
  mounted() {
    // Optional: auto-load from localStorage if exercise_id is in route
    const exerciseId = this.$route.params.exercise_id;
    if (exerciseId) {
      const cached = localStorage.getItem(`exercise_${exerciseId}_history`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.map) {
             const historyArr = Object.values(parsed.map).sort((a, b) => a.t - b.t);
             this.loadJsonData({
                exercise_name: "Cargado desde Memoria Local",
                frames: historyArr
             }, 'localstorage', `Cache Ejercicio #${exerciseId}`);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  },
  beforeUnmount() {
    this.pausePlayback();
  }
};
</script>

<style scoped>
.viewer-3d-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 12px 16px;
  gap: 12px;
  background-color: transparent;
  box-sizing: border-box;
  /* Escape any parent padding/margin */
  width: 100%;
  margin: 0;
}

/* Header Bar */
.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border-radius: 12px;
  padding: 14px 22px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; }
.header-right { display: flex; align-items: center; gap: 10px; }

/* Main 3D Viewport */
.main-content {
  flex: 1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1; /* Creates isolated stacking context; contains View Cube z-index:10 inside */
  background-color: #2b303b;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.12);
  contain: paint;
  clip-path: inset(0 round 12px);
}

/* Bottom Tab Panel */
.bottom-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  flex-shrink: 0;
  overflow: hidden;
}

.tab-bar {
  display: flex;
  border-bottom: 2px solid #f0f0f0;
  padding: 0 16px;
  background: #fafafa;
  border-radius: 12px 12px 0 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border: none;
  background: transparent;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  font-size: 0.88em;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover { color: #4BC0C0; }
.tab-btn.active { color: #4BC0C0; border-bottom-color: #4BC0C0; }

.tab-content {
  padding: 16px 20px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.chart-wrapper {
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: crosshair;
}

.canvas-wrapper {
  flex-grow: 1;
  position: relative;
  overflow: hidden;   /* Clips absolute-positioned controls within the canvas */
  transition: background-color 0.3s;
}

.empty-state {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s, color 0.3s;
}

.dark-bg {
  background: #2b303b;
  color: #a0aabf;
}

.light-bg {
  background: #f4f7f6;
  color: #333;
}

.scrubber-container {
  height: 70px;
  background: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
}

.timeline-slider {
  flex-grow: 1;
  cursor: pointer;
  accent-color: #4BC0C0;
}

.play-btn {
  background: #4BC0C0;
  color: white;
  border: none;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  font-size: 1.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}
.play-btn:hover { transform: scale(1.05); }

.metrics-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #e1e1e1;
}

.metric-item {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ddd;
}
.metric-item p { margin: 4px 0; font-size: 0.9em; color: #555; }
.card { padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
.mt-3 { margin-top: 15px; }
.time-label { font-size: 0.9em; font-weight: 500; color: #555; min-width: 80px; text-align: right; }
</style>
