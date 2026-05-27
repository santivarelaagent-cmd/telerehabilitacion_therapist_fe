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
        <div>
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
            <label class="light-font dark-text"
              >Seleccione los puntos a seguir</label
            >
            <div>
              <button type="button" class="btn btn-primary" @click="isModalVisible = true" style="margin-bottom: 15px; padding: 8px 16px; border-radius: 8px; border: none; background: #4BC0C0; color: white; cursor: pointer; font-weight: 600;">
                👁️ Abrir Selector Visual de Puntos
              </button>
              
              <div class="chips-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; min-height: 30px; font-family: 'Open Sans', sans-serif; margin-top: 8px;">
                <span v-if="selected_points.length === 0" class="light-italic-font muted-text" style="grid-column: 1 / -1;">
                  Ningún punto seleccionado.
                </span>
                <div v-for="ptId in selected_points" :key="'main-chip-'+(ptId.value || ptId)" style="background-color: #4BC0C0; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 6px; font-weight: 600; border: none; overflow: hidden;">
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ getPointName(ptId.value || ptId) }}</span>
                  <span style="cursor: pointer; font-weight: bold; font-size: 1.1rem; opacity: 0.8; flex-shrink: 0;" @click="removePoint(ptId.value || ptId)">&times;</span>
                </div>
              </div>

              <SkeletonSelectorModal 
                :visible="isModalVisible" 
                @update:visible="isModalVisible = $event"
                :initialSelected="selected_points.map(p => p.value || p)"
                :availablePoints="skeleton_points"
                @saved="onPointsSaved"
              />
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-success btn-lg" style="margin-top: 24px;">
          <plus />
          <cached v-if="loading" class="rotate" />
          <span v-else>Guardar cambios</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { Plus, Cached } from 'mdue'
import Http from '@/lib/http'
import '@/styles/views/edit_exercise.scss'
import SkeletonSelectorModal from '@/components/SkeletonSelectorModal.vue'
import ExerciseService from '@/services/exerciseService'

export default {
  name: 'EditExercise',

  components: {
    Plus,
    Cached,
    SkeletonSelectorModal,
  },

  async beforeMount() {
    await this.getRoutines()
    await this.getExercise()
    await this.getSkeletonPoints()
  },

  methods: {
    onPointsSaved(points) {
      this.selected_points = points;
    },
    removePoint(id) {
      this.selected_points = this.selected_points.filter(p => (p.value || p) !== id);
    },
    getPointName(idx) {
      const match = this.skeleton_points.find(p => p.id === idx || p.value === idx);
      return match ? (match.verbose || match.label) : `Punto ${idx}`;
    },
    videoChanged(e) {
      console.log(e.target.files[0])
      this.video = e.target.files[0]
    },
    async getRoutines() {
      this.loading_routines = true
      const http = new Http()
      const response = await http.authGet('/routines/')
      if (response.status !== 200) {
        console.error('Error on fetch')
        return
      }
      this.routines = response.data.results.map((row) => ({
        id: row.id,
        name: row.name,
      }))
      this.loading_routines = false
    },
    async getExercise() {
      const http = new Http()
      const response = await http.authGet(
        `/exercises/${this.$route.params.exercise_id}`
      )
      if (response.status !== 404) {
        console.log(response.data)
        this.exercise = response.data
        this.routine = this.exercise.routine_id
        this.name = this.exercise.name
        this.description = this.exercise.description
        this.order = this.exercise.order
        this.status = this.exercise.status
        if (this.status === 'Video procesado') {
          console.log("video procesado")
          await this.getPointsTracked()
        }
      } else {
        console.log('TODO: route to 404')
      }
    },
    formHasChanged() {
      return (
        this.name !== this.exercise.name ||
        this.description !== this.exercise.description ||
        this.routine != this.exercise.routine_id ||
        this.order !== this.exercise.order
      )
    },
    async getSkeletonPoints() {
      console.log('getSkeletonPoints')
      const http = new Http()
      const response = await http.authGet('/skeleton/')
      if (response.status !== 200) {
        console.error('Error on fetch')
        return
      }
      this.skeleton_points = response.data
    },
    async getPointsTracked() {
      console.log('getPointsTracked')
      const http = new Http()
      const response = await http.authGet(
        `/exercises/${this.exercise.id}/points_tracked/`
      )
      if (response.status !== 200) {
        console.error('Error on fetch')
        return
      }
      this.tracked_points = response.data
    },
    async saveExercise() {
      this.loading = true
      try {
        if (this.formHasChanged()) {
          this.name_valid = this.name !== ''
          this.description_valid = this.description !== ''
          this.routine_valid = this.routine !== ''
          this.order_valid = !!this.order
          this.form_valid =
            this.name_valid &&
            this.description_valid &&
            this.routine_valid &&
            this.order_valid

          if (!this.form_valid) {
            this.error_msg = 'Revisa el formulario'
            this.loading = false
            return
          }

          const meta = {
            name: this.name,
            description: this.description,
            routine_id: parseInt(this.routine),
            order: this.order,
            is_model: this.is_model,
          }

          const result = await ExerciseService.saveExercise({
            exerciseId: this.$route.params.exercise_id,
            metadata: meta,
            useFirebase: true, // cambiar según preferencia
          })

          if (result.ok) {
            this.$router.push({ name: 'exercises' })
          } else {
            this.error_msg = `Error en ${result.step}`
          }
          this.loading = false
          return
        }
        console.log('no changes')
        console.log(this.selected_points)

        if (this.video) {
          console.log(this.selected_points)
          console.log(typeof this.selected_points)

          const points = (this.selected_points || [])
            .map((p) => p.value ?? p)
            .join(',')
          const result = await ExerciseService.saveExercise({
            exerciseId: this.$route.params.exercise_id,
            file: this.video,
            points,
            useFirebase: true,
            onProgress: (pct) => (this.uploadProgress = pct),
          })
          if (!result.ok) {
            this.error_msg = 'Error al subir el video'
          }
        }
      } catch (error) {
        console.error('saveExercise error', error)
        this.error_msg = 'Error inesperado al guardar el ejercicio'
      } finally {
        this.loading = false
      }
    },
  },

  data() {
    return {
      exercise: {},
      tracked_points: [],
      form_valid: true,
      routine: '',
      routine_valid: true,

      name: '',
      name_valid: true,

      description: '',
      description_valid: true,

      order: undefined,
      order_valid: true,

      status: '',

      is_model: false,

      loading: false,
      loading_routines: false,
      routines: [],
      skeleton_points: [],
      selected_points: [],
      isModalVisible: false,
      error_msg: '',
      uploadProgress: 0,
      video: null,
    }
  },
}
</script>
