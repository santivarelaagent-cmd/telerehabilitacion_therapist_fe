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
        <button class="btn btn-dark" @click="exportRawCSV" :disabled="!hasResultsFlag">
          <FileExcel class="action-icon" />
          <span>Exportar CSV Crudo (33 puntos)</span>
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
import '@/styles/views/view_routine.scss';
import { VideoAccount, RunFast, Upload, Download, Fullscreen, ChartLine, Cube, FileExcel } from 'mdue';
import { Chart, registerables } from 'chart.js';
import PoseLandmarkerService   from '@/services/poseLandmarkerService';
import ExerciseApiService      from '@/services/exerciseApiService';
import MovementHistoryService  from '@/services/movementHistoryService';
import ExerciseExportService   from '@/services/exerciseExportService';
import ExerciseChartService    from '@/services/exerciseChartService';
Chart.register(...registerables);

export default {
  name: 'ViewExercise',

  components: { VideoAccount, RunFast, Upload, Download, Fullscreen, ChartLine, Cube, FileExcel },

  async beforeMount() {
    this._apiService     = new ExerciseApiService();
    this._poseService    = new PoseLandmarkerService();
    this._chartService   = new ExerciseChartService();

    await this._loadExercise();
    await this._poseService.initialize();
    this._historyService = new MovementHistoryService(this.exercise.id);
    this._loadHistory();
  },

  beforeUnmount() {
    this._chartService.destroyAll();
  },

  computed: {
    hasResults() {
      return this.hasResultsFlag;
    },
  },

  methods: {
    // ─── Carga de datos ──────────────────────────────────────────────────────

    async _loadExercise() {
      const response = await this._apiService.getExercise(this.$route.params.exercise_id);
      if (response.status !== 404) {
        this.exercise = response.data;
        const ready = this.exercise.status === 'Video procesado' || this.exercise.status === 'Video en procesamiento';
        if (ready) {
          await this._loadTrackedPoints();
          await this._loadDifficulties();
        }
      }
    },

    async _loadTrackedPoints() {
      const response = await this._apiService.getPointsTracked(this.exercise.id);
      if (response.status === 200) {
        this.tracked_points = response.data;
        this._observedResults = {};
        this.tracked_points.forEach(p => {
          this._observedResults[p.codename] = { min: Infinity, max: -Infinity };
        });
      }
    },

    async _loadDifficulties() {
      const response = await this._apiService.getDifficulties(this.exercise.id);
      if (response.status === 200) this.difficulties = response.data;
    },

    _loadHistory() {
      const loaded = this._historyService.loadFromStorage();
      if (loaded) {
        this.hasResultsFlag = this._historyService.hasFrames();
      }
    },

    // ─── Controles de video ──────────────────────────────────────────────────

    togglePlayPause() {
      const video = this.$refs.video;
      if (!video) return;
      video.paused ? video.play() : video.pause();
    },

    toggleFullScreen() {
      const elem = this.$refs.videoContainer;
      if (!elem) return;
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => console.error('Error pantalla completa:', err));
      } else {
        document.exitFullscreen();
      }
    },

    calculateInitialProgress() {
      const video = this.$refs.video;
      if (video && video.duration) {
        this.analysisProgress = this._historyService.calculateProgress(video.duration);
      }
    },

    // ─── Loop de detección de pose ───────────────────────────────────────────

    startDetection() {
      const video  = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas) return;

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      this._poseService.createDrawingUtils(canvas.getContext('2d'));

      const processFrame = async (now, metadata) => {
        if (!video || video.paused || video.ended) return;
        try {
          const timestamp = metadata ? metadata.mediaTime * 1000 : performance.now();
          await this._poseService.detectForVideo(
            video, canvas, timestamp, this.tracked_points, this._onPoseDetected
          );
        } catch (e) {
          console.error('Error en renderLoop:', e);
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

    // ─── Callback de resultados de pose ──────────────────────────────────────

    _onPoseDetected(currentAngles, currentCoords) {
      const video = this.$refs.video;
      const currentTime = video ? video.currentTime : 0;

      // Actualizar min/max observados
      for (const codename in currentAngles) {
        const angle = currentAngles[codename];
        if (this._observedResults?.[codename]) {
          if (angle < this._observedResults[codename].min) this._observedResults[codename].min = angle;
          if (angle > this._observedResults[codename].max) this._observedResults[codename].max = angle;
        }
      }

      // Delegar al servicio de historial
      const { progress, isFirstResult } = this._historyService.addFrame(
        currentTime, currentAngles, currentCoords, video?.duration
      );

      if (isFirstResult) this.hasResultsFlag = true;
      if (this.analysisProgress !== progress) this.analysisProgress = progress;

      // Persistir periódicamente
      const now = Date.now();
      if (now - (this._lastSaveTime || 0) > 3000) {
        this._historyService.saveToStorage();
        this._lastSaveTime = now;
      }

      // Actualizar gráficas en vivo
      if (this.showCharts && now - (this._lastChartUpdate || 0) > 500) {
        const stats = this._chartService.refreshCharts(
          this.tracked_points, this._historyService.getHistoryArray(), this.chartType
        );
        this.chartStats = { ...this.chartStats, ...stats };
        this._lastChartUpdate = now;
      }
    },

    // ─── Gráficas ────────────────────────────────────────────────────────────

    generateCharts() {
      this.showCharts = true;
      this.$nextTick(() => {
        this.chartStats = this._chartService.buildCharts(
          this.tracked_points, this._historyService.getHistoryArray(), this.chartType
        );
      });
    },

    // ─── Exportaciones ───────────────────────────────────────────────────────

    exportToCSV() {
      ExerciseExportService.exportTrackedCSV(
        this._historyService.getHistoryArray(), this.tracked_points, this.exercise.name
      );
    },

    exportRawCSV() {
      ExerciseExportService.exportRawCSV(
        this._historyService.getHistoryArray(), this.exercise.name
      );
    },

    downloadMovementJSON() {
      ExerciseExportService.exportMovementJSON(
        this.exercise, this.$refs.video?.duration, this._historyService.getHistoryArray()
      );
    },

    // ─── Envío de resultados ─────────────────────────────────────────────────

    async sendResults() {
      if (!this._observedResults) return;
      try {
        const response = await this._apiService.sendResults(this.exercise.id, this._observedResults);
        if (response.status === 200 || response.status === 201) {
          alert('Resultados enviados correctamente');
        }
      } catch (error) {
        console.error('Error enviando resultados:', error);
      }
    },
  },

  data() {
    return {
      exercise: {},
      tracked_points: [],
      difficulties: [],
      hasResultsFlag: false,
      showCharts: false,
      chartStats: {},
      analysisProgress: 0,
      chartType: 'posicion',
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