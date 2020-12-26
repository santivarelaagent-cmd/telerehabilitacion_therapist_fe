<template>
  <div class="therapies">
    <h2 class="light-font dark-text">
      Paciente <span class="light-italic-font">{{ patient_name }}</span>
    </h2>
    
    <h3 class="regular-font dark-text">Terapeuta:</h3>
    <p class="light-font dark-text">{{ therapist_name }}</p>
    <!-- <div class="video-container">
      <div class="video-wrapper">
        <h3 class="regular-font dark-text">Estado del video de ayuda:</h3>
        <p class="light-font dark-text">{{ exercise.status }}</p>
        <h3 class="regular-font dark-text">Video subido:</h3>
        <video :src=" `http://localhost/media/${ exercise.video }` " controls></video>
        <hr>
        <template v-if="exercise.status=== 'Video procesado'">
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
      </div>
    </div> -->
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';

export default {
  name: 'ViewPatient',
  async beforeMount() {
    await this.getPatient();
  },
  methods: {
    async getPatient() {
      const http = new Http();
      const response = await http.authGet(
        `/therapist_patient?patient_id=${this.$route.params.patient_id}`
      );
      if (response.status !== 404) {
        this.patient = response.data;
        this.patient_name = `${this.patient.patient.user.first_name} ${this.patient.patient.user.last_name}`;
        this.therapist_name = `${this.patient.therapist.user.first_name} ${this.patient.therapist.user.last_name}`;
        console.log(this.patient_name)
      } else {
        console.log("TODO: route to 404");
      }
    },
  },
  data() {
    return {
      patient: {},
      patient_name: '',
      therapist_name: '',
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