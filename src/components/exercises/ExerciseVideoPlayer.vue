<template>
  <div ref="videoContainer" style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
    <video
      ref="video"
      :src="videoSrc"
      controls
      controlsList="nofullscreen"
      crossorigin="anonymous"
      @loadedmetadata="onLoadedMetadata"
      @durationchange="onDurationChange"
      @canplay="onCanPlay"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @seeked="onSeeked"
      style="width: 100%; max-height: 100vh; object-fit: contain; z-index: 1;"
    ></video>
    <canvas
      ref="canvas"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; z-index: 2;"
    ></canvas>
    <div @click="togglePlayPause" style="position: absolute; top: 0; left: 0; width: 100%; height: calc(100% - 60px); z-index: 5; cursor: pointer;" title="Pausar / Reanudar"></div>
    <button @click="toggleFullScreen" class="floating-fullscreen-btn" title="Pantalla Completa">
      <Fullscreen />
    </button>
    <button @click="toggleSkeleton" :class="['floating-skeleton-btn', { active: showSkeleton }]" :title="showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'">
      <Human />
    </button>
    <button @click="toggleAdjacents" :class="['floating-adjacents-btn', { active: showAdjacents }]" :title="showAdjacents ? 'Ocultar Conexiones' : 'Mostrar Conexiones'">
      <RunFast />
    </button>
    <button @click="toggleAngleMode" :class="['floating-mode-btn', { active: angleMode === '3d' }]" :title="angleMode === '3d' ? 'Cambiar a 2D Proyectado' : 'Cambiar a 3D Biomecánico'">
      <Cube v-if="angleMode === '3d'" />
      <Square v-else />
    </button>

    <!-- Indicador de modo de cálculo de ángulos -->
    <div class="video-mode-indicator">
      <span>{{ angleMode === '3d' ? '3D Biomecánico (Sensores)' : '2D Proyectado (Pantallazo)' }}</span>
    </div>
  </div>
</template>

<script>
import { Fullscreen, Cube, Square, Human, RunFast } from 'mdue';
import PoseLandmarkerService from '@/services/poseLandmarkerService';

export default {
  name: 'ExerciseVideoPlayer',
  components: { Fullscreen, Cube, Square, Human, RunFast },
  props: {
    videoSrc: { type: String, required: true },
    trackedPoints: { type: Array, required: true, default: () => [] },
    angleMode: { type: String, required: true, default: '3d' },
    mediaPipeModel: { type: String, required: false, default: 'lite' }
  },
  emits: ['update:angleMode', 'metadata-loaded', 'progress-update', 'model-changing'],
  data() {
    return {
      showSkeleton: true,
      showAdjacents: false
    };
  },
  async mounted() {
    this.poseService = new PoseLandmarkerService();
    this.poseService.setAngleMode(this.angleMode);
    await this.poseService.initialize(this.mediaPipeModel);
  },
  beforeUnmount() {
    this.detectionActive = false;
    this.poseService?.destroy();
  },
  watch: {
    angleMode(newMode) {
      this.poseService?.setAngleMode(newMode);
    },
    async mediaPipeModel(newModel) {
      if (this.poseService) {
        const wasActive = this.detectionActive;
        this.stopDetection();
        this.$emit('model-changing', true);
        
        // Darle un respiro al DOM para que actualice la UI antes del bloqueo intenso de WebAssembly/GPU
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await this.poseService.initialize(newModel);
        
        this.$emit('model-changing', false);
        if (wasActive) {
          this.startDetection();
        } else {
          this.detectSingleFrame();
        }
      }
    }
  },
  methods: {
    // ─── Eventos del Video ──────────────────────────────────────────────
    onLoadedMetadata(e) {
      this.$emit('metadata-loaded', e.target.duration);
    },
    onDurationChange(e) {
      this.$emit('metadata-loaded', e.target.duration);
    },
    onCanPlay(e) {
      this.$emit('metadata-loaded', e.target.duration);
    },
    onPlay() {
      this.startDetection();
    },
    onPause() {
      this.stopDetection();
    },
    onEnded() {
      this.stopDetection();
    },
    onSeeked() {
      this.detectSingleFrame();
    },

    // ─── Controles ──────────────────────────────────────────────────────
    togglePlayPause() {
      const video = this.$refs.video;
      if (!video) return;
      video.paused ? video.play() : video.pause();
    },
    toggleFullScreen() {
      const elem = this.$refs.videoContainer;
      if (!elem) return;
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => console.error('Error pantalla completa:', err));
      } else {
        document.exitFullscreen();
      }
    },
    toggleSkeleton() {
      this.showSkeleton = !this.showSkeleton;
      const canvas = this.$refs.canvas;
      const video = this.$refs.video;

      if (!this.showSkeleton) {
        this.stopDetection();
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        if (video) {
          if (!video.paused && !video.ended) {
            this.startDetection();
          } else {
            this.detectSingleFrame();
          }
        }
      }
    },
    toggleAdjacents() {
      this.showAdjacents = !this.showAdjacents;
      if (this.showAdjacents && !this.showSkeleton) {
        this.showSkeleton = true;
      }
      const video = this.$refs.video;
      if (video) {
        if (!video.paused && !video.ended) {
          if (!this.detectionActive) {
            this.startDetection();
          }
        } else {
          this.detectSingleFrame();
        }
      }
    },
    toggleAngleMode() {
      const newMode = this.angleMode === '3d' ? '2d' : '3d';
      this.$emit('update:angleMode', newMode);
      
      this.$nextTick(() => {
        const video = this.$refs.video;
        if (video) {
          if (!video.paused && !video.ended) {
            if (!this.detectionActive) {
              this.startDetection();
            }
          } else {
            this.detectSingleFrame();
          }
        }
      });
    },

    // ─── Detección MediaPipe Foreground ─────────────────────────────────
    startDetection() {
      if (!this.showSkeleton) return;
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas || !this.poseService) return;
      if (this.detectionActive) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      this.poseService.createDrawingUtils(canvas.getContext('2d'));
      this.detectionActive = true;

      const processFrame = async () => {
        if (!this.detectionActive || !video || video.paused || video.ended) {
          this.detectionActive = false;
          return;
        }
        try {
          const timestamp = performance.now();
          await this.poseService.detectForVideo(
            video, canvas, timestamp, this.trackedPoints, null, this.showAdjacents
          );
        } catch (e) {
          console.error('Error en renderLoop:', e);
          import('../../services/mediaPipeProvider').then(({ default: provider }) => {
            provider.destroy();
          });
          this.stopDetection();
        }
        if (!this.detectionActive) return;
        
        if (video.requestVideoFrameCallback) {
          video.requestVideoFrameCallback(processFrame);
        } else {
          requestAnimationFrame(processFrame);
        }
      };

      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(processFrame);
      } else {
        requestAnimationFrame(processFrame);
      }
    },
    stopDetection() {
      this.detectionActive = false;
    },
    detectSingleFrame() {
      if (!this.showSkeleton) return;
      const video = this.$refs.video;
      if (!video) return;
      if (video.paused) {
        this._runSingleFrameDetection();
      } else {
        this.startDetection();
      }
    },
    async _runSingleFrameDetection() {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas || !this.poseService) return;
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        this.poseService.createDrawingUtils(canvas.getContext('2d'));
        await this.poseService.detectForVideo(
          video, canvas, performance.now(), this.trackedPoints, null, this.showAdjacents
        );
      } catch (e) {
        console.error('Error en _runSingleFrameDetection:', e);
      }
    },
    
    // Método público para obtener el duration si se necesita por ref
    getDuration() {
      return this.$refs.video?.duration || 0;
    }
  }
}
</script>

<style scoped lang="scss">
.floating-fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(0, 0, 0, 0.8);
    transform: scale(1.05);
  }

  svg { font-size: 30px; }
}

.floating-skeleton-btn {
  position: absolute;
  top: 70px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(75, 192, 192, 0.8);
    color: white;
    &:hover { background-color: rgba(75, 192, 192, 1); }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg { font-size: 30px; }
}

.floating-adjacents-btn {
  position: absolute;
  top: 120px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(59, 130, 246, 0.8);
    color: white;
    &:hover { background-color: rgba(59, 130, 246, 1); }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg { font-size: 30px; }
}

.floating-mode-btn {
  position: absolute;
  top: 170px;
  right: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.active {
    background-color: rgba(16, 185, 129, 0.8);
    color: white;
    &:hover { background-color: rgba(16, 185, 129, 1); }
  }

  &:not(.active):hover {
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    transform: scale(1.05);
  }

  svg { font-size: 30px; }
}

.video-mode-indicator {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  font-family: 'Outfit', sans-serif;
  letter-spacing: 0.02em;
}
</style>
