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
          <!-- Indicador de estado del video actual -->
          <div class="form-group">
            <label class="light-font dark-text">Estado del video actual</label>
            <div :class="['video-status-indicator', exercise.video ? 'has-video' : 'no-video']">
              <span v-if="exercise.video" class="video-status-icon">✅</span>
              <span v-else class="video-status-icon">❌</span>
              <span class="video-status-text">
                {{ exercise.video ? 'Video cargado correctamente' : 'Sin video asociado' }}
              </span>
            </div>
            <a v-if="exercise.video" :href="exercise.video" target="_blank" rel="noopener" class="video-preview-link">
              🔗 Ver video actual
            </a>
          </div>
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
            <!-- Barra de progreso de subida -->
            <div v-if="uploadStatus === 'uploading'" class="upload-status-msg uploading">
              ⏳ Subiendo video a Firebase... {{ uploadProgress }}%
            </div>
            <div v-if="uploadStatus === 'uploading'" class="upload-progress-container">
              <div class="upload-progress-bar" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <div v-if="uploadStatus === 'success'" class="upload-status-msg success">
              ✅ Video subido exitosamente a Firebase
            </div>
            <div v-if="uploadStatus === 'error'" class="upload-status-msg error">
              ❌ Error al subir el video
            </div>
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
                <div v-for="entry in selected_points" :key="'main-chip-'+entry.skeleton_point_id" style="background-color: #4BC0C0; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 6px; font-weight: 600; border: none; overflow: hidden;">
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ getPointName(entry.skeleton_point_id) }}</span>
                  <span style="cursor: pointer; font-weight: bold; font-size: 1.1rem; opacity: 0.8; flex-shrink: 0;" @click="removePoint(entry.skeleton_point_id)">&times;</span>
                </div>
              </div>

              <SkeletonSelectorModal 
                :visible="isModalVisible" 
                @update:visible="isModalVisible = $event"
                :initialSelected="selected_points"
                :availablePoints="skeleton_points"
                @saved="onPointsSaved"
              />
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-success btn-lg" style="margin-top: 24px;" :disabled="loading">
          <plus />
          <cached v-if="loading" class="rotate" />
          <span v-if="uploadStatus === 'uploading'">Guardando y subiendo video... {{ uploadProgress }}%</span>
          <span v-else-if="loading">Guardando...</span>
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
      this.selected_points = this.selected_points.filter(p => p.skeleton_point_id !== id);
    },
    getPointName(pointId) {
      const match = this.skeleton_points.find(p => p.id === pointId || p.value === pointId);
      return match ? (match.verbose || match.label) : `Punto ${pointId}`;
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
        await this.getPointsTracked()
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
      // Mapear los puntos rastreados a objetos ricos para el selector
      this.selected_points = response.data.map(pt => ({
        skeleton_point_id: pt.id,
        left_point_id: pt.left_point ?? null,
        right_point_id: pt.right_point ?? null
      }))
    },
    pointsHaveChanged() {
      if (this.selected_points.length !== this.tracked_points.length) return true;
      for (const sel of this.selected_points) {
        const match = this.tracked_points.find(tp => tp.id === sel.skeleton_point_id);
        if (!match) return true;

        const selLeft = sel.left_point_id ?? null;
        const selRight = sel.right_point_id ?? null;
        const matchLeft = match.left_point ?? null;
        const matchRight = match.right_point ?? null;

        if (selLeft !== matchLeft || selRight !== matchRight) return true;
      }
      return false;
    },
    async saveExercise() {
      this.loading = true
      try {
        const metaChanged = this.formHasChanged()
        const ptsChanged = this.pointsHaveChanged()
        const videoChanged = !!this.video

        if (!metaChanged && !ptsChanged && !videoChanged) {
          console.log('No changes detected, returning')
          this.$router.push({ name: 'exercises' })
          return
        }

        // Validación de metadatos si han cambiado
        if (metaChanged) {
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
        }

        const meta = metaChanged ? {
          name: this.name,
          description: this.description,
          routine_id: parseInt(this.routine),
          order: this.order,
          is_model: this.is_model,
        } : null

        // Preparar puntos en formato JSON array
        const points = (ptsChanged || videoChanged) ? (this.selected_points || []).map(p => ({
          skeleton_point_id: p.skeleton_point_id,
          left_point_id: p.left_point_id ?? null,
          right_point_id: p.right_point_id ?? null
        })) : null

        if (videoChanged) {
          this.uploadStatus = 'uploading';
        }

        const result = await ExerciseService.saveExercise({
          exerciseId: this.$route.params.exercise_id,
          metadata: meta,
          file: this.video,
          points: points,
          existingVideoUrl: (ptsChanged && !videoChanged) ? this.exercise.video : null,
          useFirebase: true,
          onProgress: (pct) => (this.uploadProgress = pct),
        })

        if (result.ok) {
          if (videoChanged) {
            this.uploadStatus = 'success';
            this.uploadProgress = 100;
            // Esperar 2 segundos para mostrar el mensaje de éxito
            await new Promise(r => setTimeout(r, 2000));
          }
          this.$router.push({ name: 'exercises' })
        } else {
          this.uploadStatus = 'error';
          this.error_msg = `Error en ${result.step}`
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
      uploadStatus: '', // '' | 'uploading' | 'success' | 'error'
      video: null,
    }
  },
}
</script>

<style scoped>
.video-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.9em;
  margin-bottom: 8px;
}
.video-status-indicator.has-video {
  background: #e8f5e9;
  border: 1px solid #66bb6a;
  color: #2e7d32;
}
.video-status-indicator.no-video {
  background: #fbe9e7;
  border: 1px solid #ef5350;
  color: #c62828;
}
.video-status-icon { font-size: 1.2em; }
.video-status-text { font-weight: 600; }
.video-preview-link {
  display: inline-block;
  color: #4BC0C0;
  font-size: 0.85em;
  text-decoration: none;
  margin-bottom: 12px;
}
.video-preview-link:hover { text-decoration: underline; }
.upload-progress-container {
  position: relative;
  width: 100%;
  height: 22px;
  background: #e0e0e0;
  border-radius: 11px;
  overflow: hidden;
  margin-top: 8px;
}
.upload-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4BC0C0, #36a2a2);
  border-radius: 11px;
  transition: width 0.3s ease;
}
.upload-progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75em;
  font-weight: 700;
  color: #fff;
}
.upload-status-msg {
  margin-top: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
}
.upload-status-msg.uploading {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  color: #0d47a1;
}
.upload-status-msg.success {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  color: #1b5e20;
}
.upload-status-msg.error {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  color: #b71c1c;
}
</style>
