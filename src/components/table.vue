<template>
  <div class="table">
    <div class="table__header">
      <div
        class="table__header--item dark-bg"
        v-for="(column, idx) in columns_header"
        :key="idx"
      >
        <span class="header--title light-text light-font">{{ column }}</span>
      </div>
    </div>
    <div class="table__loading" v-if="loading">
      <span class="dark-text regular-font">Cargando...</span>
    </div>
    <div class="table__loading" v-if="table_data.length === 0">
      <span class="dark-text regular-font">No hay información</span>
    </div>
    <div class="table__data" v-if="!loading">
      <div
        class="table__data__row light-bg"
        v-for="(row, idx) in table_data"
        :key="idx"
      >
        <div
          class="table__data__cell light-bg"
          v-for="(cell, idx) in row"
          :key="idx"
        >
          <span class="dark-text light-font">{{ cell }}</span>
        </div>
        <div
          class="table__data__cell table__data__cell--action"
          v-if="has_actions"
        >
          <button
            class="btn btn-dark"
            :id="'detail-' + row[0]"
            @click="() => $emit('detail', row[0])"
            v-if="actions.includes('detail')"
          >
            <eye-plus class="light-text" />
            <span>Ver más</span>
          </button>
          <button
            class="btn btn-muted"
            :id="'update-' + row[0]"
            @click="() => $emit('update', row[0])"
            v-if="actions.includes('update')"
          >
            <lead-pencil class="" />
            <span>Actualizar</span>
          </button>
          <button
            class="btn btn-danger"
            :id="'delete-' + row[0]"
            @click="() => $emit('delete', row[0])"
            v-if="actions.includes('delete')"
          >
            <delete-empty class="light-text" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Http from "../lib/http";
import { LeadPencil, DeleteEmpty, EyePlus } from "mdue";
import { get } from "simple-object-query";

export default {
  name: "Table",
  props: ["columns", "actions", "api_endpoint", "sorting_column"],

  components: {
    LeadPencil,
    DeleteEmpty,
    EyePlus,
  },

  methods: {
    async callAPI() {
      this.loading = true;
      const http = new Http();
      const response = await http.authGet(this.api_endpoint);
      this.mapData(response);
      this.loading = false;
    },
    mapHeader() {
      this.columns_header = [...this.columns.map((column) => column.verbose)];
      if (this.has_actions) {
        this.columns_header.push("Acciones");
      }
    },
    mapData(response) {
      if (response.status !== 200) {
        console.error("Error on fetch");
        return;
      }
      console.log(response.data)
      if (Object.prototype.hasOwnProperty.call(response.data, "results")) {
        console.log('herer')
        response.data.results
          .sort((a, b) => a[this.sorting_column] - b[this.sorting_column])
          .forEach((row) =>
            this.table_data.push(this.columns.map((column) => get(row, column.query)))
          );
      } else {
        response.data
          .sort((a, b) => a[this.sorting_column] - b[this.sorting_column])
          .forEach((row) =>
            this.table_data.push(this.columns.map((column) => get(row, column.query)))
          );
      }
    },
  },

  beforeMount() {
    if (!this.columns || !this.api_endpoint) {
      console.error(
        "Bad configuration",
        `columns ${this.columns}`,
        `endpoint ${this.api_endpoint}`
      );
      return;
    }
    this.has_actions = this.actions.length !== 0;
    console.log("this.has_actions", this.has_actions, this.actions)
    this.mapHeader();
    this.callAPI();
  },

  data() {
    return {
      loading: false,
      columns_header: [],
      has_actions: false,
      table_data: [],
    };
  },
};
</script>

<style>
.table {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.table__header {
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: center;
}
.table__header--item {
  margin: 0 10px;
  padding: 5px;
  width: 100%;
  display: flex;
  justify-content: center;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}
.table__data__row {
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: center;
}
.table__data__cell {
  margin: 0 10px;
  padding: 5px;
  width: 100%;
  display: flex;
  justify-content: flex-start;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}
.table__data__cell--action {
  display: flex;
  flex-wrap: wrap;
}
.table__loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}
</style>
