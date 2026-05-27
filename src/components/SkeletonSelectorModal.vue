<template>
  <transition name="modal">
    <div class="modal-mask" v-if="visible" @click.self="close">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Seleccionar Puntos a Rastrear</h3>
            <button class="close-btn" @click="close">&times;</button>
          </div>

          <div class="modal-body">
            <p class="instruction">
              Haz clic sobre los círculos del esqueleto para seleccionar los puntos que deseas seguir durante el ejercicio.
            </p>
            
            <div class="svg-container">
              <svg viewBox="0 0 100 160" class="skeleton-svg">
                <!-- Lines -->
                <line 
                  v-for="(conn, idx) in POSE_CONNECTIONS" 
                  :key="'line-'+idx"
                  :x1="points[conn[0]].x" :y1="points[conn[0]].y"
                  :x2="points[conn[1]].x" :y2="points[conn[1]].y"
                  class="bone-line"
                />

                <!-- Points -->
                <circle
                  v-for="(pt, idx) in points"
                  :key="'pt-'+idx"
                  :cx="pt.x" :cy="pt.y"
                  :r="isSelected(idx) ? 3 : 2"
                  :class="['joint-circle', { 'selected': isSelected(idx) }]"
                  @click="togglePoint(idx)"
                >
                  <title>{{ getPointName(idx) }}</title>
                </circle>
              </svg>
            </div>

            <div class="chips-container">
              <span v-if="localSelected.length === 0" class="light-italic-font muted-text">
                No hay puntos seleccionados
              </span>
              <div 
                v-for="ptId in localSelected" 
                :key="'chip-'+ptId" 
                class="chip"
              >
                {{ getPointName(ptId) }}
                <span class="chip-close" @click="togglePoint(ptId)">&times;</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="close">Cancelar</button>
            <button class="btn btn-success" @click="confirmSelection">Guardar Selección</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { POSE_CONNECTIONS } from '@/views/signedIn/3d_viewer/utils/constants';

export default {
  name: 'SkeletonSelectorModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    initialSelected: {
      type: Array,
      default: () => []
    },
    availablePoints: {
      type: Array,
      default: () => [] // The verbose mapping from API
    }
  },
  data() {
    return {
      localSelected: [],
      POSE_CONNECTIONS,
      points: [
        { x: 50, y: 10 }, // 0: nose
        { x: 52, y: 8 },  // 1: left eye inner
        { x: 54, y: 8 },  // 2: left eye
        { x: 56, y: 8 },  // 3: left eye outer
        { x: 48, y: 8 },  // 4: right eye inner
        { x: 46, y: 8 },  // 5: right eye
        { x: 44, y: 8 },  // 6: right eye outer
        { x: 60, y: 10 }, // 7: left ear
        { x: 40, y: 10 }, // 8: right ear
        { x: 53, y: 14 }, // 9: mouth left
        { x: 47, y: 14 }, // 10: mouth right
        { x: 65, y: 30 }, // 11: left shoulder
        { x: 35, y: 30 }, // 12: right shoulder
        { x: 75, y: 55 }, // 13: left elbow
        { x: 25, y: 55 }, // 14: right elbow
        { x: 80, y: 80 }, // 15: left wrist
        { x: 20, y: 80 }, // 16: right wrist
        { x: 83, y: 85 }, // 17: left pinky
        { x: 17, y: 85 }, // 18: right pinky
        { x: 81, y: 87 }, // 19: left index
        { x: 19, y: 87 }, // 20: right index
        { x: 78, y: 84 }, // 21: left thumb
        { x: 22, y: 84 }, // 22: right thumb
        { x: 58, y: 80 }, // 23: left hip
        { x: 42, y: 80 }, // 24: right hip
        { x: 60, y: 110 },// 25: left knee
        { x: 40, y: 110 },// 26: right knee
        { x: 60, y: 140 },// 27: left ankle
        { x: 40, y: 140 },// 28: right ankle
        { x: 62, y: 145 },// 29: left heel
        { x: 38, y: 145 },// 30: right heel
        { x: 56, y: 148 },// 31: left foot index
        { x: 44, y: 148 } // 32: right foot index
      ]
    };
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.localSelected = [...this.initialSelected];
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:visible', false);
    },
    confirmSelection() {
      this.$emit('saved', this.localSelected);
      this.close();
    },
    isSelected(idx) {
      return this.localSelected.includes(idx);
    },
    togglePoint(idx) {
      const pos = this.localSelected.indexOf(idx);
      if (pos > -1) {
        this.localSelected.splice(pos, 1);
      } else {
        this.localSelected.push(idx);
      }
    },
    getPointName(idx) {
      const match = this.availablePoints.find(p => p.id === idx || p.value === idx);
      return match ? (match.verbose || match.label) : `Punto ${idx}`;
    }
  }
};
</script>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  transition: opacity 0.3s ease;
  align-items: center;
  justify-content: center;
}

.modal-container {
  width: 90%;
  max-width: 500px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif;
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  text-align: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #aaa;
  position: absolute;
  right: 24px;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.instruction {
  font-size: 0.9rem;
  color: #666;
  text-align: center;
  margin-bottom: 20px;
}

.svg-container {
  width: 100%;
  max-width: 250px;
  background: #f4f7f6;
  border-radius: 12px;
  padding: 20px 0;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
}

.skeleton-svg {
  width: 100%;
  height: auto;
  display: block;
}

.bone-line {
  stroke: #ccc;
  stroke-width: 1;
}

.joint-circle {
  fill: #fff;
  stroke: #4BC0C0;
  stroke-width: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.joint-circle:hover {
  fill: #e0f7fa;
  stroke-width: 1.5;
}

.joint-circle.selected {
  fill: #FF3366;
  stroke: #FF3366;
  r: 3;
}

.chips-container {
  margin-top: 20px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
}

.chip {
  background-color: #4BC0C0;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  border: none;
}

.chip-close {
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  line-height: 1;
  opacity: 0.8;
}

.chip-close:hover {
  opacity: 1;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-success {
  background: #4BC0C0;
  color: white;
}

/* Transitions */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
