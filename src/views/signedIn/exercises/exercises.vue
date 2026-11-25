  <template>
  <ListModel
    title="Ejercicios"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID' },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' },
        { query: 'status', verbose: 'Estado' },
      ],
      actions: ['detail', 'update', 'delete'],
      api_endpoint: '/exercises/',
      sorting_column: 'id',
    }"
    @go-to-create="$router.push({ name: 'new_exercise' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
  />
</template>

<script>
import ListModel from "../../../components/listModel";
import Http from "@/lib/http";
import FirebaseService from "@/lib/firebaseService";

export default {
  name: "Exercises",
  components: {
    ListModel,
  },
  methods: {
    goToUpdate(exercise_id) {
      this.$router.push({
        name: "edit_exercise",
        params: { exercise_id },
      });
    },
    async goToDelete(id) {
      const confirmed = confirm(`¿Estás seguro de que deseas eliminar el ejercicio #${id}? Esta acción eliminará el ejercicio y su video asociado en Firebase.`);
      if (!confirmed) return;

      try {
        const http = new Http();

        // 1. Obtener la información del ejercicio para conocer la URL de su video en Firebase si existe
        let videoUrl = null;
        try {
          const detailResp = await http.authGet(`/exercises/${id}/`);
          const data = detailResp.data || (detailResp.request?.json ? await detailResp.request.json() : null);
          if (data && data.video) {
            videoUrl = data.video;
          }
        } catch (fetchErr) {
          console.warn('No se pudo obtener el detalle del ejercicio antes de borrar:', fetchErr);
        }

        // 2. Eliminar el registro en la base de datos de Django
        const response = await http.authDelete(`/exercises/${id}/`);
        const status = response.request?.status ?? response.status;
        if (status === 204 || status === 200) {
          // 3. Si se eliminó de Django y tenía un video alojado en Firebase, eliminarlo de Firebase Storage
          if (videoUrl && (videoUrl.includes('firebasestorage.googleapis.com') || videoUrl.includes('firebase'))) {
            await FirebaseService.deleteFile(videoUrl);
          }

          alert('Ejercicio y video eliminados correctamente.');
          // Refrescar la página para actualizar la lista
          this.$router.go(0);
        } else {
          alert(`Error al eliminar el ejercicio. Estado: ${status}`);
        }
      } catch (error) {
        console.error('Error al eliminar ejercicio:', error);
        alert('Error inesperado al eliminar el ejercicio.');
      }
    },
    goToDetail(exercise_id) {
      this.$router.push({
        name: "view_exercise",
        params: { exercise_id },
      });
    },
  },
};
</script>

