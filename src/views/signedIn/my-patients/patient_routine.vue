<template>
  <div class="therapies">
    <h2 class="light-font dark-text">
      Rutina <span class="light-italic-font">{{ routine_name }}</span><br>
      Paciente <span class="light-italic-font">{{ patient_name }}</span>
    </h2>
    
    <h3 class="regular-font dark-text">Estado:</h3>
    <p class="light-font dark-text">{{ scheduled_training_status_verbose }}</p>
    <div v-if="training">
      <p class="bold-font dark-text">Comienzo: <span class="light-italic-font">{{ training.start_time }}</span></p>
      <p class="bold-font dark-text">Final: <span class="light-italic-font">{{ training.end_time }}</span></p>
      <h3 class="regular-font dark-text">Resultado de los ejercicios:</h3>
      <Table
        v-if="training.id"
        :columns="[
          { query: 'id', verbose: 'ID' },
          { query: 'exercise.name', verbose: 'Ejercicio' },
          { query: 'status', verbose: 'Estado' },
        ]"
        :actions="['detail']"
        :api_endpoint="`/exercise_results?training_id=${training.id}`"
        sorting_column="id"
        @detail="goToDetail"
      />
    </div>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import Table from '@/components/table';
/**
 * @param
 * patient_id
 * scheduled_training_id
 */
export default {
  name: 'ViewPatient',
  components: {
    Table
  },
  async beforeMount() {
    this.patient_id = this.$route.params.patient_id;
    this.scheduled_training_id = this.$route.params.scheduled_training_id;
    await this.getPatient();
    await this.getScheduledTraining();
  },
  methods: {
    async getPatient() {
      const http = new Http();
      const responsePatient = await http.authGet(
        `/therapist_patient?patient_id=${this.$route.params.patient_id}`
      );
      if (responsePatient.status !== 404) {
        this.patient = responsePatient.data;
        this.patient_name = `${this.patient.patient.user.first_name} ${this.patient.patient.user.last_name}`;
      } else {
        console.log("TODO: route to 404");
      }
    },
    async getScheduledTraining() {
      const http = new Http();
      const responseScheduledTraining = await http.authGet(
        `/scheduled_training?scheduled_training_id=${this.$route.params.scheduled_training_id}`
      );
      if (responseScheduledTraining.status !== 404) {
        this.scheduled_training = responseScheduledTraining.data;
        this.routine_name = this.scheduled_training.routine.name;
        this.scheduled_training_status_verbose = this.scheduled_training.status_verbose;
        this.scheduled_training_status = this.scheduled_training.status;
        if (this.scheduled_training_status === '3') {
          await this.getTraining();
        }
      } else {
        console.log("TODO: route to 404");
      }
    },
    async getTraining() {
      const http = new Http();
      const responseTraining = await http.authGet(
        `/training?scheduled_training_id=${this.$route.params.scheduled_training_id}`
      );
      if (responseTraining.status !== 404) {
        this.training = responseTraining.data;
        console.log("training", this.training)
      } else {
        console.log("TODO: route to 404");
      }
    },
    goToDetail(result_id) {
      this.$router.push({ name: 'view_exercise_result', params: {
        patient_id: this.$route.params.patient_id,
        scheduled_training_id: this.$route.params.scheduled_training_id,
        result_id
      } });
    }
  },
  data() {
    return {
      patient_id: null,
      scheduled_training_id: null,
      patient: {},
      patient_name: '',
      scheduled_training: {},
      routine_name: '',
      scheduled_training_status_verbose: '',
      scheduled_training_status: '',
      training: {},
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