import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "@mediapipe/tasks-vision";

export default class PoseLandmarkerService {
  constructor() {
    this.poseLandmarker = undefined;
    // Usamos modo IMAGE para evitar problemas de configuración con VIDEO
    this.runningMode = "IMAGE"; 
    this.drawingUtils = undefined;
  }

  async initialize() {
    console.log("Inicializando PoseLandmarkerService (Modo IMAGE/GPU)...");
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU" // Intentamos GPU para mejor rendimiento
        },
        runningMode: this.runningMode,
        numPoses: 2
      });
      
      console.log("PoseLandmarker inicializado correctamente.");
    } catch (error) {
      console.error("Error al inicializar PoseLandmarker:", error);
    }
  }

  createDrawingUtils(canvasCtx) {
    this.drawingUtils = new DrawingUtils(canvasCtx);
  }

  // Función para calcular el ángulo entre 3 puntos (p2 es el vértice)
  _calculateAngle(p1, p2, p3) {
    // Vectores
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    // Producto punto
    const dotProduct = v1.x * v2.x + v1.y * v2.y;

    // Magnitudes de los vectores
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    // Ángulo en radianes
    const angleRad = Math.acos(dotProduct / (mag1 * mag2));

    // Convertir a grados
    const angleDeg = angleRad * (180 / Math.PI);

    return angleDeg;
  }

  async detectForVideo(video, canvas, startTimeMs, trackedPoints = [], onResults = null) {
    if (!this.poseLandmarker) return;

    try {
      const result = this.poseLandmarker.detect(video);
      
      const canvasCtx = canvas.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const trackedIndices = new Set(trackedPoints.map(p => p.id));
      const currentAngles = {}; // Para guardar los ángulos de este frame

      if (result.landmarks && result.landmarks.length > 0) {
        for (const landmark of result.landmarks) {
          // Dibujar conexiones y puntos
          this.drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
          this.drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
            color: (data) => trackedIndices.has(data.index) ? "#FF0000" : "#FFFFFF",
            fillColor: (data) => trackedIndices.has(data.index) ? "#FF0000" : "#FFFFFF"
          });

          // Calcular y dibujar ángulos para los puntos rastreados
          for (const trackedPoint of trackedPoints) {
            const mainPoint = landmark[trackedPoint.id];
            const leftPoint = landmark[trackedPoint.left_point];
            const rightPoint = landmark[trackedPoint.right_point];

            if (mainPoint && leftPoint && rightPoint) {
              const angle = this._calculateAngle(leftPoint, mainPoint, rightPoint);
              
              // Guardar ángulo calculado
              currentAngles[trackedPoint.codename] = angle;

              // Dibujar el texto del ángulo en el canvas
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

      // Notificar resultados si hay callback
      if (onResults && Object.keys(currentAngles).length > 0) {
        onResults(currentAngles);
      }

    } catch (error) {
      console.error("Error durante la detección:", error);
    }
  }
}
