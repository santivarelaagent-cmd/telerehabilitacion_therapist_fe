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
              @durationchange="calculateInitialProgress"
              @canplay="calculateInitialProgress"
              @play="startDetection"
              @pause="stopDetection"
              @ended="stopDetection"
              @seeked="detectSingleFrame"
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
            <button @click="toggleSkeleton" :class="['floating-skeleton-btn', { active: showSkeleton }]" :title="showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'">
              <Human />
            </button>
            <button @click="toggleAdjacents" :class="['floating-adjacents-btn', { active: showAdjacents }]" :title="showAdjacents ? 'Ocultar Conexiones' : 'Mostrar Conexiones'">
              <RunFast />
            </button>
            <button @click="toggleAngleMode" :class="['floating-mode-btn', { active: angleMode === '3d' }]" :title="angleMode === '3d' ? 'Cambiar a 2D Proyectado' : 'Cambiar a 3D Biomecánico'">
              <Cube />
            </button>

            <!-- Indicador de modo de cálculo de ángulos -->
            <div class="video-mode-indicator">
              <span>{{ angleMode === '3d' ? '3D Biomecánico (Sensores)' : '2D Proyectado (Pantallazo)' }}</span>
            </div>
          </div>
          
          <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; margin-top: 15px; overflow: hidden; border: 1px solid #555;">
            <div :style="'height: 100%; background: #4BC0C0; transition: width 0.2s ease-out; width: ' + analysisProgress + '%;'"></div>
          </div>
          <p class="light-font dark-text" style="text-align: right; font-size: 0.85em; margin-top: 5px; margin-bottom: 0;">Progreso del análisis: {{ analysisProgress }}%</p>

          <!-- ─── Panel de control de análisis ─────────────────────────────── -->
          <div class="analysis-panel">
            <div class="analysis-status-bar">
              <span :class="['analysis-badge', analysisState]">
                <span v-if="analysisState === 'running'">● Analizando en segundo plano...</span>
                <span v-else-if="analysisState === 'initializing'">⟳ Cargando motor de análisis...</span>
                <span v-else-if="analysisState === 'paused'">⏸ Análisis pausado</span>
                <span v-else-if="analysisState === 'complete'">✓ Análisis completado ({{ analysisProgress }}%)</span>
                <span v-else>○ Sin análisis activo</span>
              </span>
            </div>
            <div class="analysis-actions">
              <button
                class="btn analysis-btn btn-start"
                :disabled="['running', 'initializing', 'complete'].includes(analysisState)"
                @click="startAnalysis"
              >
                <PlayCircle class="action-icon" />
                <span>{{ analysisState === 'paused' ? 'Reanudar análisis' : 'Iniciar análisis' }}</span>
              </button>
              <button
                class="btn analysis-btn btn-pause"
                :disabled="analysisState !== 'running'"
                @click="pauseAnalysis"
              >
                <PauseCircle class="action-icon" />
                <span>Pausar análisis</span>
              </button>
              <button
                class="btn analysis-btn btn-discard"
                :disabled="analysisState === 'idle' && !hasResultsFlag"
                @click="discardAnalysis"
              >
                <DeleteForever class="action-icon" />
                <span>Descartar análisis</span>
              </button>
            </div>
          </div>

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
import { VideoAccount, RunFast, Upload, Download, Fullscreen, ChartLine, Cube, FileExcel, PlayCircle, PauseCircle, DeleteForever, Human } from 'mdue';
import { Chart, registerables } from 'chart.js';
import PoseLandmarkerService   from '@/services/poseLandmarkerService';
import ExerciseApiService      from '@/services/exerciseApiService';
import MovementHistoryService  from '@/services/movementHistoryService';
import ExerciseExportService   from '@/services/exerciseExportService';
import ExerciseChartService       from '@/services/exerciseChartService';
import BackgroundAnalysisService  from '@/services/backgroundAnalysisService';
Chart.register(...registerables);

export default {
  name: 'ViewExercise',

  components: { VideoAccount, RunFast, Upload, Download, Fullscreen, ChartLine, Cube, FileExcel, PlayCircle, PauseCircle, DeleteForever, Human },

  async beforeMount() {
    this._apiService     = new ExerciseApiService();
    this._poseService    = new PoseLandmarkerService();
    this._chartService   = new ExerciseChartService();
    this._poseService.setAngleMode(this.angleMode);

    // Intentar inicializar de inmediato si el ID está disponible en los parámetros de la ruta
    const routeId = this.$route.params.exercise_id;
    if (routeId) {
      this._initializeAnalysisState(routeId);
    }

    try {
      await this._loadExercise();
    } catch (e) {
      console.error('Error cargando ejercicio:', e);
    }

    // Inicializar detector de esqueleto de primer plano
    await this._poseService.initialize();
  },

  beforeUnmount() {
    // Detener el loop de visualización del video principal
    this._detectionActive = false;
    // Liberar instancia principal de MediaPipe (GPU)
    this._poseService?.destroy();
    // Liberar gráficas (Chart.js instances)
    this._chartService.destroyAll();
    // Detener callbacks del análisis en segundo plano para evitar fugas de memoria o errores
    this._backgroundService?.detachCallbacks();
  },

  computed: {
    hasResults() {
      return this.hasResultsFlag;
    },
  },

  methods: {
    // ─── Inicialización de estado y servicios ──────────────────────────────────

    _initializeAnalysisState(exerciseId) {
      if (!exerciseId) return;

      // Si ya está inicializado para el mismo ID, no hacer duplicación
      if (this._historyService && String(this._historyService.exerciseId) === String(exerciseId)) {
        return;
      }

      this._historyService = new MovementHistoryService(exerciseId);
      this._loadHistory();

      // Conectar con el análisis en segundo plano si ya está corriendo para este ejercicio
      this._backgroundService = BackgroundAnalysisService;
      this._backgroundService.setAngleMode(this.angleMode);
      if (this._backgroundService.isRunningFor(exerciseId)) {
        this._backgroundService.attachCallbacks({
          onFrame:    (t, angles, coords) => this._onBackgroundFrame(t, angles, coords),
          onProgress: (currentTime, duration) => {
            const p = this._historyService.calculateProgress(duration);
            if (this.analysisProgress !== p) this.analysisProgress = p;
          },
          onComplete: () => {
            this._historyService.isComplete = true;
            this._historyService.saveToStorage();
            this.analysisProgress = 100;
            this.analysisState = 'complete';
            this.hasResultsFlag = this._historyService.hasFrames();
          },
          onError: () => { this.analysisState = 'idle'; },
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

    // ─── Carga de datos ──────────────────────────────────────────────────────

    async _loadExercise() {
      const response = await this._apiService.getExercise(this.$route.params.exercise_id);
      if (response.status !== 404) {
        this.exercise = response.data;
        
        // Asegurar la inicialización correcta del estado con el ID real de la base de datos (por si hubo demora en la ruta)
        if (this.exercise.id) {
          this._initializeAnalysisState(this.exercise.id);
        }

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
        this.calculateInitialProgress();
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
      // Guardar el duration en el historial si está disponible en el elemento video
      if (video && video.duration && !isNaN(video.duration) && video.duration > 0) {
        const oldDuration = this._historyService.videoDuration;
        this._historyService.videoDuration = video.duration;
        // Guardar en storage si es la primera vez o si la duración cambió
        if (oldDuration !== video.duration) {
          this._historyService.saveToStorage();
        }
      }

      const duration = (video && video.duration && !isNaN(video.duration) && video.duration > 0)
        ? video.duration
        : this._historyService.videoDuration;

      if (duration) {
        this.analysisProgress = this._historyService.calculateProgress(duration);
        // Ajustar el estado del análisis basado en el progreso si no está corriendo/inicializando
        if (!['running', 'initializing'].includes(this.analysisState)) {
          if (this.hasResultsFlag) {
            this.analysisState = this.analysisProgress === 100 ? 'complete' : 'paused';
          } else {
            this.analysisState = 'idle';
          }
        }
      }
    },

    // ─── Loop de detección de pose ───────────────────────────────────────────

    startDetection() {
      if (!this.showSkeleton) return;
      const video  = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas) return;
      // Evitar loops duplicados si el usuario pausa y reanuda rápidamente
      if (this._detectionActive) return;

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      this._poseService.createDrawingUtils(canvas.getContext('2d'));
      this._detectionActive = true;

      const processFrame = async (now, metadata) => {
        // Se comprueba el flag antes Y después de cada await para cortar el loop
        // inmediatamente si el componente fue destruido durante la detección.
        if (!this._detectionActive || !video || video.paused || video.ended) {
          this._detectionActive = false;
          return;
        }
        try {
          const timestamp = performance.now();
          // null: solo visualización del esqueleto; los datos los recoge el análisis en segundo plano
          await this._poseService.detectForVideo(
            video, canvas, timestamp, this.tracked_points, null, this.showAdjacents
          );
        } catch (e) {
          console.error('Error en renderLoop:', e);
        }
        // Segunda comprobación post-await: el componente pudo haberse desmontado
        // durante la operación async de MediaPipe.
        if (!this._detectionActive) return;
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

    stopDetection() {
      // Poner el flag a false detiene el loop en la próxima iteración
      this._detectionActive = false;
    },

    detectSingleFrame() {
      if (!this.showSkeleton) return;
      const video = this.$refs.video;
      if (!video) return;
      if (video.paused) {
        this._runSingleFrameDetection();
      } else {
        // Si se buscó mientras se reproducía, asegurar que el loop de renderizado esté activo
        this.startDetection();
      }
    },

    async _runSingleFrameDetection() {
      const video  = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas || !this._poseService) return;
      try {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        this._poseService.createDrawingUtils(canvas.getContext('2d'));
        await this._poseService.detectForVideo(
          video, canvas, performance.now(), this.tracked_points, null, this.showAdjacents
        );
      } catch (e) {
        console.error('Error en _runSingleFrameDetection:', e);
      }
    },

    toggleSkeleton() {
      this.showSkeleton = !this.showSkeleton;
      const canvas = this.$refs.canvas;
      const video  = this.$refs.video;

      if (!this.showSkeleton) {
        this.stopDetection();
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        if (video) {
          if (!video.paused && !video.ended) {
            this.startDetection();
          } else {
            this.detectSingleFrame();
          }
        }
      }
    },

    toggleAdjacents() {
      this.showAdjacents = !this.showAdjacents;
      if (this.showAdjacents && !this.showSkeleton) {
        this.showSkeleton = true;
      }
      const video = this.$refs.video;
      if (video) {
        if (!video.paused && !video.ended) {
          if (!this._detectionActive) {
            this.startDetection();
          }
        } else {
          this.detectSingleFrame();
        }
      }
    },

    toggleAngleMode() {
      this.angleMode = this.angleMode === '3d' ? '2d' : '3d';
      this._poseService.setAngleMode(this.angleMode);
      BackgroundAnalysisService.setAngleMode(this.angleMode);
      const video = this.$refs.video;
      if (video) {
        if (!video.paused && !video.ended) {
          if (!this._detectionActive) {
            this.startDetection();
          }
        } else {
          this.detectSingleFrame();
        }
      }
    },

    // ─── Control de análisis (segundo plano) ─────────────────────────────────

    /**
     * Inicia o reanuda el análisis en segundo plano.
     * La primera vez inicializa BackgroundAnalysisService (carga MediaPipe).
     * Las veces siguientes reutiliza la instancia ya cargada.
     */
    async startAnalysis() {
      // Solo usar resume() si la instancia del servicio en segundo plano realmente
      // tiene el video cargado para este ejercicio y está pausada.
      if (
        this.analysisState === 'paused' &&
        this._backgroundService.getExerciseId() === this.exercise.id &&
        this._backgroundService.getState() === 'paused'
      ) {
        this.analysisState = 'running';
        this._backgroundService.resume();
        return;
      }

      // Inicialización lazy: solo la primera vez o tras refresco
      this.analysisState = 'initializing';
      try {
        await this._backgroundService.initialize(this.exercise.id);
      } catch (e) {
        console.error('Error inicializando análisis en segundo plano:', e);
        this.analysisState = this.hasResultsFlag ? 'paused' : 'idle';
        alert('No se pudo inicializar el motor de análisis. Intenta de nuevo.');
        return;
      }

      if (!this.exercise?.video) {
        console.error('No hay URL de video disponible para analizar.');
        this.analysisState = 'idle';
        return;
      }

      this.analysisState = 'running';

      // Si ya hay frames guardados (p.ej. tras un F5), reanudar desde el último
      // punto analizado en lugar de volver a empezar desde 0.
      const resumeTime = this._historyService.getLastAnalyzedTime();

      this._backgroundService.start(
        this.exercise.video,
        this.tracked_points,
        this.exercise.id,
        {
          startTime:  resumeTime,
          onFrame:    (t, angles, coords) => this._onBackgroundFrame(t, angles, coords),
          onProgress: (currentTime, duration) => {
            const p = this._historyService.calculateProgress(duration);
            if (this.analysisProgress !== p) this.analysisProgress = p;
          },
          onComplete: () => {
            this._historyService.isComplete = true;
            this._historyService.saveToStorage();
            this.analysisProgress = 100;
            this.analysisState = 'complete';
            this.hasResultsFlag = this._historyService.hasFrames();
          },
          onError: () => { this.analysisState = 'idle'; },
        }
      );
    },

    /**
     * Callback invocado por BackgroundAnalysisService en cada frame analizado.
     * Actualiza el historial, los resultados observados y las gráficas en vivo.
     */
    _onBackgroundFrame(currentTime, angles, coords) {
      // Actualizar min/max observados (tabla de ángulos)
      for (const codename in angles) {
        if (this._observedResults?.[codename]) {
          const v = angles[codename];
          if (v < this._observedResults[codename].min) this._observedResults[codename].min = v;
          if (v > this._observedResults[codename].max) this._observedResults[codename].max = v;
        }
      }

      // Registrar frame en historial
      this._historyService.addFrame(currentTime, angles, coords, null);
      this.hasResultsFlag = this._historyService.hasFrames();

      // Persistir periódicamente
      const now = Date.now();
      if (now - (this._lastSaveTime || 0) > 3000) {
        this._historyService.saveToStorage();
        this._lastSaveTime = now;
      }

      // Refrescar gráficas en vivo si están visibles
      if (this.showCharts && now - (this._lastChartUpdate || 0) > 500) {
        const stats = this._chartService.refreshCharts(
          this.tracked_points, this._historyService.getHistoryArray(), this.chartType
        );
        this.chartStats = { ...this.chartStats, ...stats };
        this._lastChartUpdate = now;
      }
    },

    pauseAnalysis() {
      this.analysisState = 'paused';
      this._backgroundService?.pause();
      this._historyService.saveToStorage();
      this.hasResultsFlag = this._historyService.hasFrames();
    },

    discardAnalysis() {
      if (!confirm('¿Seguro que quieres descartar el análisis? Se borrarán todos los frames recolectados.')) return;
      // Detiene el video oculto pero conserva la instancia de MediaPipe
      this._backgroundService?.discard();
      this._historyService.reset();
      this._observedResults && this.tracked_points.forEach(p => {
        this._observedResults[p.codename] = { min: Infinity, max: -Infinity };
      });
      this.analysisState = 'idle';
      this.hasResultsFlag = false;
      this.analysisProgress = 0;
      this.showCharts = false;
      this.chartStats = {};
      this._chartService.destroyAll();
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
      /** 'idle' | 'running' | 'paused' */
      analysisState: 'idle',
      showSkeleton: true,
      showAdjacents: false,
      angleMode: '3d',
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

.floating-skeleton-btn {
  position: absolute;
  top: 70px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(75, 192, 192, 0.8);
    color: white;
    
    &:hover {
      background-color: rgba(75, 192, 192, 1);
    }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg {
    font-size: 30px;
  }
}

.floating-adjacents-btn {
  position: absolute;
  top: 120px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(59, 130, 246, 0.8);
    color: white;
    
    &:hover {
      background-color: rgba(59, 130, 246, 1);
    }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg {
    font-size: 30px;
  }
}

.floating-mode-btn {
  position: absolute;
  top: 170px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(16, 185, 129, 0.8); /* Verde como el punto central */
    color: white;
    
    &:hover {
      background-color: rgba(16, 185, 129, 1);
    }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg {
    font-size: 30px;
  }
}

.video-mode-indicator {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  font-family: 'Outfit', sans-serif;
  letter-spacing: 0.02em;
}
</style>