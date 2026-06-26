import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import MovementHistoryService from './movementHistoryService';

const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm';
const MODEL_PATH     = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * BackgroundAnalysisService
 *
 * Responsabilidad única: analizar un video completo en segundo plano a la
 * máxima velocidad posible, usando una instancia de MediaPipe y un elemento
 * <video> ocultos, completamente independientes del video que el usuario
 * controla para visualización.
 *
 * Ventajas frente al enfoque basado en reproducción manual:
 *  - Sin cortes temporales: procesa cada frame en orden, de inicio a fin.
 *  - Sin interferencia con la UI: el usuario puede ver/pausar el video principal
 *    mientras el análisis corre en paralelo.
 *  - Velocidad: playbackRate máximo (~8x) → un video de 4 min termina en ~30 s.
 */
class BackgroundAnalysisService {
  constructor() {
    this._poseLandmarker = null;
    this._video          = null;
    this._isRunning      = false;
    this._rafId          = undefined; // Handle para cancelar el frame callback pendiente
    this._trackedPoints  = [];

    // Callbacks
    this._onFrame    = null;
    this._onProgress = null;
    this._onComplete = null;
    this._onError    = null;
    this.angleMode   = "3d"; // "3d" | "2d"
  }

  setAngleMode(mode) {
    this.angleMode = mode;
  }

  // ─── Inicialización ────────────────────────────────────────────────────────

  /**
   * Carga el modelo de MediaPipe. Llamar una sola vez; la instancia se reutiliza
   * en análisis sucesivos.
   */
  async initialize(exerciseId) {
    if (this._poseLandmarker && exerciseId && this._exerciseId !== exerciseId) {
      console.log(`[BackgroundAnalysisService] Recreando PoseLandmarker porque cambió de ejercicio de ${this._exerciseId} a ${exerciseId}`);
      try { this._poseLandmarker.close(); } catch (_) { /* no-op */ }
      this._poseLandmarker = null;
    }
    if (this._poseLandmarker) return;
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
    this._poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }

  isReady() {
    return !!this._poseLandmarker;
  }

  // ─── Control del análisis ──────────────────────────────────────────────────

  /**
   * Arranca el análisis desde el inicio del video.
   *
   * @param {string} videoSrc     - URL del video a analizar
   * @param {Array}  trackedPoints - puntos rastreados del ejercicio
   * @param {object} callbacks    - { onFrame, onProgress, onComplete, onError }
   *   onFrame(currentTime, angles, coords) — llamado por cada frame detectado
   *   onProgress(currentTime, duration)    — para actualizar la barra de progreso
   *   onComplete()                         — cuando el video termina
   *   onError(err)                         — si hay un error irrecuperable
   */
  start(videoSrc, trackedPoints, exerciseId, { onFrame, onProgress, onComplete, onError, startTime = 0 } = {}) {
    this._cleanupPreviousVideo();
    if (!this._poseLandmarker) throw new Error('BackgroundAnalysisService no inicializado.');

    this._exerciseId    = exerciseId;
    this._historyService = new MovementHistoryService(exerciseId);
    this._historyService.loadFromStorage();

    this._trackedPoints = trackedPoints;
    this._onFrame       = onFrame;
    this._onProgress    = onProgress;
    this._onComplete    = onComplete;
    this._onError       = onError;
    this._isRunning     = true;
    this._lastTimestamp = undefined;
    this._lastSaveTime  = Date.now();

    this._video = this._createHiddenVideo();
    this._video.src = videoSrc;

    this._video.addEventListener('loadedmetadata', () => {
      const runWarmupAndPlay = () => {
        try {
          // Ejecutar una detección de calentamiento mientras el video está pausado
          // para evitar que el video avance a 8x antes de que MediaPipe esté listo.
          const initialTime = this._video.currentTime;
          const warmupTimestamp = Math.round((initialTime || 0) * 1000);
          console.log(`[BackgroundAnalysisService] Ejecutando frame de calentamiento en t = ${initialTime} s (timestamp: ${warmupTimestamp})`);
          this._poseLandmarker.detectForVideo(this._video, warmupTimestamp);
          this._lastTimestamp = warmupTimestamp;
        } catch (e) {
          console.warn('BackgroundAnalysisService: error en primer frame de calentamiento', e);
        }

        this._video.playbackRate = this._maxPlaybackRate();
        this._video.play()
          .then(() => this._scheduleNextFrame())
          .catch(err => {
            console.error('BackgroundAnalysisService: error al reproducir video oculto', err);
            this._onError?.(err);
          });
      };

      if (startTime > 0) {
        // Reanudar desde el último punto analizado en lugar de desde el inicio
        this._video.addEventListener('seeked', runWarmupAndPlay, { once: true });
        this._video.currentTime = startTime;
      } else {
        if (this._video.readyState >= 2) {
          runWarmupAndPlay();
        } else {
          this._video.addEventListener('loadeddata', runWarmupAndPlay, { once: true });
        }
      }
    }, { once: true });

    this._video.addEventListener('ended', () => {
      this._isRunning = false;
      if (this._historyService) {
        this._historyService.isComplete = true;
        this._historyService.saveToStorage();
      }
      if (this._poseLandmarker) {
        try { this._poseLandmarker.close(); } catch (_) { /* no-op */ }
        this._poseLandmarker = null;
      }
      this._onComplete?.();
    }, { once: true });

    this._video.load();
  }

  pause() {
    this._isRunning = false;
    this._video?.pause();
    this._historyService?.saveToStorage();
  }

  resume() {
    if (!this._video?.src) return;
    this._isRunning = true;
    this._video.play()
      .then(() => this._scheduleNextFrame())
      .catch(console.error);
  }

  /**
   * Cancela el análisis en curso y libera el video oculto.
   * La instancia de MediaPipe se conserva para reutilización en el próximo análisis.
   */
  discard() {
    this._isRunning = false;
    this._historyService?.reset();
    this._historyService = null;
    this._exerciseId = null;
    if (this._poseLandmarker) {
      try { this._poseLandmarker.close(); } catch (_) { /* no-op */ }
      this._poseLandmarker = null;
    }
    if (this._video) {
      // Cancelar el frame callback ya registrado antes de pausar el video,
      // para evitar que se llame a _processFrame con this._video = null.
      if (this._rafId !== undefined) {
        if (this._video.cancelVideoFrameCallback) {
          this._video.cancelVideoFrameCallback(this._rafId);
        } else {
          cancelAnimationFrame(this._rafId);
        }
        this._rafId = undefined;
      }
      this._video.pause();
      this._video.removeAttribute('src');
      this._video.load(); // Libera el recurso de red y decodificador de video
      if (document.body.contains(this._video)) document.body.removeChild(this._video);
      this._video = null;
    }
    this._onFrame = this._onProgress = this._onComplete = this._onError = null;
  }

  /**
   * Libera completamente todos los recursos (MediaPipe + video oculto).
   * Usar al destruir el componente.
   */
  destroy() {
    this.discard();
    if (this._poseLandmarker) {
      try { this._poseLandmarker.close(); } catch (_) { /* no-op */ }
      this._poseLandmarker = null;
    }
  }

  detachCallbacks() {
    this._onFrame    = null;
    this._onProgress = null;
    this._onComplete = null;
    this._onError    = null;
  }

  attachCallbacks({ onFrame, onProgress, onComplete, onError } = {}) {
    this._onFrame    = onFrame;
    this._onProgress = onProgress;
    this._onComplete = onComplete;
    this._onError    = onError;
  }

  isRunningFor(exerciseId) {
    return this._isRunning && this._exerciseId === exerciseId;
  }

  getExerciseId() {
    return this._exerciseId;
  }

  getState() {
    if (!this._video) return 'idle';
    if (this._isRunning) return 'running';
    if (this._video.paused) return 'paused';
    return 'idle';
  }

  getProgress() {
    if (!this._video) return { currentTime: 0, duration: 0 };
    return {
      currentTime: this._video.currentTime,
      duration: this._video.duration || 0,
    };
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  _cleanupPreviousVideo() {
    this._isRunning = false;
    if (this._video) {
      if (this._rafId !== undefined) {
        if (this._video.cancelVideoFrameCallback) {
          this._video.cancelVideoFrameCallback(this._rafId);
        } else {
          cancelAnimationFrame(this._rafId);
        }
        this._rafId = undefined;
      }
      try {
        this._video.pause();
        this._video.removeAttribute('src');
        this._video.load();
      } catch (_) { /* no-op */ }
      if (document.body.contains(this._video)) {
        document.body.removeChild(this._video);
      }
      this._video = null;
    }
  }

  _createHiddenVideo() {
    const v = document.createElement('video');
    v.muted       = true;
    v.crossOrigin = 'anonymous';
    // Fuera de la pantalla: no ocupa espacio, no es visible, no recibe eventos
    v.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:-9999px',
      'width:1px',
      'height:1px',
      'pointer-events:none',
      'opacity:0',
    ].join(';');
    document.body.appendChild(v);
    return v;
  }

  _maxPlaybackRate() {
    // La mayoría de navegadores soportan hasta 16x con requestVideoFrameCallback.
    // Usamos 8x como valor seguro para asegurar que MediaPipe tenga tiempo suficiente.
    return 8;
  }

  _scheduleNextFrame() {
    if (!this._isRunning || !this._video) return;

    if (this._video.requestVideoFrameCallback) {
      // Guardar el handle para poder cancelarlo en discard()
      this._rafId = this._video.requestVideoFrameCallback((_, metadata) => this._processFrame(metadata));
    } else {
      this._rafId = requestAnimationFrame(() => this._processFrame(null));
    }
  }

  _processFrame(metadata) {
    const video = this._video;
    if (!this._isRunning || !video || video.paused || video.ended) return;

    try {
      // Los timestamps deben ser monotónicamente crecientes por instancia.
      let timestamp = (metadata && typeof metadata.mediaTime === 'number' && !isNaN(metadata.mediaTime))
        ? metadata.mediaTime * 1000
        : video.currentTime * 1000;

      timestamp = Math.round(timestamp);
      if (isNaN(timestamp)) {
        timestamp = 0;
      }

      if (this._lastTimestamp !== undefined && timestamp <= this._lastTimestamp) {
        timestamp = this._lastTimestamp + 1;
      }
      this._lastTimestamp = timestamp;

      if (!this._poseLandmarker) {
        console.warn('BackgroundAnalysisService: PoseLandmarker no disponible en _processFrame.');
        return;
      }
      const result = this._poseLandmarker.detectForVideo(video, timestamp);

      if (result.landmarks?.length > 0) {
        const landmark = result.landmarks[0];

        // Coordenadas de los 33 landmarks (x, y, z, visibility)
        const allCoords = landmark.map(pt => [
          Number(pt.x.toFixed(4)),
          Number(pt.y.toFixed(4)),
          Number(pt.z.toFixed(4)),
          Number(pt.visibility.toFixed(4)),
        ]);

        const worldLandmark = result.worldLandmarks?.length > 0 ? result.worldLandmarks[0] : null;

        // Ángulos articulares de los puntos rastreados
        const currentAngles = {};
        for (const point of this._trackedPoints) {
          const main  = landmark[point.id];
          const left  = landmark[point.left_point];
          const right = landmark[point.right_point];
          if (main && left && right) {
            let angle;
            if (this.angleMode === '3d' && worldLandmark && worldLandmark[point.id] && worldLandmark[point.left_point] && worldLandmark[point.right_point]) {
              angle = this._calculate3DAngle(
                worldLandmark[point.left_point],
                worldLandmark[point.id],
                worldLandmark[point.right_point]
              );
            } else {
              angle = this._calculateAngle(left, main, right, video.videoWidth, video.videoHeight);
            }
            currentAngles[point.codename] = angle;
          }
        }

        // Registrar frame en historial en segundo plano
        this._historyService?.addFrame(video.currentTime, currentAngles, allCoords, video.duration);

        // Guardar en localStorage periódicamente
        const now = Date.now();
        if (now - (this._lastSaveTime || 0) > 3000) {
          this._historyService?.saveToStorage();
          this._lastSaveTime = now;
        }

        this._onFrame?.(video.currentTime, currentAngles, allCoords);
      }
    } catch (e) {
      console.error('BackgroundAnalysisService: error procesando frame', e);
    }

    if (video.duration) {
      this._onProgress?.(video.currentTime, video.duration);
    }

    this._scheduleNextFrame();
  }

  /**
   * Ángulo en el vértice p2 formado por los segmentos p1-p2 y p3-p2 (en grados).
   */
  _calculateAngle(p1, p2, p3, width = 1, height = 1) {
    const v1x = (p1.x - p2.x) * width, v1y = (p1.y - p2.y) * height;
    const v2x = (p3.x - p2.x) * width, v2y = (p3.y - p2.y) * height;
    const dot  = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (mag1 === 0 || mag2 === 0) return 0;
    // Clamp para evitar NaN por errores de punto flotante
    return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * (180 / Math.PI);
  }

  _calculate3DAngle(p1, p2, p3) {
    const v1x = p1.x - p2.x, v1y = p1.y - p2.y, v1z = p1.z - p2.z;
    const v2x = p3.x - p2.x, v2y = p3.y - p2.y, v2z = p3.z - p2.z;
    const dot  = v1x * v2x + v1y * v2y + v1z * v2z;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
    if (mag1 === 0 || mag2 === 0) return 0;
    return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * (180 / Math.PI);
  }
}

const backgroundAnalysisServiceInstance = new BackgroundAnalysisService();
export default backgroundAnalysisServiceInstance;
