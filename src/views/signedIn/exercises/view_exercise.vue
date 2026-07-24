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
          
          <ExerciseVideoPlayer
            v-if="exercise.video"
            :videoSrc="exercise.video"
            :trackedPoints="tracked_points"
            v-model:angleMode="angleMode"
            @metadata-loaded="calculateInitialProgress"
          />
          
          <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; margin-top: 15px; overflow: hidden; border: 1px solid #555;">
            <div :style="'height: 100%; background: #4BC0C0; transition: width 0.2s ease-out; width: ' + analysisProgress + '%;'"></div>
          </div>
          <p class="light-font dark-text" style="text-align: right; font-size: 0.85em; margin-top: 5px; margin-bottom: 0;">Progreso del análisis: {{ analysisProgress }}%</p>

          <ExerciseAnalysisPanel
            :analysisState="analysisState"
            :isEngineReady="isEngineReady"
            :analysisProgress="analysisProgress"
            :targetFps="targetFps"
            :nativeVideoFps="nativeVideoFps"
            :hasResultsFlag="hasResultsFlag"
            @update:targetFps="targetFps = $event"
            @start="startAnalysis"
            @pause="pauseAnalysis"
            @discard="discardAnalysis"
          />

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
          
          <ExerciseCharts
            v-show="showCharts"
            :trackedPoints="tracked_points"
            :chartStats="chartStats"
            v-model:chartType="chartType"
            @refresh="generateCharts"
          />
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
        <button class="btn btn-dark" v-on:click="sendResults" :disabled="!hasResultsFlag">
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
import { VideoAccount, RunFast, Upload, Download, ChartLine, Cube, FileExcel } from 'mdue';
import { Chart, registerables } from 'chart.js';
import ExerciseApiService      from '@/services/exerciseApiService';
import MovementHistoryService  from '@/services/movementHistoryService';
import ExerciseExportService   from '@/services/exerciseExportService';
import ExerciseChartService       from '@/services/exerciseChartService';
import BackgroundAnalysisService  from '@/services/backgroundAnalysisService';

import ExerciseVideoPlayer from '@/components/exercises/ExerciseVideoPlayer.vue';
import ExerciseAnalysisPanel from '@/components/exercises/ExerciseAnalysisPanel.vue';
import ExerciseCharts from '@/components/exercises/ExerciseCharts.vue';

Chart.register(...registerables);

export default {
  name: 'ViewExercise',
  components: { 
    VideoAccount, RunFast, Upload, Download, ChartLine, Cube, FileExcel,
    ExerciseVideoPlayer, ExerciseAnalysisPanel, ExerciseCharts
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
      analysisState: 'idle',
      angleMode: '3d',
      targetFps: 30,
      isEngineReady: false,
      nativeVideoFps: 30,
      videoDuration: 0, // Keep track of duration received from player
    };
  },
  async beforeMount() {
    this._apiService     = new ExerciseApiService();
    this._chartService   = new ExerciseChartService();

    const routeId = this.$route.params.exercise_id;
    if (routeId) {
      await this._initializeAnalysisState(routeId);
    }

    try {
      await this._loadExercise();
    } catch (e) {
      console.error('Error cargando ejercicio:', e);
    }
  },
  mounted() {
    window.addEventListener('beforeunload', this._onBeforeUnload);
  },
  async beforeUnmount() {
    window.removeEventListener('beforeunload', this._onBeforeUnload);
    await this._historyService?.saveToStorage();
    this._chartService.destroyAll();
    this._backgroundService?.detachCallbacks();
  },
  watch: {
    async targetFps(newVal) {
      if (this._historyService) {
        this._historyService.targetFps = newVal;
        await this._historyService.saveToStorage();
      }
    },
    angleMode(newVal) {
      if (this._backgroundService) {
        this._backgroundService.setAngleMode(newVal);
      }
    }
  },
  methods: {
    async _onBeforeUnload() {
      await this._historyService?.saveToStorage();
    },

    async _initializeAnalysisState(exerciseId) {
      if (!exerciseId) return;
      if (this._historyService && String(this._historyService.exerciseId) === String(exerciseId)) {
        return;
      }

      this._historyService = new MovementHistoryService(exerciseId);
      await this._loadHistory();

      this._backgroundService = BackgroundAnalysisService;
      this._backgroundService.setAngleMode(this.angleMode);
      this.isEngineReady = this._backgroundService.isReady();
      if (this._backgroundService.isRunningFor(exerciseId)) {
        this._backgroundService.attachCallbacks({
          onFrame:    (t, angles, coords) => this._onBackgroundFrame(t, angles, coords),
          onProgress: (currentTime, duration) => {
            const p = this._historyService.calculateProgress(duration);
            if (this.analysisProgress !== p) this.analysisProgress = p;
          },
          onComplete: async () => {
            this._historyService.isComplete = true;
            await this._historyService.saveToStorage();
            this.analysisProgress = 100;
            this.analysisState = 'complete';
            this.hasResultsFlag = this._historyService.hasFrames();
            this.isEngineReady = false;
          },
          onError: () => {
            this.analysisState = 'idle';
            this.isEngineReady = false;
          },
        });
        this.analysisState = this._backgroundService.getState();

        const { duration } = this._backgroundService.getProgress();
        if (duration > 0) {
          this.analysisProgress = this._historyService.calculateProgress(duration);
        }
      } else {
        const activeState = this._backgroundService.getState();
        const activeId = this._backgroundService.getExerciseId();
        if (String(activeId) === String(exerciseId)) {
          this.analysisState = activeState;
        } else {
          if (this.hasResultsFlag) {
            this.analysisState = this.analysisProgress === 100 ? 'complete' : 'paused';
          } else {
            this.analysisState = 'idle';
          }
        }
      }
    },

    async _loadExercise() {
      const response = await this._apiService.getExercise(this.$route.params.exercise_id);
      if (response.status !== 404) {
        this.exercise = response.data;
        if (this.exercise.id) {
          await this._initializeAnalysisState(this.exercise.id);
        }
        const ready = this.exercise.status === 'Video procesado' || this.exercise.status === 'Video en procesamiento';
        if (ready) {
          await this._loadTrackedPoints();
          await this._loadDifficulties();
          if (this.exercise.video) {
            this.detectVideoFpsSilently(this.exercise.video).then(detectedFps => {
              this.nativeVideoFps = detectedFps;
              if (this.targetFps > detectedFps) {
                this.targetFps = detectedFps;
              }
            });
          }
        }
      }
    },

    detectVideoFpsSilently(videoSrc) {
      return new Promise((resolve) => {
        const tempVideo = document.createElement('video');
        tempVideo.src = videoSrc;
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;pointer-events:none;opacity:0.01;z-index:-9999';
        document.body.appendChild(tempVideo);
        
        let samples = 0;
        let minDelta = 0.05;
        let lastTime = undefined;
        let resolved = false;

        const cleanup = () => {
          tempVideo.pause();
          tempVideo.src = '';
          tempVideo.load();
          if (document.body.contains(tempVideo)) {
            document.body.removeChild(tempVideo);
          }
        };

        const cb = (now, metadata) => {
          if (resolved) return;
          const currentTime = tempVideo.currentTime;
          const mediaTime = (metadata && typeof metadata.mediaTime === 'number') ? metadata.mediaTime : currentTime;
          
          if (lastTime !== undefined) {
            const delta = mediaTime - lastTime;
            if (delta > 0.008 && delta < 0.12) {
              minDelta = Math.min(minDelta, delta);
              samples++;
              if (samples >= 15) {
                resolved = true;
                cleanup();
                const rawFps = 1 / minDelta;
                let finalFps = 30;
                if (rawFps >= 55) finalFps = 60;
                else if (rawFps >= 45) finalFps = 50;
                else if (rawFps >= 27) finalFps = 30;
                else if (rawFps >= 23) finalFps = 25;
                else finalFps = 24;
                resolve(finalFps);
                return;
              }
            }
          }
          lastTime = mediaTime;
          if (tempVideo.requestVideoFrameCallback) {
            tempVideo.requestVideoFrameCallback(cb);
          } else {
            setTimeout(() => cb(null, null), 16);
          }
        };

        tempVideo.addEventListener('loadeddata', () => {
          if (tempVideo.requestVideoFrameCallback) {
            tempVideo.requestVideoFrameCallback(cb);
          } else {
            setTimeout(() => cb(null, null), 16);
          }
          tempVideo.play().catch(() => { cleanup(); resolve(30); });
        });

        tempVideo.addEventListener('error', () => { cleanup(); resolve(30); });
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(30);
          }
        }, 3000);
      });
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

    async _loadHistory() {
      const loaded = await this._historyService.loadFromStorage();
      if (loaded) {
        this.hasResultsFlag = this._historyService.hasFrames();
        if (this._historyService.targetFps !== undefined) {
          this.targetFps = this._historyService.targetFps;
        }
        await this.calculateInitialProgress();
      }
    },

    async calculateInitialProgress(duration) {
      if (duration && !isNaN(duration) && duration > 0) {
        this.videoDuration = duration;
        const oldDuration = this._historyService.videoDuration;
        this._historyService.videoDuration = duration;
        if (oldDuration !== duration) {
          await this._historyService.saveToStorage();
        }
      }

      const dur = this.videoDuration || this._historyService.videoDuration;

      if (dur) {
        this.analysisProgress = this._historyService.calculateProgress(dur);
        if (!['running', 'initializing'].includes(this.analysisState)) {
          if (this.hasResultsFlag) {
            this.analysisState = this.analysisProgress === 100 ? 'complete' : 'paused';
          } else {
            this.analysisState = 'idle';
          }
        }
      }
    },

    async startAnalysis() {
      if (
        this.analysisState === 'paused' &&
        this._backgroundService.getExerciseId() === this.exercise.id &&
        this._backgroundService.getState() === 'paused' &&
        this._backgroundService.isReady()
      ) {
        this.analysisState = 'running';
        this._backgroundService.resume();
        this.isEngineReady = true;
        return;
      }

      this.analysisState = 'initializing';
      this.isEngineReady = false;
      try {
        await this._backgroundService.initialize(this.exercise.id);
        this.isEngineReady = true;
      } catch (e) {
        console.error('Error inicializando análisis en segundo plano:', e);
        this.analysisState = this.hasResultsFlag ? 'paused' : 'idle';
        this.isEngineReady = false;
        alert('No se pudo inicializar el motor de análisis. Intenta de nuevo.');
        return;
      }

      if (!this.exercise?.video) {
        this.analysisState = 'idle';
        return;
      }

      this.analysisState = 'running';
      const resumeTime = this._historyService.getLastAnalyzedTime();

      await this._backgroundService.start(
        this.exercise.video,
        this.tracked_points,
        this.exercise.id,
        {
          startTime:  resumeTime,
          targetFps:  this.targetFps,
          videoFps:   this.nativeVideoFps,
          onFrame:    (t, angles, coords) => this._onBackgroundFrame(t, angles, coords),
          onProgress: (currentTime, duration) => {
            const p = this._historyService.calculateProgress(duration);
            if (this.analysisProgress !== p) this.analysisProgress = p;
          },
          onComplete: async () => {
            this._historyService.isComplete = true;
            await this._historyService.saveToStorage();
            this.analysisProgress = 100;
            this.analysisState = 'complete';
            this.hasResultsFlag = this._historyService.hasFrames();
            this.isEngineReady = false;
          },
          onError: () => {
            this.analysisState = 'idle';
            this.isEngineReady = false;
          },
        }
      );
    },

    _onBackgroundFrame(currentTime, angles, coords) {
      for (const codename in angles) {
        if (this._observedResults?.[codename]) {
          const v = angles[codename];
          if (v < this._observedResults[codename].min) this._observedResults[codename].min = v;
          if (v > this._observedResults[codename].max) this._observedResults[codename].max = v;
        }
      }

      this._historyService.addFrame(currentTime, angles, coords, null);
      this.hasResultsFlag = this._historyService.hasFrames();

      const now = Date.now();
      if (now - (this._lastSaveTime || 0) > 3000) {
        this._historyService.saveToStorage();
        this._lastSaveTime = now;
      }

      if (this.showCharts && now - (this._lastChartUpdate || 0) > 500) {
        const stats = this._chartService.refreshCharts(
          this.tracked_points, this._historyService.getHistoryArray(), this.chartType
        );
        this.chartStats = { ...this.chartStats, ...stats };
        this._lastChartUpdate = now;
      }
    },

    async pauseAnalysis() {
      this.analysisState = 'paused';
      await this._backgroundService?.pause();
      await this._historyService.saveToStorage();
      this.hasResultsFlag = this._historyService.hasFrames();
    },

    async discardAnalysis() {
      if (!confirm('¿Seguro que quieres descartar el análisis? Se borrarán todos los frames recolectados.')) return;
      this._backgroundService?.discard();
      await this._historyService.reset();
      this._observedResults && this.tracked_points.forEach(p => {
        this._observedResults[p.codename] = { min: Infinity, max: -Infinity };
      });
      this.analysisState = 'idle';
      this.hasResultsFlag = false;
      this.analysisProgress = 0;
      this.showCharts = false;
      this.chartStats = {};
      this._chartService.destroyAll();
      this.isEngineReady = false;
    },

    generateCharts() {
      this.showCharts = true;
      this.$nextTick(() => {
        this.chartStats = this._chartService.buildCharts(
          this.tracked_points, this._historyService.getHistoryArray(), this.chartType
        );
      });
    },

    exportToCSV() {
      ExerciseExportService.exportTrackedCSV(
        this._historyService.getHistoryArray(), this.tracked_points, this.exercise.name, this.targetFps
      );
    },

    exportRawCSV() {
      ExerciseExportService.exportRawCSV(
        this._historyService.getHistoryArray(), this.exercise.name, this.targetFps
      );
    },

    downloadMovementJSON() {
      ExerciseExportService.exportMovementJSON(
        this.exercise, this.videoDuration, this._historyService.getHistoryArray(), this.targetFps
      );
    },

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
  }
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
</style>
