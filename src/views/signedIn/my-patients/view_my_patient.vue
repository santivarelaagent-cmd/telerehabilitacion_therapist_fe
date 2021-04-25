<template>
  <div class="therapies">
    <h2 class="light-font dark-text">
      Paciente <span class="light-italic-font">{{ patient_name }}</span>
    </h2>
    
    <h3 class="regular-font dark-text">Terapeuta:</h3>
    <p class="light-font dark-text">{{ therapist_name }}</p>
    <h3 class="regular-font dark-text">Rutinas</h3>
    <div>
      <Table
        :columns="[
          { query: 'id', verbose: 'ID' },
          { query: 'routine.name', verbose: 'Rutina' },
          { query: 'start_time', verbose: 'Hora' },
          { query: 'status_verbose', verbose: 'Estado' },
        ]"
        :actions="['detail']"
        :api_endpoint="`/scheduled_training?patient_id=${$route.params.patient_id}`"
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

export default {
  name: 'ViewPatient',
  components: {
    Table
  },
  async beforeMount() {
    await this.getPatient();
  },
  methods: {
    async getPatient() {
      const http = new Http();
      const response = await http.authGet(
        `/therapist_patient?patient_id=${this.$route.params.patient_id}`
      );
      console.log(response)
      if (response.status !== 404) {
        this.patient = response.data;
        this.patient_name = `${this.patient.patient.user.first_name} ${this.patient.patient.user.last_name}`;
        this.therapist_name = `${this.patient.therapist.user.first_name} ${this.patient.therapist.user.last_name}`;
      } else {
        console.log("TODO: route to 404");
      }
    },
    goToDetail(routine_id) {
      this.$router.push({
        name: 'view_patient_routine',
        params: {
          patient_id: this.$route.params.patient_id,
          scheduled_training_id: routine_id
        }
      });
    }
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