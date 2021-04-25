<template>
  <div class="therapies" v-if="result">
    <h2 class="light-font dark-text">
      Ejercicio <span class="light-italic-font">{{ exercise_name }}</span>
    </h2>
    <div class="video-container">
      <div class="video-wrapper">
        <h3 class="regular-font dark-text">Estado del video:</h3>
        <p class="light-font dark-text">{{ result.status }}</p>
        <h3 class="regular-font dark-text">Video subido:</h3>
        <video :src=" `http://localhost/media/${ result.video }` " controls></video>
        <hr>
        <div class="patients-table">
          <span class="regular-font">Punto</span>
          <span class="regular-font">Ángulo mínimo esperado</span>
          <span class="regular-font">Ángulo mínimo</span>
          <span class="regular-font">Ángulo máximo esperado</span>
          <span class="regular-font">Ángulo máximo</span>
          <template v-for="point in result_tracked_points" :key="point.id">
            <span class="light-font">{{point.point_tracked_name}}</span>
            <span class="light-font">{{parseFloat(point.expected_min_angle).toFixed(2)}}</span>
            <span class="light-font">{{parseFloat(point.min_angle).toFixed(2)}}</span>
            <span class="light-font">{{parseFloat(point.expected_max_angle).toFixed(2)}}</span>
            <span class="light-font">{{parseFloat(point.max_angle).toFixed(2)}}</span>
          </template>
        </div> 
      </div>
    </div>
    <div class="actions-container">
      <div class="actions-wrapper">
        <div class="form-group">
          <label for="description" class="light-font dark-text"
            >Concepto</label
          >
          <textarea
            name="description"
            id="description"
            class="light-font"
            cols="30"
            rows="10"
            placeholder="Dale un análisis al ejercicio que acabas de ver"
            v-model="concept"
          ></textarea>

          <button class="btn btn-success btn-lg" @click="sendConcept">
            <plus />
            <cached v-if="loading" class="rotate" />
            <span v-else>Enviar concepto</span>
          </button>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script>
import Http from '@/lib/http';
import '@/styles/views/view_routine.scss';
import { Plus, Cached } from "mdue";

export default {
  name: 'ViewExercise',
  async beforeMount() {
    await this.getResult();
  },
  components: {
    Plus, Cached
  },
  methods: {
    async sendConcept() {
      const http = new Http();
      const response = await http.authPost(
        `/exercise_results/${this.$route.params.result_id}/concept`,
        {
          concept: this.concept
        }
      )
      if (response.status === 201) {
        this.$router.go()
      }
    },
    async getResult() {
      const http = new Http();
      const response = await http.authGet(
        `/exercise_results?exercise_result_id=${this.$route.params.result_id}`
      );
      if (response.status !== 404) {
        this.result = response.data;
        this.exercise_name = this.result.exercise.name;
        if (this.result.concept) {
          this.concept = this.result.concept
        }
        console.log(this.result)
        if (this.result.status === "Video procesado") {
          await this.getDifficulties();
        }
      } else {
        console.log("TODO: route to 404");
      }
    },
    async getDifficulties() {
      const http = new Http();

      const difficultiesResponse = await http.authGet(
        `/scheduled_training/diffs?scheduled_training_id=${this.$route.params.scheduled_training_id}&exercise_id=${this.result.exercise.id}`
      );
      if (difficultiesResponse.status !== 200) {
        console.error("Error on fetch");
        return;
      }
      const difficulty = difficultiesResponse.data;
      
      this.result_tracked_points = this.result.points.map(
        point => {
          const diffRange = difficulty.difficulty.ranges.find(
            range => range.point_tracked.skeleton_point_id === point.point_tracked.skeleton_point_id
          )
          console.log(difficulty.difficulty.ranges)
          if (diffRange)
            return {
              point_tracked_name: point.point_tracked.skeleton_point.verbose,
              expected_min_angle: diffRange.min_angle,
              expected_max_angle: diffRange.max_angle,
              min_angle: point.min_angle,
              max_angle: point.max_angle
            }
        }
      )

    },
    async getPointsTracked() {}
    // async getDifficulties() {
    //   const http = new Http();
      
    // },
  },
  data() {
    return {
      result: {},
      exercise_name: '',
      result_tracked_points: [],
      loading: false,
      concept: ''
    };
  },
};
</script>

<style lang="scss" scoped>
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
    height: 40vh;
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
.patients-table {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  margin-bottom: 20px;
  span {
    padding-left: 10px;
  }
}
.form-group > .btn {
  height: 2em;
}
</style>