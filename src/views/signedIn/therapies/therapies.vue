<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Terapias</h2>
      <button class="btn btn-success" @click="goToCreate">
        <plus class="light-text" />
        <span class="btn__label font-family light-font light-text"
          >Añadir elemento</span
        >
      </button>
    </div>
    <Table
      :columns="[
        { query: 'id', verbose: 'ID' },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' },
      ]"
      :actions="['detail', 'update', 'delete']"
      api_endpoint="/therapies/"
      @update="goToUpdate"
      @delete="goToDelete"
      @detail="goToDetail"
    />
  </div>
</template>

<script>
import { Plus } from "mdue";
import Table from "../../../components/table";
export default {
  name: "Therapies",
  components: {
    Table,
    Plus,
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

<style scoped>
.therapies {
  height: calc(100vh - 50px);
  width: 100%;
  overflow-y: scroll;
  padding: 10px;
}
.header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header__title {
  margin: 0;
}
</style>