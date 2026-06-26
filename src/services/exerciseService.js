import Http from "@/lib/http";
import FirebaseService from "@/lib/firebaseService";

class ExerciseService {
  async updateMetadata(exerciseId, payload) {
    const http = new Http();
    return http.authPut(`/exercises/${exerciseId}/`, payload);
  }

  // sube el archivo directamente al backend (FormData)
  async uploadVideoToBackend(exerciseId, file, points = "", onProgress) {
    const http = new Http();
    const form = new FormData();
    form.append("video", file);
    // Si points es un array (nuevo formato JSON), lo stringificamos
    if (Array.isArray(points)) {
      form.append("points", JSON.stringify(points));
    } else {
      form.append("points", points);
    }
    // onProgress no es soportado por fetch, lo dejamos para compatibilidad con UI
    return http.postFormData(`/exercises/${exerciseId}/video/`, form, http.authHeader());
  }

  // sube a Firebase y avisa al backend con la URL resultante
  async uploadVideoToFirebaseThenNotifyBackend(exerciseId, file, points = "", onProgress) {
    const folder = `exercises/${exerciseId}`;
    const filename = `${exerciseId}_${Date.now()}_${file.name}`;
    const { url } = await FirebaseService.uploadFile(file, folder, filename, onProgress);
    const http = new Http();
    return http.authPost(`/exercises/${exerciseId}/video/`, { video: url, points });
  }

  // función de alto nivel que aplica la lógica: metadata + video (opcional) + points
  async saveExercise({ exerciseId, metadata, file = null, points = "", existingVideoUrl = null, useFirebase = true, onProgress }) {
    // 1) actualizar metadata si existe
    if (metadata) {
      const metaResp = await this.updateMetadata(exerciseId, metadata);
      const status = metaResp.request?.status ?? metaResp.status;
      if (![200, 201].includes(status)) {
        return { ok: false, step: "metadata", response: metaResp };
      }
    }

    // 2) subir video si se proporcionó o actualizar puntos si cambiaron y hay un video existente
    if (file) {
      try {
        let uploadResp;
        if (useFirebase) {
          uploadResp = await this.uploadVideoToFirebaseThenNotifyBackend(exerciseId, file, points, onProgress);
        } else {
          uploadResp = await this.uploadVideoToBackend(exerciseId, file, points, onProgress);
        }
        const status = uploadResp.request?.status ?? uploadResp.status;
        if (![200, 201].includes(status)) {
          return { ok: false, step: "video", response: uploadResp };
        }
        return { ok: true, step: "video", response: uploadResp };
      } catch (err) {
        return { ok: false, step: "video", error: err };
      }
    } else if (existingVideoUrl && points) {
      try {
        const http = new Http();
        const resp = await http.authPost(`/exercises/${exerciseId}/video/`, { video: existingVideoUrl, points });
        const status = resp.request?.status ?? resp.status;
        if (![200, 201].includes(status)) {
          return { ok: false, step: "points", response: resp };
        }
        return { ok: true, step: "points", response: resp };
      } catch (err) {
        return { ok: false, step: "points", error: err };
      }
    }

    return { ok: true, step: "metadata-only" };
  }
}

export default new ExerciseService();