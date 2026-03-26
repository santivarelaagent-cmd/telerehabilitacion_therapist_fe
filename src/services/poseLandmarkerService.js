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

  _calculateAngle(p1, p2, p3) {
    const v1x = p1.x - p2.x;
    const v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;
    const dotProduct = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    return Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI);
  }

  async detectForVideo(video, canvas, startTimeMs, trackedPoints = [], onResults = null) {
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
        
        this.drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        this.drawingUtils.drawLandmarks(landmark, {
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
          color: (data) => trackedIndices.has(data.index) ? "#FF0000" : "#FFFFFF",
          fillColor: (data) => trackedIndices.has(data.index) ? "#FF0000" : "#FFFFFF"
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
              const angle = this._calculateAngle(leftPoint, mainPoint, rightPoint);
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
}
