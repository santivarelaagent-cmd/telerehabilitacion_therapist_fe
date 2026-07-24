import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * MediaPipeProvider (Singleton)
 * Responsabilidad única: Descargar, inicializar y mantener la instancia
 * de MediaPipe (GPU) en memoria para evitar cargas duplicadas y
 * consumo innecesario de VRAM.
 */
class MediaPipeProvider {
  constructor() {
    this._poseLandmarker = null;
    this._initializationPromise = null;
    this.runningMode = 'VIDEO';
  }

  /**
   * Inicializa o devuelve la instancia ya inicializada de PoseLandmarker.
   * @param {string} mode 'VIDEO' o 'IMAGE'
   * @returns {Promise<PoseLandmarker>}
   */
  async getInstance(mode = 'VIDEO') {
    if (this._poseLandmarker) {
      return this._poseLandmarker;
    }

    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._initializationPromise = this._initialize(mode);
    return this._initializationPromise;
  }

  async _initialize(mode) {
    console.log(`[MediaPipeProvider] Inicializando PoseLandmarker (Modo: ${mode})...`);
    try {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      this._poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'GPU',
        },
        runningMode: mode,
        numPoses: 1,
      });
      this.runningMode = mode;
      console.log(`[MediaPipeProvider] PoseLandmarker inicializado correctamente.`);
      return this._poseLandmarker;
    } catch (error) {
      console.error('[MediaPipeProvider] Error inicializando en modo ' + mode, error);
      
      // Fallback a IMAGE si falló en VIDEO
      if (mode === 'VIDEO') {
        console.warn('[MediaPipeProvider] Intentando fallback a modo IMAGE...');
        try {
          const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
          this._poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'GPU',
            },
            runningMode: 'IMAGE',
            numPoses: 1,
          });
          this.runningMode = 'IMAGE';
          console.log('[MediaPipeProvider] PoseLandmarker inicializado en modo IMAGE (Fallback).');
          return this._poseLandmarker;
        } catch (fallbackError) {
          console.error('[MediaPipeProvider] Error fatal: No se pudo inicializar en ningún modo.', fallbackError);
          throw fallbackError;
        }
      }
      throw error;
    } finally {
      this._initializationPromise = null;
    }
  }

  /**
   * Libera los recursos de la tarjeta gráfica y elimina la instancia en memoria.
   */
  destroy() {
    if (this._poseLandmarker) {
      try {
        this._poseLandmarker.close();
      } catch (e) {
        // no-op
      }
      this._poseLandmarker = null;
      console.log('[MediaPipeProvider] PoseLandmarker destruido.');
    }
    this._initializationPromise = null;
  }
}

const mediaPipeProviderInstance = new MediaPipeProvider();
export default mediaPipeProviderInstance;
