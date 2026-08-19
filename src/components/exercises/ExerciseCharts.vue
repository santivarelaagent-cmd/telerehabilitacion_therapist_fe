<template>
  <div style="width: 100%; margin-top: 30px;">
    <hr>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <h3 class="regular-font dark-text" style="margin: 0;">Análisis de Movimiento en el Tiempo:</h3>
        
        <!-- Botón de apertura de modal de laboratorio -->
        <button 
          type="button" 
          class="btn-lab-trigger"
          :class="{ 'has-lab': hasLabReference }"
          @click="$emit('open-lab-modal')"
          title="Cargar y comparar con datos de referencia de sensores de laboratorio (.txt)"
        >
          <span class="lab-icon">🔬</span>
          <span v-if="!hasLabReference">Comparar con Laboratorio (.txt)</span>
          <span v-else>Lab Activo: <strong>{{ labFileName }}</strong> ({{ labOffsetLabel }})</span>
        </button>
      </div>

      <!-- Selector de Modo de Gráfica (Segmented Pill Control) -->
      <div class="chart-type-segmented-control">
        <button 
          type="button" 
          class="segment-btn"
          :class="{ active: chartType === 'angulo' }"
          @click="selectChartType('angulo')"
        >
          <span class="segment-icon">📐</span>
          <span class="segment-label">Ángulos vs Tiempo (Grados)</span>
        </button>
        <button 
          type="button" 
          class="segment-btn"
          :class="{ active: chartType === 'posicion' }"
          @click="selectChartType('posicion')"
        >
          <span class="segment-icon">📍</span>
          <span class="segment-label">Posición vs Tiempo (X, Y, Z)</span>
        </button>
      </div>
    </div>
    
    <div v-for="point in trackedPoints" :key="point.codename" style="margin-bottom: 60px; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
        <h4 class="light-font" style="margin: 0; font-size: 1.15rem; color: #1e293b;">{{ point.verbose }}</h4>
        
        <!-- Tarjetas de estadísticas y métricas -->
        <div v-if="chartStats[point.codename]" style="display: flex; gap: 8px; font-size: 0.85em; flex-wrap: wrap;">
          <template v-for="stat in chartStats[point.codename]" :key="stat.label">
            <!-- Métrica de precisión comparativa contra laboratorio -->
            <div 
              v-if="stat.isMetric" 
              style="background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-family: 'Open Sans', sans-serif; display: flex; align-items: center; gap: 6px;"
            >
              <span>🎯 Error vs Lab:</span>
              <span>MAE: <strong>{{ stat.mae }}</strong></span> &bull; 
              <span>RMSE: <strong>{{ stat.rmse }}</strong></span> &bull; 
              <span>Máx: <strong>{{ stat.maxError }}</strong></span>
            </div>

            <!-- Estadística habitual (Min, Max, Avg) -->
            <div 
              v-else
              :style="`background-color: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}50; padding: 6px 14px; border-radius: 20px; font-weight: 500; font-family: 'Open Sans', sans-serif;`"
            >
              <strong>{{ stat.label }}</strong> &bull; Mín: {{ stat.min }} &bull; Máx: {{ stat.max }} &bull; Prom: {{ stat.avg }}
            </div>
          </template>
        </div>
      </div>
      <div style="height: 360px; width: 100%; margin-top: 10px; background: #ffffff; border-radius: 12px; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;">
        <canvas :id="'chart-' + point.codename" style="width: 100%; height: 100%;"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExerciseCharts',
  props: {
    trackedPoints: {
      type: Array,
      required: true,
      default: () => []
    },
    chartStats: {
      type: Object,
      required: true,
      default: () => ({})
    },
    chartType: {
      type: String,
      required: true,
      default: 'angulo'
    },
    hasLabReference: {
      type: Boolean,
      default: false
    },
    labFileName: {
      type: String,
      default: ''
    },
    labTimeOffset: {
      type: Number,
      default: 0
    }
  },
  emits: ['update:chartType', 'refresh', 'open-lab-modal'],
  computed: {
    labOffsetLabel() {
      if (this.labTimeOffset === 0) return 'Offset: 0s';
      return (this.labTimeOffset > 0 ? `+${this.labTimeOffset.toFixed(2)}s` : `${this.labTimeOffset.toFixed(2)}s`);
    }
  },
  methods: {
    selectChartType(type) {
      if (this.chartType === type) return;
      this.$emit('update:chartType', type);
      this.$nextTick(() => {
        this.$emit('refresh');
      });
    }
  }
}
</script>

<style scoped>
.btn-lab-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Open Sans', sans-serif;
}

.btn-lab-trigger:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.btn-lab-trigger.has-lab {
  background: #ecfdf5;
  border-color: #10b981;
  color: #047857;
}

.btn-lab-trigger.has-lab:hover {
  background: #d1fae5;
}

.lab-icon {
  font-size: 1.1rem;
}

/* Control Segmentado Moderno */
.chart-type-segmented-control {
  display: inline-flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  gap: 4px;
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Open Sans', sans-serif;
  user-select: none;
}

.segment-btn:hover:not(.active) {
  color: #1e293b;
  background: rgba(255, 255, 255, 0.6);
}

.segment-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.segment-icon {
  font-size: 1rem;
}

.segment-label {
  letter-spacing: -0.01em;
}
</style>

