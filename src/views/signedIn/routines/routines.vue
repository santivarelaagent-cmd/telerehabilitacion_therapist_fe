<template>
  <ListModel
    title="Rutinas"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID' },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' },
      ],
      actions: ['detail', 'update', 'delete'],
      api_endpoint: '/routines/',
      sorting_column: 'id',
    }"
    @go-to-create="$router.push({ name: 'new_routine' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
  />
</template>

<script>
import ListModel from "@/components/listModel";
import Http from "@/lib/http";
export default {
  name: "Routines",
  components: {
    ListModel,
  },
  methods: {
    goToUpdate(routine_id) {
      console.log("Update the element", routine_id);
    },
    goToDelete(routine_id) {
      const http = new Http();
      http.authDelete(`/routines/${routine_id}/`)
        .then(response => this.$router.go())
        .catch(error => console.error(error))
    },
    goToDetail(routine_id) {
      console.log("Detail the element", routine_id);
    },
  },
};
</script>
