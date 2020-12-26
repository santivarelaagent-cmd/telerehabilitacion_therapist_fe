<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        Asignando rutina en 
        <span class="light-italic-font">{{ therapy.name }}</span>
      </h2>
    </div>
    <div class="form-wrapper">
      <div class="form-container">
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
        <hr>
        <h4 class="regular-font dark-text">Dificultades de los ejercicios</h4>
        <template v-for="exercise in routine_exercises" :key="exercise.id">
          <p class="regular-font">Dificultad para el ejercicio <span class="light-italic-font">{{ exercise.name }}</span></p>
          <select @change="e => selectedDiff(e, exercise)">
            <option disabled selected value></option>
            <option v-for="diff in exercise.difficulties" :value="diff.id" :key="diff.id">{{ diff.name }}</option>
          </select>
        </template>
        <button
          class="btn btn-success"
          style="height: 30px; margin: 30px"
          @click="schedulePatient"
        >
          <span>Guardar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Http from "@/lib/http";
import "@/styles/views/edit_therapy.scss";
export default {
  name: 'EnrollPatient',
  async beforeMount() {
    await this.getTherapy();
    await this.getTherapyPatients();
    await this.getTherapyRoutines();
  },
  methods: {
    async getTherapy() {
      const http = new Http();
      const response = await http.authGet(
        `/therapies/${this.$route.params.therapy_id}`
      );
      if (response.status !== 404) {
        this.therapy = response.data;
      } else {
        console.log("TODO: route to 404");
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
      this.$router.push({
        name: 'view_therapy',
        params: {
          therapy_id: this.therapy.id
        }
      });
    },
    selectedDiff(event, exercise) {
      const idx = this.exercises_difficulties.findIndex(diff => diff.exercise_id = exercise.id)
      if (idx !== -1) {
        this.exercises_difficulties[idx].diff = event.target.value
      } else {
        this.exercises_difficulties.push({
          exercise_id: exercise.id,
          diff: parseInt(event.target.value)
        })
      }
      console.log(this.exercises_difficulties)
    }
  },
  watch: {
    routine: function(id) {
      const routine_obj = this.therapy_routines.find(routine => routine.id === id)
      this.routine_exercises = routine_obj.exercises;
    }
  },
  data() {
    return {
      therapy: {},
      therapy_patients: [],
      therapy_routines: [],
      routine_exercises: [],
      exercises_difficulties: [],
      patient: '',
      routine: '',
      start_time: '',
    };
  },
}
</script>

<style lang="scss">
.form-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}
.form-container {
  width: 90%;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  &* {
    margin-top: 10px
  }
  button {
    width: 30%;
  }
}
</style>