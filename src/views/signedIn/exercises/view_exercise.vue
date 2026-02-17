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
          <div style="position: relative;">
            <video
              ref="video"
              :src="exercise.video"
              controls
              crossorigin="anonymous"
              @play="startDetection"
              @pause="stopDetection"
              @ended="stopDetection"
              style="width: 100%; display: block; z-index: 1;"
            ></video>
            <canvas
              ref="canvas"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;"
            ></canvas>
          </div>
          <hr>
          <div class="patients-table">
            <span class="regular-font">Punto</span>
            <span class="regular-font">Ángulo mínimo</span>
            <span class="regular-font">Ángulo máximo</span>
            <template v-for="point in tracked_points" :key="point.id">
              <span class="light-font">{{point.verbose}}</span>
              <span class="light-font">{{parseFloat(point.min_angle).toFixed(2)}}</span>
              <span class="light-font">{{parseFloat(point.max_angle).toFixed(2)}}</span>
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
                <span class="light-font">{{range.point_tracked.skeleton_point.verbose}}</span>
                <span class="light-font">{{parseFloat(range.min_angle).toFixed(2)}}</span>
                <span class="light-font">{{parseFloat(range.max_angle).toFixed(2)}}</span>
              </template>
            </template>
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
      </div>
    </div>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { VideoAccount, RunFast, Upload } from "mdue";
import PoseLandmarkerService from '@/services/poseLandmarkerService';

export default {
  name: 'ViewExercise',
  async beforeMount() {
    await this.getExercise();
    this.poseService = new PoseLandmarkerService();
    await this.poseService.initialize();
  },
  components: {
    VideoAccount,
    RunFast,
    Upload
  },
  computed: {
    hasResults() {
      return Object.keys(this.observed_results).length > 0;
    }
  },
  methods: {
    async getExercise() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.$route.params.exercise_id}`
      );
      if (response.status !== 404) {
        console.log(response.data);
        this.exercise = response.data;
        this.routine = this.exercise.routine_id;
        this.name = this.exercise.name;
        this.description = this.exercise.description;
        this.order = this.exercise.order;
        this.status = this.exercise.status;
        console.log(`Estado del video: ${this.status}`);
        console.log(`Ejercicio: ${this.exercise}`);
        console.log(`Video: ${this.exercise.video}`);

        console.log(`Predicado: ${this.status === "Video procesado" || this.status === "Video en procesamiento"}`);
        if (this.status === "Video procesado" || this.status === "Video en procesamiento") {
          await this.getPointsTracked();
          await this.getDifficulties();
        }
      } else {
        console.log("TODO: route to 404");
      }
    },
    async getPointsTracked() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.exercise.id}/points_tracked/`
      );
      if (response.status !== 200) {
        console.error("Error on fetch");
        return;
      }
      this.tracked_points = response.data;
      // Inicializar estructura de resultados
      this.tracked_points.forEach(point => {
        this.observed_results[point.codename] = {
          min: Infinity,
          max: -Infinity
        };
      });
    },
    async getDifficulties() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.exercise.id}/difficulties/`
      );
      if (response.status !== 200) {
        console.error("Error on fetch difficulties");
        return;
      }
      console.log("Rango de dificultades: ", response.data);
      this.difficulties = response.data;
    },
    startDetection() {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;

      if (!video || !canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      this.poseService.createDrawingUtils(canvas.getContext('2d'));

      // Reiniciar resultados al empezar de nuevo si se desea, o acumular
      // this.resetResults();

      const renderLoop = async () => {
        if (video.paused || video.ended) return;

        try {
          await this.poseService.detectForVideo(
            video,
            canvas,
            performance.now(),
            this.tracked_points,
            this.updateResults // Callback
          );
        } catch (e) {
          console.error("Deteniendo detección por error:", e);
          return;
        }

        requestAnimationFrame(renderLoop);
      };

      renderLoop();
    },
    stopDetection() {
      // El loop se detiene automáticamente
    },
    updateResults(currentAngles) {
      for (const [codename, angle] of Object.entries(currentAngles)) {
        if (this.observed_results[codename]) {
          if (angle < this.observed_results[codename].min) {
            this.observed_results[codename].min = angle;
          }
          if (angle > this.observed_results[codename].max) {
            this.observed_results[codename].max = angle;
          }
        }
      }
    },
    async sendResults() {
      const resultsPayload = {
        error: false,
        results: {
          points: Object.entries(this.observed_results).map(([center, data]) => ({
            center: center,
            max_angle: data.max === -Infinity ? 0 : parseFloat(data.max.toFixed(2)),
            min_angle: data.min === Infinity ? 0 : parseFloat(data.min.toFixed(2))
          }))
        }
      };

      console.log("Enviando resultados:", resultsPayload);

      const http = new Http();
      try {
        const response = await http.authPost(
          `/exercises/${this.exercise.id}/video_results/`,
          resultsPayload
        );

        if (response.status === 200 || response.status === 201) {
          alert("Resultados enviados correctamente");
        } else {
          alert("Error al enviar resultados");
        }
      } catch (error) {
        console.error("Error en la petición:", error);
        alert("Error de conexión");
      }
    }
  },
  data() {
    return {
      exercise: {},
      tracked_points: [],
      difficulties: [],
      poseService: null,
      observed_results: {} // Estructura: { "LEFT_SHOULDER": { min: 10, max: 120 }, ... }
    };
  },
};
</script>

<style lang="scss">
.video-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
.video-wrapper {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  align-self: center;
  display:flex;
  flex-direction: column;
  h3 {
    margin-top: 0;
  }
  video {
    width: auto;
    justify-self: center;
  }
}
.actions-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
.actions-wrapper {
  width: 90%;
  padding: 20px;
  display: flex;
  justify-content: space-evenly;
  button {
    padding: 10px
  }
}

.action-icon {
  font-size: 2em;
}
</style>