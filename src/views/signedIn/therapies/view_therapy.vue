<template>
  <div class="therapies">
    <h2 class="light-font dark-text">
      Terapia <span class="light-italic-font">{{ therapy.name }}</span>
    </h2>
    <h3 class="regular-font dark-text">Descripción:</h3>
    <p class="light-font dark-text">{{ therapy.description }}</p>
    <div class="patients-container">
      <div class="patients-wrapper">
        <h3 class="regular-font dark-text">Pacientes:</h3>
        <div class="patients-table">
          <span class="regular-font">Usuario</span>
          <span class="regular-font">Nombre</span>
          <template v-for="patient in therapy_patients" :key="patient.id">
            <span class="light-font">{{ patient.patient.user.username }}</span>
            <span class="light-font">{{
              patient.patient.user.first_name + ' ' + patient.patient.user.last_name
            }}</span>
          </template>
        </div>
      </div>
    </div>
    <div class="actions-container">
      <div class="actions-wrapper">
        <button class="btn btn-dark">
          <CalendarAccount class="action-icon" />
          <span>Asignar rutina a paciente</span>
        </button>
        <button class="btn btn-light" v-on:click="() => $router.push({name: 'enroll_patient', params: {therapy_id: therapy.id}})" >
          <ClipboardList class="action-icon" />
          <span>Inscribir paciente</span>
        </button>
      </div>
    </div>
    <h3 class="regular-font dark-text">Asignar rutina a paciente</h3>
    <p class="regular-font">Paciente</p>
    <select name="patient" id="patient" v-model="patient">
      <option
        v-for="patient in therapy_patients"
        :value="patient.id"
        :key="patient.id"
      >
        {{
          patient.patient.user.first_name + ' ' + patient.patient.user.last_name
        }}
      </option>
    </select>
    <p class="regular-font">Rutina</p>
    <select name="routines" id="routines" v-model="routine">
      <option
        v-for="routine in therapy_routines"
        :value="routine.id"
        :key="routine.id"
      >
        {{ routine.name }}
      </option>
    </select>
    <p class="regular-font">Fecha</p>
    <input
      type="datetime-local"
      name="start_time"
      id="start_time"
      v-model="start_time"
    />
    <button
      class="btn btn-success"
      style="height: 30px; margin: 30px"
      @click="schedulePatient"
    >
      <span>Guardar</span>
    </button>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/edit_therapy.scss';
import { CalendarAccount, ClipboardList } from "mdue";

export default {
  name: 'ViewTherapy',
  async beforeMount() {
    await this.getTherapy();
    console.log(this.therapy);
  },
  components: {
    CalendarAccount,
    ClipboardList
  },
  methods: {
    async getTherapy() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}`
      );
      if (response.status !== 404) {
        this.therapy = response.data;
        await this.getTherapyPatients();
        await this.getTherapyRoutines();
      } else {
        console.log('TODO: route to 404');
      }
    },
    async getTherapyPatients() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}/get_patients/`
      );
      if (response.status !== 404) {
        this.therapy_patients = response.data;
        console.log(response.data);
      } else {
        console.log('TODO: route to 404');
      }
    },
    async getTherapyRoutines() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}/routines/`
      );
      if (response.status !== 404) {
        this.therapy_routines = response.data;
      } else {
        console.log('TODO: route to 404');
      }
    },
    async schedulePatient() {
      const http = new Http();
      const date = new Date(this.start_time);
      const response = http.authPost('/scheduled_training', {
        routine: this.routine,
        therapy_patient: this.patient,
        start_time: `${
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
        }`,
      });
      console.log(response);
    },
  },
  data() {
    return {
      therapy: {},
      therapy_patients: [],
      therapy_routines: [],
      patient: '',
      routine: '',
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