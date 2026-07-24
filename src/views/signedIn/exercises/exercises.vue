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
      const confirmed = confirm(`¿Estás seguro de que deseas eliminar el ejercicio #${id}? Esta acción no se puede deshacer.`);
      if (!confirmed) return;

      try {
        const http = new Http();
        const response = await http.authDelete(`/exercises/${id}/`);
        const status = response.request?.status ?? response.status;
        if (status === 204 || status === 200) {
          alert('Ejercicio eliminado correctamente.');
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

