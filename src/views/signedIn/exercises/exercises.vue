<template>
  <ListModel
    title="Ejercicios"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID' },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' },
      ],
      actions: ['detail', 'update', 'delete'],
      api_endpoint: '/exercises/',
    }"
    @go-to-create="$router.push({ name: 'new_exercise' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
  />
</template>

<script>
import ListModel from "../../../components/listModel";
export default {
  name: "Exercises",
  components: {
    ListModel,
  },
  methods: {
    goToUpdate(id) {
      console.log("Update the element", id);
    },
    goToDelete(id) {
      console.log("Delete the element", id);
    },
    goToDetail(id) {
      console.log("Detail the element", id);
    },
  },
};
</script>