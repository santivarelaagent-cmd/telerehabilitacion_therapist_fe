// MovementHistoryService is now injected from the caller (view_exercise) to avoid duplicate instances
import GeometryUtils from '../utils/geometryUtils';
import mediaPipeProvider from './mediaPipeProvider';

/**
 * BackgroundAnalysisService
 *
 * Responsabilidad única: analizar un video completo en segundo plano,
 * usando una instancia de MediaPipe y un elemento <video> ocultos,
 * completamente independientes del video que el usuario controla.
 *
 * Estrategia: SEEK FRAME-A-FRAME
 *  - El video se mantiene pausado en todo momento.
 *  - Se hace seek a cada posición de frame (t += 1/fps) y se espera el
 *    evento 'seeked' antes de correr MediaPipe.
 *  - Esto GARANTIZA que cada frame se procesa: el decodificador nunca
 *    puede saltar frames porque el video está pausado.
 *  - Velocidad limitada por: tiempo de seek (~5ms) + MediaPipe (~25ms).
 *    Un video de 11s a 30 FPS (~330 frames) tarda ~10s en analizarse.
 */
class BackgroundAnalysisService {
  constructor() {
    this._poseLandmarker = null;
    this._video          = null;
    this._isRunning      = false;
    this._rafId          = undefined; // Handle para cancelar el frame callback pendiente
    this._trackedPoints  = [];
    this._workerTimer    = null;
    this._lastYieldTime  = 0;

    // MessageChannel para ceder el hilo principal sin ser ralentizado en pestañas ocultas.
    // Chrome fuerza setTimeout a mínimo 1 segundo en background, pero MessageChannel no tiene esa restricción.
    this._yieldChannel = new MessageChannel();
    this._yieldChannel.port1.onmessage = () => {
      if (this._isRunning) this._seekToNextFrame();
    };

    // Callbacks
    this._onFrame    = null;
    this._onProgress = null;
    this._onComplete = null;
    this._onError    = null;
    this.angleMode   = "3d"; // "3d" | "2d"

    if (typeof window !== 'undefined' && window.document) {
      document.addEventListener('visibilitychange', () => {
        if (this._isRunning) {
          if (document.visibilityState === 'visible') {
            this._stopWorkerTimer();
            // Si hay un seek pendiente que no se procesó en segundo plano, reintentar
            if (this._seekPending) {
              this._seekPending = false;
              this._seekToNextFrame();
            }
          } else {
            this._startWorkerTimer();
          }
        }
      });
    }
  }

  /**
   * Cede el hilo al event loop usando MessageChannel (no throttled en pestañas ocultas).
   */
  _scheduleNextFrame() {
    this._yieldChannel.port2.postMessage(null);
  }

  setAngleMode(mode) {
    this.angleMode = mode;
  }

  async initialize(exerciseId, modelType = 'lite') {
    if (exerciseId && this._exerciseId !== exerciseId) {
      console.log(`[BackgroundAnalysisService] Nuevo ejercicio detectado: de ${this._exerciseId} a ${exerciseId}`);
      this._poseLandmarker = null;
    }
    
    // Si queremos un modelo distinto al cargado (o no hay ninguno), pedimos la instancia
    this._poseLandmarker = await mediaPipeProvider.getInstance('VIDEO', modelType);
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
  async start(videoSrc, trackedPoints, exerciseId, { onFrame, onProgress, onComplete, onError, startTime = 0, targetFps = 30, videoFps = 30, historyService = null } = {}) {
    this._cleanupPreviousVideo();
    if (!this._poseLandmarker) throw new Error('BackgroundAnalysisService no inicializado.');

    this._exerciseId    = exerciseId;
    // Usar la instancia compartida de MovementHistoryService en lugar de crear una propia
    this._historyService = historyService;

    this._trackedPoints = trackedPoints;
    this._onFrame       = onFrame;
    this._onProgress    = onProgress;
    this._onComplete    = onComplete;
    this._onError       = onError;
    this._isRunning     = true;
    this._lastTimestamp = undefined;
    this._lastSaveTime  = Date.now();
    this._targetFps     = targetFps || 0;
    this._detectedVideoFps = videoFps || 30;
    this._avgProcessingTimeMs = 25;

    // Calcular el paso de tiempo entre frames a analizar
    const effectiveFps = this._targetFps > 0
      ? Math.min(this._targetFps, this._detectedVideoFps)
      : this._detectedVideoFps;
    this._seekStep = 1 / effectiveFps;

    // Posición inicial del seek
    this._nextSeekTime = startTime > 0 ? startTime : 0;

    this._video = this._createHiddenVideo();
    this._video.src = videoSrc;

    this._video.addEventListener('loadedmetadata', () => {
      if (!this._video || !this._isRunning) return;
      this._videoDuration = this._video.duration;

      const runWarmupAndSeekLoop = () => {
        if (!this._video || !this._isRunning) return;
        try {
          // Frame de calentamiento para inicializar la GPU de MediaPipe
          let warmupTimestamp = performance.now();
          if (this._lastTimestamp !== undefined && warmupTimestamp <= this._lastTimestamp) {
            warmupTimestamp = this._lastTimestamp + 1;
          }
          this._lastTimestamp = warmupTimestamp;
          console.log(`[BackgroundAnalysisService] Frame de calentamiento en t=${this._video.currentTime.toFixed(3)}s`);
          this._poseLandmarker.detectForVideo(this._video, warmupTimestamp);
        } catch (e) {
          console.warn('BackgroundAnalysisService: error en frame de calentamiento', e);
          import('./mediaPipeProvider').then(({ default: provider }) => {
            provider.destroy();
          });
          this._finishAnalysis();
          return;
        }

        console.log(`[BackgroundAnalysisService] Iniciando análisis seek-frame-a-frame: FPS efectivo=${effectiveFps}, paso=${this._seekStep.toFixed(4)}s, inicio=${this._nextSeekTime.toFixed(3)}s, duración=${this._videoDuration.toFixed(2)}s`);
        // Iniciar el loop de seek frame-a-frame
        this._seekToNextFrame();
      };

      if (startTime > 0) {
        this._video.addEventListener('seeked', runWarmupAndSeekLoop, { once: true });
        this._video.currentTime = startTime;
      } else {
        if (this._video.readyState >= 2) {
          runWarmupAndSeekLoop();
        } else {
          this._video.addEventListener('loadeddata', runWarmupAndSeekLoop, { once: true });
        }
      }
    }, { once: true });

    this._video.load();

    this._onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        this._startWorkerTimer();
        // Si no hay seek pendiente, podríamos estar esperando un rAF. Forzamos el siguiente frame.
        if (this._isRunning && !this._seekPending) {
          this._seekToNextFrame();
        }
      } else {
        this._stopWorkerTimer();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
  }

  async pause() {
    this._isRunning = false;
    this._stopWorkerTimer();
    this._video?.pause();
    await this._historyService?.saveToStorage();
  }

  resume() {
    if (!this._video?.src) return;
    this._isRunning = true;
    // Reanudar el loop de seek desde donde se quedó
    this._seekToNextFrame();
  }

  /**
   * Cancela el análisis en curso y libera el video oculto.
   * La instancia de MediaPipe se conserva para reutilización en el próximo análisis.
   */
  discard() {
    this._isRunning = false;
    this._stopWorkerTimer();
    this._historyService?.reset();
    this._historyService = null;
    this._exerciseId = null;
    if (this._poseLandmarker) {
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
    if (typeof document !== 'undefined' && this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = null;
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
    this._stopWorkerTimer();
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
    // Dentro del viewport (visible para el navegador → decodificación HW activa)
    // pero imperceptible para el usuario (4px, casi transparente, detrás de todo).
    v.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:4px',
      'height:4px',
      'pointer-events:none',
      'opacity:0.01',
      'z-index:-9999',
    ].join(';');
    document.body.appendChild(v);
    return v;
  }

  _maxPlaybackRate() {
    return 1; // No se usa en modo seek, pero se mantiene por compatibilidad
  }

  _startWorkerTimer() {
    if (this._workerTimer) return;
    console.log('[BackgroundAnalysisService] Pestaña oculta. Activando temporizador en Web Worker para análisis continuo.');
    const workerCode = `
      let timerId = null;
      self.onmessage = function(e) {
        if (e.data.action === 'start') {
          if (timerId) clearInterval(timerId);
          timerId = setInterval(() => {
            self.postMessage('tick');
          }, 10);
        } else if (e.data.action === 'stop') {
          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this._workerTimer = new Worker(url);
    this._workerTimer.onmessage = () => {
      if (this._isRunning && this._video && this._seekPending) {
        // En pestaña oculta, el evento 'seeked' puede no dispararse.
        // Usamos el worker para forzar el procesamiento.
        this._seekPending = false;
        this._processSeekFrame();
      }
    };
    this._workerTimer.postMessage({ action: 'start' });
    URL.revokeObjectURL(url);
  }

  _stopWorkerTimer() {
    if (!this._workerTimer) return;
    console.log('[BackgroundAnalysisService] Pestaña visible. Deteniendo temporizador de Web Worker.');
    this._workerTimer.postMessage({ action: 'stop' });
    this._workerTimer.terminate();
    this._workerTimer = null;
  }

  // ─── Motor de análisis: Seek frame-a-frame ─────────────────────────────────
  //
  // Estrategia: el video se mantiene PAUSADO en todo momento.
  // 1. Se hace seek a la posición del siguiente frame (video.currentTime = t)
  // 2. Se espera el evento 'seeked' (el decodificador ha cargado el frame)
  // 3. Se corre MediaPipe detectForVideo sobre el frame pausado
  // 4. Se avanza _nextSeekTime += _seekStep
  // 5. Se repite hasta llegar al final del video
  //
  // Esto GARANTIZA que cada frame se procesa, porque el decodificador nunca
  // puede saltar frames — el video está pausado.

  /**
   * Avanza al siguiente frame haciendo seek en el video pausado.
   * Si hemos superado la duración, finaliza el análisis.
   */
  _seekToNextFrame() {
    const video = this._video;
    if (!this._isRunning || !video) return;

    const duration = this._videoDuration || video.duration;

    // ¿Hemos terminado?
    if (this._nextSeekTime >= duration) {
      this._finishAnalysis();
      return;
    }

    this._seekPending = true;

    // Activar Web Worker si la pestaña está oculta (el evento 'seeked' puede retrasarse)
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this._startWorkerTimer();
    }

    // Registrar el listener para cuando el seek complete
    video.addEventListener('seeked', () => {
      this._seekPending = false;
      this._processSeekFrame();
    }, { once: true });

    // Ejecutar el seek
    video.currentTime = this._nextSeekTime;
  }

  /**
   * Procesa el frame actual (video pausado en la posición correcta)
   * y luego avanza al siguiente.
   */
  _processSeekFrame() {
    const video = this._video;
    if (!this._isRunning || !video) return;

    try {
      const currentTime = video.currentTime;

      // Si estamos en modo VIDEO, necesitamos un timestamp monotónicamente creciente real
      // performance.now() asegura que nunca enviaremos un timestamp menor al anterior.
      let timestamp = performance.now();
      if (this._lastTimestamp !== undefined && timestamp <= this._lastTimestamp) {
        timestamp = this._lastTimestamp + 1;
      }
      this._lastTimestamp = timestamp;

      if (!this._poseLandmarker) {
        console.warn('BackgroundAnalysisService: PoseLandmarker no disponible en _processSeekFrame.');
        return;
      }

      const startDetect = performance.now();
      let result;
      if (mediaPipeProvider.runningMode === 'VIDEO') {
        result = this._poseLandmarker.detectForVideo(video, timestamp);
      } else {
        result = this._poseLandmarker.detect(video);
      }
      const detectDuration = performance.now() - startDetect;

      // Actualizar promedio de tiempo de detección (para estadísticas)
      if (this._avgProcessingTimeMs === undefined) {
        this._avgProcessingTimeMs = detectDuration;
      } else {
        this._avgProcessingTimeMs = this._avgProcessingTimeMs * 0.9 + detectDuration * 0.1;
      }

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
              angle = GeometryUtils.calculate3DAngle(
                worldLandmark[point.left_point],
                worldLandmark[point.id],
                worldLandmark[point.right_point]
              );
            } else {
              angle = GeometryUtils.calculateAngle(left, main, right, video.videoWidth, video.videoHeight);
            }
            currentAngles[point.codename] = angle;
          }
        }

        // Registrar frame en historial
        const duration = this._videoDuration || video.duration;
        this._historyService?.addFrame(currentTime, currentAngles, allCoords, duration);

        // Guardar en IndexedDB periódicamente
        const now = Date.now();
        if (now - (this._lastSaveTime || 0) > 15000) {
          this._historyService?.saveToStorage();
          this._lastSaveTime = now;
        }

        this._onFrame?.(currentTime, currentAngles, allCoords);
      }
    } catch (e) {
      console.error('BackgroundAnalysisService: error procesando frame en seek', e);
      // Si MediaPipe falla catastróficamente (ej. timestamp error o C++ graph error),
      // la instancia interna se corrompe. Destruimos la instancia global para que se
      // regenere desde cero en el próximo intento.
      import('./mediaPipeProvider').then(({ default: provider }) => {
        provider.destroy();
      });
      this._finishAnalysis();
      return;
    }

    // Reportar progreso
    const duration = this._videoDuration || video.duration;
    if (duration) {
      this._onProgress?.(this._nextSeekTime, duration);
    }

    // Avanzar al siguiente frame
    this._nextSeekTime += this._seekStep;

    // El evento 'seeked' ya proporciona un punto de cesión natural al event loop
    // (es asíncrono, pasa por la cola de eventos del navegador).
    // Solo necesitamos ceder explícitamente cada ~150ms para que el navegador pinte la UI.
    //
    // IMPORTANTE: NO usamos setTimeout aquí porque Chrome lo ralentiza a 1 segundo
    // mínimo en pestañas ocultas, lo que destruiría el rendimiento.
    // MessageChannel.postMessage NO tiene esa restricción.
    const now = performance.now();
    if (now - (this._lastYieldTime || 0) > 150) {
      this._lastYieldTime = now;
      this._scheduleNextFrame();
    } else {
      // Llamada directa — el seeked event sigue siendo asíncrono, así que no hay riesgo de stack overflow
      this._seekToNextFrame();
    }
  }

  /**
   * Finaliza el análisis: guarda el historial completo y libera MediaPipe.
   */
  async _finishAnalysis() {
    this._isRunning = false;
    this._stopWorkerTimer();
    const frameCount = this._historyService ? Object.keys(this._historyService._map).length : 0;
    if (this._poseLandmarker) {
      this._poseLandmarker = null;
    }
    console.log(`[BackgroundAnalysisService] Análisis completado. Frames procesados: ${frameCount}, hasta t=${this._nextSeekTime.toFixed(3)}s`);
    // El guardado final se delega al callback onComplete de la vista,
    // que usa la misma instancia de historyService compartida.
    this._onComplete?.();
  }
}
const backgroundAnalysisServiceInstance = new BackgroundAnalysisService();
export default backgroundAnalysisServiceInstance;
