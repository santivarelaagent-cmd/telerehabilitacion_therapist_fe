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
        <div v-if="status === 'Sin video'">
          <div class="form-group">
            <label for="video" class="light-font dark-text"
              >Subir un nuevo video</label
            >
            <input
              type="file"
              name="video"
              id="video"
              accept="video/*"
              @change="videoChanged"
            />
          </div>
          <div class="form-group">
            <label for="skeleton_points" class="light-font dark-text"
              >Seleccione los puntos a seguir</label
            >
            <div>
              <Multiselect
                class="select light-font"
                :options="skeleton_points.map(
                  point => ({
                    value: point.id,
                    label: point.verbose
                  })
                )"
                mode="tags"
                searchable
                v-model="selected_points"
              >
              
              </Multiselect>
            </div>
          </div>
        </div>
        <div v-else-if="status === 'Video en procesamiento'">
          <span class="light-font dark-text">Video en procesamiento</span>
        </div>
        <div v-else-if="status === 'Video procesado'">
          <h3 class="light-font dark-text">Video procesado</h3>
          <h4 class="light-font dark-text">Puntos seguidos</h4>
          <div class="tracked_points--table">
            <span class="regular-font verbose">Nombre</span>
            <span class="regular-font min-angle">Angulo mínimo</span>
            <span class="regular-font max-angle">Angulo máximo</span>
            <template v-for="point in tracked_points" :key="point.id">
              <span class="light-font verbose">{{ point.verbose }}</span>
              <span class="light-font min-angle">{{
                parseFloat(point.min_angle).toFixed(2)
              }}</span>
              <span class="light-font max-angle">{{
                parseFloat(point.max_angle).toFixed(2)
              }}</span>
            </template>
          </div>
        </div>
        <div v-else-if="status === 'Error al procesar video'">
          <span class="light-font dark-text">Error al procesar video</span>
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
import "@/styles/views/edit_exercise.scss";
import Multiselect from '@vueform/multiselect'
export default {
  name: "EditExercise",

  components: {
    Plus,
    Cached,
    Multiselect
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
        this.status = this.exercise.status;
        if (this.status === "Video procesado") {
          await this.getPointsTracked();
        }
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
          console.log(this.selected_points);

        if (this.video) {
          console.log(this.selected_points);
          console.log(typeof this.selected_points);
          const points = [];
          for (let [_, value] of Object.entries(this.selected_points)) {
            console.log(_, value);
            points.push(value);
          }
          const pointsParsed = points.join(",");
          if (pointsParsed !== "") {
            const http = new Http();
            let form = new FormData();
            form.append("video", this.video);
            form.append("points", pointsParsed);
            const response = await http.authPostFormData(
              `/exercises/${this.$route.params.exercise_id}/video/`,
              form
            );
            console.log(response);
          }
        }
      }
      this.loading = false;
    },
  },

  data() {
    return {
      exercise: {},
      tracked_points: [],
      form_valid: true,
      routine: "",
      routine_valid: true,

      name: "",
      name_valid: true,

      description: "",
      description_valid: true,

      order: undefined,
      order_valid: true,

      status: "",

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
<style src="@vueform/multiselect/themes/default.css"></style>