<template>
  <div class="main-container">
    <div class="header">
      <h2 class="header__title dark-text regular-font">{{ title }}</h2>
      <button class="btn btn-success" @click="() => $emit('go-to-create')" v-if="has_new_var">
        <plus class="light-text" />
        <span class="btn__label font-family light-font light-text"
          >Añadir elemento</span
        >
      </button>
    </div>
    <Table
      :columns="table_info.columns"
      :actions="table_info.actions"
      :api_endpoint="table_info.api_endpoint"
      :sorting_column="table_info.sorting_column"
      @update="goToUpdate"
      @delete="goToDelete"
      @detail="goToDetail"
    />
  </div>
</template>

<script>
import { Plus } from "mdue";
import Table from "./table";
export default {
  name: "ListModel",
  props: ["title", "has_new", "table_info"],

  beforeMount() {
    const errorMessages = [];
    if (typeof this.has_new === 'undefined') this.has_new_var=true;
    else this.has_new_var=this.has_new;
    console.log(this.has_new_var)
    if (!this.title || typeof this.title !== "string") {
      errorMessages.push(
        "You have to pass a valid title! (It most be a string)"
      );
    }
    if (!this.table_info || typeof this.table_info !== "object") {
      errorMessages.push(
        "You have to pass a valid table info object! (It most be an object)"
      );
    } else {
      if (!Object.prototype.hasOwnProperty.call(this.table_info, "columns")) {
        errorMessages.push(
          "The table_info object have to have an array of columns"
        );
      } else if (
        !this.table_info.columns
          .map(
            (column) =>
              Object.prototype.hasOwnProperty.call(column, "query") &&
              typeof column.query === "string" &&
              Object.prototype.hasOwnProperty.call(column, "verbose") &&
              typeof column.verbose === "string"
          )
          .reduce((acc, curr) => acc && curr)
      ) {
        errorMessages.push(
          "The columns object have to have the form {query: string, verbose: string}"
        );
      }

      if (!Object.prototype.hasOwnProperty.call(this.table_info, "actions")) {
        errorMessages.push(
          "The table_info object have to have an array of actions"
        );
      } else if (
        !this.table_info.actions
          .map((action) => ["detail", "update", "delete"].includes(action))
          .reduce((acc, curr) => acc && curr)
      ) {
        errorMessages.push(
          "The actions list have to be one of: [detail, update, delete]"
        );
      }

      if (
        !Object.prototype.hasOwnProperty.call(
          this.table_info,
          "api_endpoint"
        ) ||
        typeof this.table_info.api_endpoint !== "string"
      ) {
        errorMessages.push(
          "You have to pass a valid api endpoint! (It most be a string)"
        );
      }

      if (
        !Object.prototype.hasOwnProperty.call(
          this.table_info,
          "sorting_column"
        ) ||
        typeof this.table_info.api_endpoint !== "string"
      ) {
        errorMessages.push(
          "You have to pass a valid sorting column! (It most be a string)"
        );
      }
    }
    if (errorMessages.length !== 0) {
      throw new Error(errorMessages.join("\n"));
    }
  },

  components: {
    Table,
    Plus,
  },

  methods: {
    goToUpdate(id) {
      this.$emit("go-to-update", id);
    },
    goToDelete(id) {
      this.$emit("go-to-delete", id);
    },
    goToDetail(id) {
      this.$emit("go-to-detail", id);
    },
  },

  data() {
    return {
      has_new_var: true,
    }
  }
};
</script>

<style scoped>
.main-container {
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
