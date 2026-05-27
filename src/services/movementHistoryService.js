/**
 * MovementHistoryService
 * Responsabilidad única: gestionar el historial de frames de movimiento
 * y su persistencia en localStorage.
 */
export default class MovementHistoryService {
  constructor(exerciseId) {
    this.exerciseId = exerciseId;
    this._map = {};
    this._processedSegments = new Set();
  }

  // ─── Acceso al historial ───────────────────────────────────────────────────

  getHistoryArray() {
    return Object.values(this._map).sort((a, b) => a.t - b.t);
  }

  hasFrames() {
    return Object.keys(this._map).length > 0;
  }

  // ─── Actualización de frames ───────────────────────────────────────────────

  /**
   * Registra un nuevo frame y devuelve el progreso actualizado (0-100).
   * @param {number} currentTime - currentTime del video en segundos
   * @param {object} angles - { [codename]: angleDegrees }
   * @param {Array}  coords - array de 33 landmarks [[x,y,z,vis], ...]
   * @param {number} videoDuration - duración total del video
   * @returns {{ progress: number, isFirstResult: boolean }}
   */
  addFrame(currentTime, angles, coords, videoDuration) {
    const key = currentTime.toFixed(2);
    const wasEmpty = !this.hasFrames();

    this._map[key] = {
      t: parseFloat(currentTime.toFixed(4)),
      points: coords,
      angles,
    };

    const segment = Math.floor(currentTime * 10);
    this._processedSegments.add(segment);

    let progress = 0;
    if (videoDuration) {
      const totalSegments = Math.ceil(videoDuration * 10);
      progress = Math.min(100, Math.round((this._processedSegments.size / totalSegments) * 100));
    }

    return { progress, isFirstResult: wasEmpty && Object.keys(angles).length > 0 };
  }

  /**
   * Calcula el progreso inicial a partir de los segmentos ya almacenados.
   * @param {number} videoDuration
   * @returns {number} progreso 0-100
   */
  calculateProgress(videoDuration) {
    if (!videoDuration || this._processedSegments.size === 0) return 0;
    const totalSegments = Math.ceil(videoDuration * 10);
    return Math.min(100, Math.round((this._processedSegments.size / totalSegments) * 100));
  }

  // ─── Persistencia localStorage ─────────────────────────────────────────────

  saveToStorage() {
    try {
      const payload = {
        map: this._map,
        segments: Array.from(this._processedSegments),
      };
      localStorage.setItem(`exercise_${this.exerciseId}_history`, JSON.stringify(payload));
    } catch (e) {
      console.warn('El historial de movimiento en caché es grande y puede que no quepa en localStorage.', e);
    }
  }

  loadFromStorage() {
    const cached = localStorage.getItem(`exercise_${this.exerciseId}_history`);
    if (!cached) return false;
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.map && parsed.segments) {
        this._map = parsed.map;
        this._processedSegments = new Set(parsed.segments);
        return true;
      }
    } catch (e) {
      console.error('Error cargando historial de resguardo:', e);
    }
    return false;
  }
}
