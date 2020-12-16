<template>
  <div class="therapies">
    <h2 class="light-font dark-text">
      Rutina <span class="light-italic-font">{{ routine.name }}</span>
    </h2>
    <h3 class="regular-font dark-text">Descripción:</h3>
    <p class="light-font dark-text">{{ routine.description }}</p>
    <div class="patients-container">
      <div class="patients-wrapper">
        <h3 class="regular-font dark-text">Rutinas programadas:</h3>
        <div class="patients-table">
          <span class="regular-font">Paciente</span>
          <span class="regular-font">Terapeuta</span>
          <span class="regular-font">Fecha</span>
          <template v-for="patient in scheduled_routines_patients" :key="patient.id">
            <span class="light-font">{{
              patient.patient.user.first_name + ' ' + patient.patient.user.last_name
            }}</span>
            <span class="light-font">{{
              patient.therapist.user.first_name + ' ' + patient.therapist.user.last_name
            }}</span>
            <span class="light-font">{{ parseDate(new Date(patient.start_time)) }}</span>
          </template>
        </div>
      </div>
    </div>
    <div class="actions-container">
      <div class="actions-wrapper">
        <button class="btn btn-dark" v-on:click="() => $router.push({name: 'assing_routine', params: {therapy_id: routine.therapy.id}})" >
          <CalendarAccount class="action-icon" />
          <span>Asignar rutina a paciente</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { CalendarAccount, ClipboardList } from "mdue";

export default {
  name: 'ViewTherapy',
  async beforeMount() {
    await this.getRoutine();
  },
  components: {
    CalendarAccount,
  },
  methods: {
    async getRoutine() {
      const http = new Http();
      const response = await http.authGet(
        `/routines/${this.$route.params.routine_id}`
      );
      if (response.status !== 404) {
        this.routine = response.data;
        await this.getScheduledTrainings();
      } else {
        console.log('TODO: route to 404');
      }
    },
    async getScheduledTrainings() {
      const http = new Http();
      const response = await http.authGet(
        `/scheduled_training?routine_id=${this.$route.params.routine_id}`
      );
      if (response.status !== 404) {
        this.scheduled_routines_patients = response.data;
      } else {
        console.log('TODO: route to 404');
      }
    },
    parseDate(date) {
      return `${
          date.getDate() < 10 ? '0' + date.getDate() : '' + date.getDate()
        }/${
          date.getMonth() + 1 < 10
            ? '0' + (date.getMonth() + 1)
            : '' + (date.getMonth() + 1)
        }/${date.getFullYear()} ${
          date.getHours() < 10 ? '0' + date.getHours() : '' + date.getHours()
        }:${
          date.getMinutes() < 10
            ? '0' + date.getMinutes()
            : '' + date.getMinutes()
        }:${
          date.getSeconds() < 10
            ? '0' + date.getSeconds()
            : '' + date.getSeconds()
        }`
    }
  },
  data() {
    return {
      routine: {},
      scheduled_routines_patients: [],
      patient: '',
      start_time: '',
    };
  },
};
</script>

<style lang="scss">
.patients-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
.patients-wrapper {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  align-self: center;
  h3 {
    margin-top: 0;
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