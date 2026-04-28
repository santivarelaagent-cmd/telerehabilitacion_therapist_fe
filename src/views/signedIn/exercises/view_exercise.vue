<template>
  <div class="therapies">
    <h2 class="light-font dark-text">
      Ejercicio <span class="light-italic-font">{{ exercise.name }}</span>
    </h2>
    <h3 class="regular-font dark-text">Descripción:</h3>
    <p class="light-font dark-text">{{ exercise.description }}</p>
    <div class="video-container">
      <div class="video-wrapper">
        <h3 class="regular-font dark-text">Estado del video de ayuda:</h3>
        <p class="light-font dark-text">{{ exercise.status }}</p>
        <template v-if="exercise.status=== 'Video procesado' || exercise.status === 'Video en procesamiento'">
          <h3 class="regular-font dark-text">Video subido:</h3>
          <div ref="videoContainer" style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <video
              ref="video"
              :src="exercise.video"
              controls
              controlsList="nofullscreen"
              crossorigin="anonymous"
              @loadedmetadata="calculateInitialProgress"
              @play="startDetection"
              @pause="stopDetection"
              @ended="stopDetection"
              style="width: 100%; max-height: 100vh; object-fit: contain; z-index: 1;"
            ></video>
            <canvas
              ref="canvas"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; z-index: 2;"
            ></canvas>
            <div @click="togglePlayPause" style="position: absolute; top: 0; left: 0; width: 100%; height: calc(100% - 60px); z-index: 5; cursor: pointer;" title="Pausar / Reanudar"></div>
            <button @click="toggleFullScreen" class="floating-fullscreen-btn" title="Pantalla Completa">
              <Fullscreen />
            </button>
          </div>
          
          <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; margin-top: 15px; overflow: hidden; border: 1px solid #555;">
            <div :style="'height: 100%; background: #4BC0C0; transition: width 0.2s ease-out; width: ' + analysisProgress + '%;'"></div>
          </div>
          <p class="light-font dark-text" style="text-align: right; font-size: 0.85em; margin-top: 5px; margin-bottom: 0;">Progreso del análisis: {{ analysisProgress }}%</p>

          <hr>
          <div class="patients-table">
            <span class="regular-font">Punto</span>
            <span class="regular-font">Ángulo mínimo</span>
            <span class="regular-font">Ángulo máximo</span>
            <template v-for="point in tracked_points" :key="point.id">
              <span class="light-font">{{point.verbose}}</span>
              <span class="light-font">{{parseFloat(point.min_angle || 0).toFixed(2)}}</span>
              <span class="light-font">{{parseFloat(point.max_angle || 0).toFixed(2)}}</span>
            </template>
          </div> 
          <hr>
          <div class="diff-table">
            <span class="regular-font">Nombre</span>
            <span class="regular-font">Punto seguido</span>
            <span class="regular-font">Ángulo mínimo</span>
            <span class="regular-font">Ángulo máximo</span>
            <template v-for="diff in difficulties" :key="diff.name">
              <template v-for="(range, index) in diff.ranges" :key="index">
                <span class="light-font">{{index === 0 ? diff.name : ''}}</span>
                <span class="light-font">
                  {{ range.point_tracked && range.point_tracked.skeleton_point ? range.point_tracked.skeleton_point.verbose : 'N/A' }}
                </span>
                <span class="light-font">{{parseFloat(range.min_angle || 0).toFixed(2)}}</span>
                <span class="light-font">{{parseFloat(range.max_angle || 0).toFixed(2)}}</span>
              </template>
            </template>
          </div> 
          
          <div v-show="showCharts" style="width: 100%; margin-top: 30px;">
            <hr>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
              <h3 class="regular-font dark-text" style="margin: 0;">Análisis de Movimiento en el Tiempo:</h3>
              <select v-model="chartType" @change="generateCharts" class="form-control" style="width: 250px; font-size: 1.1em; padding: 8px;">
                <option value="posicion">Posición vs Tiempo (X, Y, Z)</option>
                <option value="angulo">Ángulos vs Tiempo (Grados)</option>
              </select>
            </div>
            
            <div v-for="point in tracked_points" :key="point.codename" style="margin-bottom: 60px; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px;">
                <h4 class="light-font" style="margin: 0;">{{ point.verbose }}</h4>
                <div v-if="chartStats[point.codename]" style="display: flex; gap: 10px; font-size: 0.85em; flex-wrap: wrap;">
                  <div v-for="stat in chartStats[point.codename]" :key="stat.label" 
                       :style="`background-color: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}50; padding: 6px 14px; border-radius: 20px; font-weight: 500; font-family: 'Open Sans', sans-serif;`">
                    <strong>{{ stat.label }}</strong> &bull; Mín: {{ stat.min }} &bull; Máx: {{ stat.max }} &bull; Prom: {{ stat.avg }}
                  </div>
                </div>
              </div>
              <div style="height: 350px; width: 100%; margin-top: 10px;">
                <canvas :id="'chart-' + point.codename" style="width: 100%; height: 100%;"></canvas>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="actions-container">
      <div class="actions-wrapper">
        <button class="btn btn-dark" v-on:click="() => $router.push({name: 'edit_exercise', params: {exercise_id: exercise.id}})" >
          <VideoAccount class="action-icon" />
          <span>Asignar video al ejercicio</span>
        </button>
        <button class="btn btn-dark" v-on:click="() => $router.push({name: 'new_difficulty', params: {exercise_id: exercise.id}})" >
          <RunFast class="action-icon" />
          <span>Asignar nueva dificultad al ejercicio</span>
        </button>
        <button class="btn btn-dark" v-on:click="sendResults" :disabled="!hasResults">
          <Upload class="action-icon" />
          <span>Enviar resultados</span>
        </button>
        <button class="btn btn-dark" @click="downloadMovementJSON" :disabled="!hasResultsFlag">
          <Download class="action-icon" />
          <span>Descargar JSON de Movimiento ({{ analysisProgress }}%)</span>
        </button>
        <button class="btn btn-dark" @click="generateCharts" :disabled="!hasResultsFlag">
          <ChartLine class="action-icon" />
          <span>Generar Gráficas ({{ analysisProgress }}%)</span>
        </button>
        <button class="btn btn-dark" @click="exportToCSV" :disabled="!hasResultsFlag">
          <FileExcel class="action-icon" />
          <span>Exportar a Excel (CSV)</span>
        </button>
        <button class="btn btn-primary" @click="$router.push(`/exercises/${exercise.id}/3d-viewer`)" :disabled="!hasResultsFlag">
          <Cube class="action-icon" />
          <span>Ver Análisis en 3D</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { VideoAccount, RunFast, Upload, Download, Fullscreen, ChartLine, Cube, FileExcel } from "mdue";
import PoseLandmarkerService from '@/services/poseLandmarkerService';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default {
  name: 'ViewExercise',
  async beforeMount() {
    await this.getExercise();
    this.poseService = new PoseLandmarkerService();
    await this.poseService.initialize();
    this._movement_history_map = {};
    this._processedSegments = new Set();
    this._chartInstances = {};
    this.loadHistoryFromStorage();
  },
  components: {
    VideoAccount,
    RunFast,
    Upload,
    Download,
    Fullscreen,
    ChartLine,
    Cube,
    FileExcel
  },
  computed: {
    hasResults() {
      return this.hasResultsFlag;
    }
  },
  methods: {
    async getExercise() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.$route.params.exercise_id}`
      );
      if (response.status !== 404) {
        this.exercise = response.data;
        this.status = this.exercise.status;
        if (this.status === "Video procesado" || this.status === "Video en procesamiento") {
          await this.getPointsTracked();
          await this.getDifficulties();
        }
      }
    },
    async getPointsTracked() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.exercise.id}/points_tracked/`
      );
      if (response.status === 200) {
        this.tracked_points = response.data;
        this._observed_results = {};
        this.tracked_points.forEach(point => {
          this._observed_results[point.codename] = { min: Infinity, max: -Infinity };
        });
      }
    },
    refreshChartData() {
      if (!this.showCharts) return;
      const historyArr = this.getMovementHistoryArray();
      const times = historyArr.map(frame => frame.t);
      
      for (const point of this.tracked_points) {
        const chart = this._chartInstances && this._chartInstances[point.codename];
        if (!chart) continue;
        
        chart.data.labels = times;
        
        let datasets = chart.data.datasets;
        
        if (this.chartType === 'posicion') {
          const pointId = point.id;
          const xs = [], ys = [], zs = [];
          for (const frame of historyArr) {
            const coords = frame.points[pointId];
            if (coords) {
              xs.push(coords[0]); ys.push(coords[1]); zs.push(coords[2]);
            } else {
              xs.push(null); ys.push(null); zs.push(null);
            }
          }
          if (datasets[0]) datasets[0].data = xs;
          if (datasets[1]) datasets[1].data = ys;
          if (datasets[2]) datasets[2].data = zs;
        } else {
          const angles = [];
          for (const frame of historyArr) {
            angles.push(frame.angles && frame.angles[point.codename] !== undefined ? frame.angles[point.codename] : null);
          }
          if (datasets[0]) datasets[0].data = angles;
        }

        const stats = [];
        for (const ds of datasets) {
          const validData = ds.data.filter(v => v !== null && !isNaN(v));
          if (validData.length > 0) {
            const min = Math.min(...validData);
            const max = Math.max(...validData);
            const avg = validData.reduce((a, b) => a + b, 0) / validData.length;
            stats.push({
              label: ds.label.split('(')[0].trim(),
              min: min.toFixed(2),
              max: max.toFixed(2),
              avg: avg.toFixed(2),
              color: ds.borderColor
            });
          }
        }
        this.chartStats[point.codename] = stats;
        
        chart.update('none'); // Disable animation to keep UI highly performant
      }
    },
    saveHistoryToStorage() {
      if (!this.exercise || !this.exercise.id || !this._movement_history_map) return;
      try {
        const payload = {
          map: this._movement_history_map,
          segments: Array.from(this._processedSegments)
        };
        localStorage.setItem(`exercise_${this.exercise.id}_history`, JSON.stringify(payload));
      } catch (e) {
        console.warn('El historial de movimiento en caché es grande y puede que no quepa en localStorage.', e);
      }
    },
    loadHistoryFromStorage() {
      if (!this.exercise || !this.exercise.id) return;
      const cached = localStorage.getItem(`exercise_${this.exercise.id}_history`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.map && parsed.segments) {
            this._movement_history_map = parsed.map;
            this._processedSegments = new Set(parsed.segments);
            this.hasResultsFlag = Object.keys(parsed.map).length > 0;
          }
        } catch (e) {
          console.error('Error cargando historial de resguardo:', e);
        }
      }
    },
    togglePlayPause() {
      const video = this.$refs.video;
      if (video) {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      }
    },
    calculateInitialProgress() {
      const video = this.$refs.video;
      if (video && video.duration && this._processedSegments && this._processedSegments.size > 0) {
        const totalSegments = Math.ceil(video.duration * 10);
        this.analysisProgress = Math.min(100, Math.round((this._processedSegments.size / totalSegments) * 100));
      }
    },
    async getDifficulties() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.exercise.id}/difficulties/`
      );
      if (response.status === 200) {
        this.difficulties = response.data;
      }
    },
    exportToCSV() {
      const historyArr = this.getMovementHistoryArray();
      if (!historyArr || historyArr.length === 0) return;

      const tracked = this.tracked_points || [];
      
      // Build CSV Headers
      let headers = ['Tiempo (s)'];
      for (const point of tracked) {
        const name = point.verbose.replace(/"/g, '""'); // Escape double quotes just in case
        headers.push(`"${name} X"`, `"${name} Y"`, `"${name} Z"`, `"${name} Ángulo (°)"`);
      }
      
      let csvContent = headers.join(',') + '\n';
      
      // Build CSV Rows
      for (const frame of historyArr) {
        let row = [frame.t.toFixed(3)];
        for (const point of tracked) {
          const ptId = point.id;
          const codename = point.codename;
          const coords = frame.points[ptId];
          
          if (coords) {
            row.push(coords[0].toFixed(4), coords[1].toFixed(4), coords[2].toFixed(4));
          } else {
            row.push('', '', '');
          }
          
          const angle = frame.angles && frame.angles[codename] !== undefined ? frame.angles[codename] : '';
          row.push(angle !== '' ? parseFloat(angle).toFixed(2) : '');
        }
        csvContent += row.join(',') + '\n';
      }
      
      // Trigger File Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = this.exercise.name ? this.exercise.name.replace(/\s+/g, '_') : 'ejercicio';
      link.setAttribute('download', `datos_movimiento_${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    getMovementHistoryArray() {
      if (!this._movement_history_map) return [];
      return Object.values(this._movement_history_map).sort((a, b) => a.t - b.t);
    },
    generateCharts() {
      this.showCharts = true;
      
      this.$nextTick(() => {
        const historyArr = this.getMovementHistoryArray();
        const times = historyArr.map(frame => frame.t);
        
        for (const point of this.tracked_points) {
          const canvasId = 'chart-' + point.codename;
          const canvas = document.getElementById(canvasId);
          if (!canvas) continue;
          
          if (this._chartInstances && this._chartInstances[point.codename]) {
            this._chartInstances[point.codename].destroy();
          }

          let datasets = [];
          let yAxisTitle = '';

          if (this.chartType === 'posicion') {
            const pointId = point.id;
            const xs = [];
            const ys = [];
            const zs = [];
            
            for (const frame of historyArr) {
              const coords = frame.points[pointId];
              if (coords) {
                xs.push(coords[0]);
                ys.push(coords[1]);
                zs.push(coords[2]);
              } else {
                xs.push(null); ys.push(null); zs.push(null);
              }
            }
            datasets = [
              { label: 'Eje X (Ancho)', data: xs, borderColor: '#FF6384', borderWidth: 2, pointRadius: 0, tension: 0.1 },
              { label: 'Eje Y (Alto)', data: ys, borderColor: '#36A2EB', borderWidth: 2, pointRadius: 0, tension: 0.1 },
              { label: 'Eje Z (Prof)', data: zs, borderColor: '#4BC0C0', borderWidth: 2, pointRadius: 0, tension: 0.1 }
            ];
            yAxisTitle = 'Coordenada Normalizada';
          } else {
            const angles = [];
            for (const frame of historyArr) {
              const ang = frame.angles && frame.angles[point.codename] !== undefined ? frame.angles[point.codename] : null;
              angles.push(ang);
            }
            datasets = [
              { label: 'Ángulo (Grados)', data: angles, borderColor: '#9966FF', borderWidth: 2, pointRadius: 0, tension: 0.1 }
            ];
            yAxisTitle = 'Grados (°)';
          }

          const stats = [];
          for (const ds of datasets) {
            const validData = ds.data.filter(v => v !== null && !isNaN(v));
            if (validData.length > 0) {
              const min = Math.min(...validData);
              const max = Math.max(...validData);
              const avg = validData.reduce((a, b) => a + b, 0) / validData.length;
              stats.push({
                label: ds.label.split('(')[0].trim(),
                min: min.toFixed(2),
                max: max.toFixed(2),
                avg: avg.toFixed(2),
                color: ds.borderColor
              });
            }
          }
          this.chartStats[point.codename] = stats;
          
          if (!this._chartInstances) this._chartInstances = {};
          this._chartInstances[point.codename] = new Chart(canvas, {
            type: 'line',
            data: {
              labels: times,
              datasets: datasets
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              interaction: { mode: 'index', intersect: false },
              plugins: { legend: { position: 'top' } },
              scales: {
                x: { title: { display: true, text: 'Tiempo (segundos)' } },
                y: { title: { display: true, text: yAxisTitle } }
              }
            }
          });
        }
      });
    },
    startDetection() {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      this.poseService.createDrawingUtils(canvas.getContext('2d'));

      if (!this._movement_history_map) {
        this._movement_history_map = {};
        this._processedSegments = new Set();
        this.analysisProgress = 0;
      }

      const processFrame = async (now, metadata) => {
        if (!video || video.paused || video.ended) return;

        try {
          const timestamp = metadata ? metadata.mediaTime * 1000 : performance.now();
          await this.poseService.detectForVideo(
            video,
            canvas,
            timestamp,
            this.tracked_points,
            this.updateResults
          );
        } catch (e) {
          console.error("Error en renderLoop:", e);
        }

        if (video.requestVideoFrameCallback) {
          video.requestVideoFrameCallback(processFrame);
        } else {
          requestAnimationFrame(processFrame);
        }
      };

      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(processFrame);
      } else {
        requestAnimationFrame(processFrame);
      }
    },
    stopDetection() {},
    toggleFullScreen() {
      const elem = this.$refs.videoContainer;
      if (!elem) return;
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
          console.error("Error al intentar iniciar pantalla completa:", err);
        });
      } else {
        document.exitFullscreen();
      }
    },
    updateResults(currentAngles, currentCoords) {
      const video = this.$refs.video;
      const currentTime = video ? video.currentTime : 0;
      
      let gotNewResults = false;
      for (const codename in currentAngles) {
        const angle = currentAngles[codename];
        if (this._observed_results && this._observed_results[codename]) {
          if (angle < this._observed_results[codename].min) this._observed_results[codename].min = angle;
          if (angle > this._observed_results[codename].max) this._observed_results[codename].max = angle;
          gotNewResults = true;
        }
      }
      
      if (gotNewResults && !this.hasResultsFlag) {
        this.hasResultsFlag = true;
      }

      const key = currentTime.toFixed(2);
      this._movement_history_map[key] = {
        t: parseFloat(currentTime.toFixed(4)),
        points: currentCoords,
        angles: currentAngles
      };

      const segment = Math.floor(currentTime * 10);
      if (!this._processedSegments) this._processedSegments = new Set();
      this._processedSegments.add(segment);
      
      if (video && video.duration) {
        const totalSegments = Math.ceil(video.duration * 10);
        const progress = Math.min(100, Math.round((this._processedSegments.size / totalSegments) * 100));
        if (this.analysisProgress !== progress) {
          this.analysisProgress = progress;
        }
      }

      const nowTime = Date.now();
      if (nowTime - (this._lastSaveTime || 0) > 3000) {
        this.saveHistoryToStorage();
        this._lastSaveTime = nowTime;
      }

      if (this.showCharts && nowTime - (this._lastChartUpdate || 0) > 500) {
        this.refreshChartData();
        this._lastChartUpdate = nowTime;
      }
    },
    downloadMovementJSON() {
      const dataStr = JSON.stringify({
        exercise_id: this.exercise.id,
        exercise_name: this.exercise.name,
        duration: this.$refs.video.duration,
        frames: this.getMovementHistoryArray()
      });

      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `movimiento_${this.exercise.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    async sendResults() {
      if (!this._observed_results) return;
      
      const resultsPayload = {
        error: false,
        results: {
          points: Object.entries(this._observed_results).map(([center, data]) => ({
            center: center,
            max_angle: data.max === -Infinity ? 0 : parseFloat(data.max.toFixed(2)),
            min_angle: data.min === Infinity ? 0 : parseFloat(data.min.toFixed(2))
          }))
        }
      };

      const http = new Http();
      try {
        const response = await http.authPost(`/exercises/${this.exercise.id}/video_results/`, resultsPayload);
        if (response.status === 200 || response.status === 201) alert("Resultados enviados correctamente");
      } catch (error) {
        console.error("Error en la petición:", error);
      }
    }
  },
  data() {
    return {
      exercise: {},
      tracked_points: [],
      difficulties: [],
      poseService: null,
      hasResultsFlag: false,
      showCharts: false,
      chartStats: {},
      analysisProgress: 0,
      chartType: 'posicion'
    };
  },
};
</script>

<style lang="scss">
.video-container { width: 100%; display: flex; justify-content: center; }
.video-wrapper {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  video { width: 100%; justify-self: center; }
}
.patients-table, .diff-table {
  overflow-x: auto;
  display: grid;
  width: 100%;
}
.actions-wrapper {
  width: 90%;
  padding: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  button { 
    padding: 8px 16px; 
    flex: 0 0 auto; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 8px; 
    font-size: 0.9em;
    max-height: 40px;
    border-radius: 6px;
  }
}
.action-icon { font-size: 1.4em; }

.floating-fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(0, 0, 0, 0.8);
    transform: scale(1.05);
  }

  svg {
    font-size: 30px;
  }
}
</style>