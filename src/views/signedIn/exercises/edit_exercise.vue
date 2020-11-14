<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        Editando el ejercicio
        <span class="light-italic-font">{{ exercise.name }}</span>
      </h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveExercise">
        <div class="danger-bg form-error" v-show="!form_valid">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="therapy" class="light-font dark-text">Rutina</label>
          <select
            name="routine"
            id="routine"
            :class="{ 'light-font': true, 'has-error': !routine_valid }"
            v-model="routine"
          >
            <option value="0" v-if="loading_routines" class="light-italic-font">
              Cargando ...
            </option>
            <option
              :value="routine.id"
              v-for="routine in routines"
              :key="routine.id"
            >
              {{ routine.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Nombre del ejercicio</label
          >
          <input
            type="text"
            name="name"
            id="name"
            :class="{ 'light-font': true, 'has-error': !name_valid }"
            placeholder="Dale un nombre al nuevo ejercicio"
            v-model="name"
          />
        </div>
        <div class="form-group">
          <label for="description" class="light-font dark-text"
            >Descripción</label
          >
          <textarea
            name="description"
            id="description"
            :class="{ 'light-font': true, 'has-error': !description_valid }"
            cols="30"
            rows="10"
            placeholder="El ejercicio debe tener una descripción"
            v-model="description"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >¿En qué posición dentro de la rutina irá este ejercicio?</label
          >
          <input
            type="number"
            name="order"
            id="order"
            :class="{ 'light-font': true, 'has-error': !order_valid }"
            placeholder="Si eliges 1, este será el primer ejercicio que verá el paciente"
            v-model="order"
          />
        </div>
        <div class="form-group form-checkbox">
          <label for="is_model" class="light-font dark-text"
            >¿Es un modelo?</label
          >
          <input
            type="checkbox"
            name="is_model"
            id="is_model"
            v-model="is_model"
          />
        </div>
        <div class="form-group"><hr /></div>
        <div class="form-group">
          <label for="video" class="light-font dark-text"
            >Subir un nuevo video</label
          >
          <input type="file" name="video" id="video" @change="videoChanged" />
        </div>
        <div class="form-group">
          <label for="skeleton_points" class="light-font dark-text"
            >Seleccione los puntos a seguir</label
          >
          <select
            name="skeleton_points"
            id="skeleton_points"
            multiple
            v-model="selected_points"
          >
            <option
              v-for="point in skeleton_points"
              :value="point.id"
              :key="point.id"
            >
              {{ point.verbose }}
            </option>
          </select>
        </div>
        <button type="submit" class="btn btn-success btn-lg">
          <plus />
          <cached v-if="loading" class="rotate" />
          <span v-else>Guardar cambios</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { Plus, Cached } from "mdue";
import Http from "@/lib/http";
export default {
  name: "NewTherapy",

  components: {
    Plus,
    Cached,
  },

  async beforeMount() {
    await this.getRoutines();
    await this.getExercise();
    await this.getSkeletonPoints();
  },

  methods: {
    videoChanged(e) {
      console.log(e.target.files[0]);
      this.video = e.target.files[0];
    },
    async getRoutines() {
      this.loading_routines = true;
      const http = new Http();
      const response = await http.authGet("/routines/");
      if (response.status !== 200) {
        console.error("Error on fetch");
        return;
      }
      this.routines = response.data.results.map((row) => ({
        id: row.id,
        name: row.name,
      }));
      this.loading_routines = false;
    },
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
      } else {
        console.log("TODO: route to 404");
      }
    },
    formHasChanged() {
      return (
        this.name !== this.exercise.name ||
        this.description !== this.exercise.description ||
        this.routine != this.exercise.routine_id ||
        this.order !== this.exercise.order
      );
    },
    async getSkeletonPoints() {
      const http = new Http();
      const response = await http.authGet("/skeleton/");
      if (response.status !== 200) {
        console.error("Error on fetch");
        return;
      }
      this.skeleton_points = response.data;
    },
    async saveExercise() {
      this.loading = true;
      if (this.formHasChanged()) {
        this.name_valid = this.name !== "";
        this.description_valid = this.description !== "";
        this.routine_valid = this.routine !== "";
        this.order_valid = !!this.order;
        this.form_valid =
          this.name_valid &&
          this.description_valid &&
          this.routine_valid &&
          this.order_valid;
        if (this.form_valid) {
          const http = new Http();
          const response = await http.authPut(
            `/exercises/${this.$route.params.exercise_id}/`,
            {
              name: this.name,
              description: this.description,
              routine_id: parseInt(this.routine),
              order: this.order,
              is_model: this.is_model,
            }
          );
          if (response.status === 201) {
            this.$router.push({ name: "exercises" });
          } else {
            this.error_msg = `La petición falló con estado ${response.status}`;
          }
        } else {
          this.error_msg = "Revisa el formulario";
        }
      } else {
        console.log("no changes");
        if (this.video) {
          console.log(this.selected_points);
          const http = new Http();
          let form = new FormData();
          form.append("video", this.video);
          const response = await http.authPostFormData(
            `/exercises/${this.$route.params.exercise_id}/video/`,
            form
          );
          console.log(response);
        }
      }
      this.loading = false;
    },
  },

  data() {
    return {
      exercise: {},
      form_valid: true,
      routine: "",
      routine_valid: true,

      name: "",
      name_valid: true,

      description: "",
      description_valid: true,

      order: undefined,
      order_valid: true,

      is_model: false,

      loading: false,
      loading_routines: false,
      routines: [],
      skeleton_points: [],
      selected_points: [],
      error_msg: "",
    };
  },
};
</script>

<style scoped lang="scss">
.therapies {
  height: calc(100vh - 50px);
  width: 100%;
  overflow-y: scroll;
  padding: 10px;
}
.header {
  margin-bottom: 20px;
}
.header__title {
  margin: 0;
}
.form-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
.create-therapy {
  border: 1px solid $dark;
  border-radius: 20px;
  padding: 1.5em;
  display: flex;
  flex-direction: column;
  button {
    align-self: flex-end;
  }
}
.form-group {
  width: 100%;
  display: flex;
  flex-direction: column;

  * {
    display: block;
  }
  label {
    margin-bottom: 5px;
  }
  textarea {
    resize: none;
  }
  input,
  textarea,
  select {
    margin-bottom: 10px;
    padding: 5px;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 10px;
    border: 0;
    background-color: $light;
  }
  input.has-error,
  textarea.has-error,
  select.has-error {
    border: 1px solid $danger;
  }
  input::placeholder,
  textarea::placeholder {
    @extend .regular-italic-font;
  }
  &.form-checkbox {
    flex-direction: row;
    align-items: center;
    margin-bottom: 10px;
    input {
      margin: 0;
      margin-left: 10px;
    }
    label {
      margin-bottom: 0;
    }
  }
}
.form-error {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
  font-weight: 400;
  font-size: 0.8em;
}
</style>
