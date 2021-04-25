<template>
  <ListModel
    title="Terapias"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID' },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' }
      ],
      actions: ['detail', 'update', 'delete'],
      api_endpoint: '/therapies/',
      sorting_column: 'id'
    }"
    @go-to-create="$router.push({ name: 'new_therapy' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
  />
</template>

<script>
import ListModel from '../../../components/listModel';
import Http from '@/lib/http';
export default {
  name: 'Therapies',
  components: {
    ListModel
  },
  methods: {
    goToDelete(therapy_id) {
      const http = new Http();
      http.authDelete(`/therapies/${therapy_id}/`)
        .then(response => this.$router.go())
        .catch(response => console.error(response))
    },
    goToUpdate(therapy_id) {
      this.$router.push({ name: 'edit_therapy', params: { therapy_id } });
    },
    goToDetail(therapy_id) {
      this.$router.push({ name: 'view_therapy', params: { therapy_id } });
    }
  }
};
</script>
