import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "@mediapipe/tasks-vision";

export default class PoseLandmarkerService {
  constructor() {
    this.poseLandmarker = undefined;
    this.runningMode = "VIDEO"; // Por defecto VIDEO
    this.drawingUtils = undefined;
    this.angleMode = "3d"; // "3d" | "2d"
  }

  setAngleMode(mode) {
    this.angleMode = mode;
  }

  async initialize() {
    console.log(`Inicializando PoseLandmarkerService (Modo solicitado: ${this.runningMode})...`);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      // Forzamos el literal de cadena para evitar problemas de referencia en MediaPipe
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU" 
        },
        runningMode: "VIDEO", // Forzado explícitamente aquí
        numPoses: 1
      });
      
      await this.poseLandmarker.setOptions({ runningMode: "VIDEO" });
      
      this.runningMode = "VIDEO";
      console.log("PoseLandmarker inicializado correctamente en modo VIDEO.");
    } catch (error) {
      console.error("Fallo inicialización en modo VIDEO:", error);
      console.warn("Intentando fallback a modo IMAGE...");
      
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          numPoses: 1
        });
        this.runningMode = "IMAGE";
        console.log("PoseLandmarker inicializado en modo IMAGE (Fallback).");
      } catch (err2) {
        console.error("Error total: No se pudo inicializar en ningún modo.", err2);
      }
    }
  }

  createDrawingUtils(canvasCtx) {
    this.drawingUtils = new DrawingUtils(canvasCtx);
  }

  _calculateAngle(p1, p2, p3, width = 1, height = 1) {
    const v1x = (p1.x - p2.x) * width;
    const v1y = (p1.y - p2.y) * height;
    const v2x = (p3.x - p2.x) * width;
    const v2y = (p3.y - p2.y) * height;
    const dotProduct = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (mag1 === 0 || mag2 === 0) return 0;
    return Math.acos(Math.min(1, Math.max(-1, dotProduct / (mag1 * mag2)))) * (180 / Math.PI);
  }

  _calculate3DAngle(p1, p2, p3) {
    const v1x = p1.x - p2.x, v1y = p1.y - p2.y, v1z = p1.z - p2.z;
    const v2x = p3.x - p2.x, v2y = p3.y - p2.y, v2z = p3.z - p2.z;
    const dot = v1x * v2x + v1y * v2y + v1z * v2z;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
    if (mag1 === 0 || mag2 === 0) return 0;
    return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * (180 / Math.PI);
  }

  async detectForVideo(video, canvas, startTimeMs, trackedPoints = [], onResults = null, showAdjacents = false) {
    if (!this.poseLandmarker) return;

    try {
      let result;
      if (this.runningMode === "VIDEO") {
        result = this.poseLandmarker.detectForVideo(video, startTimeMs);
      } else {
        result = this.poseLandmarker.detect(video);
      }
      
      if (!this._canvasCtx) this._canvasCtx = canvas.getContext("2d");
      const canvasCtx = this._canvasCtx;
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!this._cachedTrackedIndices || this._cachedTrackedPoints !== trackedPoints) {
        this._cachedTrackedIndices = new Set(trackedPoints.map(p => p.id));
        this._cachedTrackedPoints = trackedPoints;
      }
      const trackedIndices = this._cachedTrackedIndices;
      const currentAngles = {};
      let allCoords = [];

      if (result.landmarks && result.landmarks.length > 0) {
        const landmark = result.landmarks[0];
        const worldLandmark = result.worldLandmarks && result.worldLandmarks.length > 0 ? result.worldLandmarks[0] : null;
        
        // Dibujar el esqueleto base
        this.drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);

        // Si se solicita, dibujar primero las líneas de conexiones personalizadas
        if (showAdjacents) {
          for (const trackedPoint of trackedPoints) {
            const mainPoint = landmark[trackedPoint.id];
            const leftPoint = landmark[trackedPoint.left_point];
            const rightPoint = landmark[trackedPoint.right_point];

            // Línea a Izquierda (Azul)
            if (mainPoint && leftPoint) {
              canvasCtx.beginPath();
              canvasCtx.moveTo(mainPoint.x * canvas.width, mainPoint.y * canvas.height);
              canvasCtx.lineTo(leftPoint.x * canvas.width, leftPoint.y * canvas.height);
              canvasCtx.strokeStyle = '#3b82f6';
              canvasCtx.lineWidth = 3.5;
              canvasCtx.stroke();
            }

            // Línea a Derecha (Naranja)
            if (mainPoint && rightPoint) {
              canvasCtx.beginPath();
              canvasCtx.moveTo(mainPoint.x * canvas.width, mainPoint.y * canvas.height);
              canvasCtx.lineTo(rightPoint.x * canvas.width, rightPoint.y * canvas.height);
              canvasCtx.strokeStyle = '#f97316';
              canvasCtx.lineWidth = 3.5;
              canvasCtx.stroke();
            }
          }
        }

        // Mapear colores de los puntos si mostramos adyacentes
        const pointColors = {};
        if (showAdjacents) {
          for (const tp of trackedPoints) {
            pointColors[tp.id] = { color: '#10b981', r: 6.5 }; // Centro: Verde
            if (tp.left_point !== undefined && tp.left_point !== null) {
              if (!pointColors[tp.left_point] || pointColors[tp.left_point].color !== '#10b981') {
                pointColors[tp.left_point] = { color: '#3b82f6', r: 5 }; // Izq: Azul
              }
            }
            if (tp.right_point !== undefined && tp.right_point !== null) {
              if (!pointColors[tp.right_point] || pointColors[tp.right_point].color !== '#10b981') {
                pointColors[tp.right_point] = { color: '#f97316', r: 5 }; // Der: Naranja
              }
            }
          }
        }

        // Dibujar los círculos/puntos articulares
        this.drawingUtils.drawLandmarks(landmark, {
          radius: (data) => {
            if (showAdjacents && pointColors[data.index]) {
              return pointColors[data.index].r;
            }
            return DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1);
          },
          color: (data) => {
            if (showAdjacents && pointColors[data.index]) {
              return pointColors[data.index].color;
            }
            return trackedIndices.has(data.index) ? "#FF0000" : "#FFFFFF";
          },
          fillColor: (data) => {
            if (showAdjacents && pointColors[data.index]) {
              return pointColors[data.index].color;
            }
            return trackedIndices.has(data.index) ? "#FF0000" : "#FFFFFF";
          }
        });

        allCoords = landmark.map(pt => [
          Number(pt.x.toFixed(4)),
          Number(pt.y.toFixed(4)),
          Number(pt.z.toFixed(4)),
          Number(pt.visibility.toFixed(4))
        ]);

        for (const trackedPoint of trackedPoints) {
          const mainPoint = landmark[trackedPoint.id];
          if (mainPoint) {
            const leftPoint = landmark[trackedPoint.left_point];
            const rightPoint = landmark[trackedPoint.right_point];
            if (leftPoint && rightPoint) {
              let angle;
              if (this.angleMode === '3d' && worldLandmark && worldLandmark[trackedPoint.id] && worldLandmark[trackedPoint.left_point] && worldLandmark[trackedPoint.right_point]) {
                angle = this._calculate3DAngle(
                  worldLandmark[trackedPoint.left_point],
                  worldLandmark[trackedPoint.id],
                  worldLandmark[trackedPoint.right_point]
                );
              } else {
                angle = this._calculateAngle(leftPoint, mainPoint, rightPoint, canvas.width, canvas.height);
              }
              currentAngles[trackedPoint.codename] = angle;
              canvasCtx.fillStyle = 'yellow';
              canvasCtx.font = '18px Arial';
              const x = mainPoint.x * canvas.width;
              const y = mainPoint.y * canvas.height;
              canvasCtx.fillText(angle.toFixed(0) + '°', x + 15, y + 15);
            }
          }
        }
      }
      canvasCtx.restore();

      if (onResults && (Object.keys(currentAngles).length > 0 || allCoords.length > 0)) {
        onResults(currentAngles, allCoords);
      }
    } catch (error) {
      console.error("Error en detectForVideo:", error);
    }
  }

  /**
   * Libera todos los recursos: instancia de MediaPipe (GPU), canvas context y
   * referencias cacheadas. Llamar en beforeUnmount del componente que lo usa.
   */
  destroy() {
    try { this.poseLandmarker?.close(); } catch (_) { /* no-op */ }
    this.poseLandmarker  = undefined;
    this.drawingUtils    = undefined;
    this._canvasCtx      = undefined;
    this._cachedTrackedIndices = undefined;
    this._cachedTrackedPoints  = undefined;
  }
}
