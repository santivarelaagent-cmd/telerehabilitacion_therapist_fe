<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">
        Creando una nueva dificultad al ejercicio 
        <span class="light-italic-font">{{ exercise.name }}</span>
      </h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveDifficulty">
        <div class="danger-bg form-error" v-show="!form_valid">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="name" class="light-font dark-text"
            >Nombre de la dificultad</label
          >
          <input
            type="text"
            name="name"
            id="name"
            :class="{ 'light-font': true, 'has-error': !name_valid }"
            placeholder="Fácil, medio, etc."
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
            v-model="description"
          ></textarea>
        </div>
        <hr>
        <h3 class="light-font dark-text">Rangos</h3>
        <div class="patients-table" v-if="ranges.length !== 0">
          <span class="regular-font">Punto</span>
          <span class="regular-font">Ángulo mínimo</span>
          <span class="regular-font">Ángulo máximo</span>
          <template v-for="(range, index) in ranges" :key="index">
            <span class="light-font">{{ range.point.verbose }}</span>
            <span class="light-font">{{ parseFloat(range.min_angle).toFixed(2) }}</span>
            <span class="light-font">{{ parseFloat(range.max_angle).toFixed(2) }}</span>
          </template>
        </div>
        <div class="form-group">
          <label for="description" class="light-font dark-text"
            >Punto a seguir</label
          >
          <select v-model="selected_point_id" v-on:change="fillAngles">
            <option v-for="point in tracked_points" :key="point.id" :value="point.id">
              {{point.verbose}}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="description" class="light-font dark-text"
            >Ángulo mínimo</label
          >
          <input type="number" v-model="min_angle">
        </div>
        <div class="form-group">
          <label for="description" class="light-font dark-text"
            >Ángulo máximo</label
          >
          <input type="number" v-model="max_angle">
        </div>
        <button class="btn btn-success" type="button" v-on:click="appendRange">
          <Clipboard />
          <span>Añadir rango</span>
        </button>
        <hr>
        <button type="submit" class="btn btn-success btn-lg">
          <Plus />
          <cached v-if="loading" class="rotate" />
          <span v-else>Guardar cambios</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { Plus, Clipboard } from "mdue";

export default {
  name: 'NewDifficultyExercise',
  async beforeMount() {
    await this.getExercise();
  },
  components: {
    Plus,
    Clipboard
  },
  methods: {
    async getExercise() {
      const http = new Http();
      const response = await http.authGet(
        `/exercises/${this.$route.params.exercise_id}`
      );
      if (response.status !== 404) {
        this.exercise = response.data;
        if (this.exercise.status === "Video procesado") {
          await this.getPointsTracked();
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
      console.log(this.tracked_points)
    },
    fillAngles() {
      const point = this.tracked_points.find(point => point.id === this.selected_point_id)
      this.min_angle = point.min_angle
      this.max_angle = point.max_angle
    },
    async saveDifficulty() {
      this.loading = true;
      this.name_valid = this.name !== "";
      this.description_valid = this.description !== "";
      this.form_valid = this.name_valid && this.description_valid;
      if (this.form_valid) {
        const http = new Http();
        console.log(this.ranges)
        const response = await http.authPost(`/exercises/${this.exercise.id}/post_difficulty/`, {
          name: this.name,
          description: this.description,
          exercise_id: this.exercise.id,
          ranges: JSON.stringify(this.ranges.map(range => ({
            point_tracked: range.point,
            min_angle: range.min_angle,
            max_angle: range.max_angle
          })))
        });
        if (response.request.status === 201) {
          this.$router.push({ name: "exercises" });
        } else {
          this.error_msg = `La petición falló con estado ${response.status}`;
        }
      } else {
        this.error_msg = "Revisa el formulario";
      }
      this.loading = false;
    },
    appendRange() {
      if(this.selected_point_id !== 0) {
        const point = this.tracked_points.find(point => point.id === this.selected_point_id)
        this.ranges.push(
          {
            point,
            min_angle: this.min_angle,
            max_angle: this.max_angle
          }
        )
        this.selected_point_id = 0;
        this.min_angle = 0;
        this.max_angle = 0;
      }
    }
  },
  data() {
    return {
      exercise: {},
      tracked_points: [],
      ranges: [],
      loading: false,
      name_valid: true,
      description_valid: true,
      form_valid: true,
      error_msg: '',
      selected_point_id: 0,
      min_angle: 0,
      max_angle: 0
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