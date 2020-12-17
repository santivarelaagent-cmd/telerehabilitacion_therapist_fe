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
        <h3 class="regular-font dark-text">Video subido:</h3>
        <video :src=" `http://localhost/media/${ exercise.video }` " controls></video>
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
      </div>
    </div>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { VideoAccount, RunFast } from "mdue";

export default {
  name: 'ViewExercise',
  async beforeMount() {
    await this.getExercise();
  },
  components: {
    VideoAccount,
    RunFast
  },
  methods: {
    async getExercise() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.$route.params.exercise_id}`
      );
      if (response.status !== 404) {
        this.exercise = response.data;
        this.routine = this.exercise.routine_id;
        this.name = this.exercise.name;
        this.description = this.exercise.description;
        this.order = this.exercise.order;
        this.status = this.exercise.status;
        if (this.status === "Video procesado") {
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
    },
    async getDifficulties() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.exercise.id}/difficulties/`
      );
      if (response.status !== 200) {
        console.error("Error on fetch");
        return;
      }
      this.difficulties = response.data;
    },
  },
  data() {
    return {
      exercise: {},
      tracked_points: [],
      difficulties: []
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