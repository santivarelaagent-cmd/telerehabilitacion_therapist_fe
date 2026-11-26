<template>
  <div class="table">
    <!-- Barra de búsqueda -->
    <div class="table__search">
      <div class="table__search-box">
        <magnify class="table__search-icon" aria-hidden="true" />
        <input
          type="text"
          v-model="searchQuery"
          @input="onSearchInput"
          @keyup.enter="triggerSearchNow"
          class="table__search-input"
          placeholder="Buscar por nombre, descripción o ID..."
        />
        <button
          v-if="searchQuery"
          type="button"
          class="table__search-clear"
          title="Limpiar búsqueda"
          @click="clearSearch"
        >
          <close />
        </button>
      </div>
    </div>

    <!-- Barra de paginación superior -->
    <div class="table__pagination table__pagination--top" v-if="!loading && totalItems > 0">
      <div class="pagination__info dark-text light-font">
        Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ totalItems }} registros
      </div>

      <div class="pagination__controls">
        <label class="pagination__size dark-text light-font">
          Por página:
          <select v-model.number="pageSize" @change="onPageSizeChange" class="pagination__select">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>

        <button
          class="pagination__btn"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          ‹ Anterior
        </button>

        <button
          v-for="page in visiblePages"
          :key="'top-' + page"
          class="pagination__btn"
          :class="{ 'pagination__btn--active': page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <button
          class="pagination__btn"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Siguiente ›
        </button>

        <button
          class="pagination__btn pagination__btn--refresh"
          title="Recargar desde el servidor"
          @click="refreshData"
        >
          <refresh class="pagination__refresh-icon" />
          <span>Actualizar</span>
        </button>
      </div>
    </div>

    <div class="table__header">
      <div
        class="table__header--item dark-bg"
        :class="{ 'table__header--sortable': isSortableColumn(idx) }"
        v-for="(column, idx) in columns_header"
        :key="idx"
        @click="isSortableColumn(idx) && toggleSortOrder()"
        :title="isSortableColumn(idx) ? (sortOrder === 'asc' ? 'Ordenar descendente' : 'Ordenar ascendente') : ''"
      >
        <span class="header--title light-text light-font">{{ column }}</span>
        <span v-if="isSortableColumn(idx)" class="header--sort-icon light-text">
          {{ sortOrder === 'asc' ? '▲' : '▼' }}
        </span>
      </div>
    </div>
    <div class="table__loading" v-if="loading">
      <span class="dark-text regular-font">Cargando...</span>
    </div>
    <div class="table__loading" v-else-if="table_data.length === 0">
      <span class="dark-text regular-font">No hay información</span>
    </div>
    <div class="table__data" v-if="!loading && table_data.length > 0">
      <div
        class="table__data__row light-bg"
        :class="{ 'table__data__row--selected': selectedRowId !== null && row[0] === selectedRowId }"
        v-for="(row, idx) in table_data"
        :key="row[0] !== undefined ? row[0] : idx"
      >
        <div
          class="table__data__cell light-bg"
          v-for="(cell, cIdx) in row"
          :key="cIdx"
        >
          <span
            :class="['dark-text', 'light-font', 'table__cell-text', { 'table__cell--link': isNameLinkColumn(cIdx) }]"
            :title="String(cell || '').length > 90 ? cell : ''"
            @click="isNameLinkColumn(cIdx) && handleDetail(row[0])"
          >{{ cell }}</span>
        </div>
        <div
          class="table__data__cell table__data__cell--action"
          v-if="has_actions"
        >
          <button
            class="btn btn-dark table__action-btn"
            :id="'detail-' + row[0]"
            data-tooltip="Ver más"
            aria-label="Ver más"
            @click="handleDetail(row[0])"
            v-if="actions.includes('detail')"
          >
            <eye-plus class="light-text table__action-icon" />
          </button>
          <button
            class="btn btn-muted table__action-btn"
            :id="'update-' + row[0]"
            data-tooltip="Actualizar"
            aria-label="Actualizar"
            @click="handleUpdate(row[0])"
            v-if="actions.includes('update')"
          >
            <lead-pencil class="table__action-icon" />
          </button>
          <button
            class="btn btn-danger table__action-btn"
            :id="'delete-' + row[0]"
            data-tooltip="Eliminar"
            aria-label="Eliminar"
            @click="() => $emit('delete', row[0])"
            v-if="actions.includes('delete')"
          >
            <delete-empty class="light-text table__action-icon" />
          </button>
        </div>
      </div>
    </div>

    <!-- Barra de paginación y actualización manual -->
    <div class="table__pagination" v-if="!loading && totalItems > 0">
      <div class="pagination__info dark-text light-font">
        Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ totalItems }} registros
      </div>

      <div class="pagination__controls">
        <label class="pagination__size dark-text light-font">
          Por página:
          <select v-model.number="pageSize" @change="onPageSizeChange" class="pagination__select">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>

        <button
          class="pagination__btn"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          ‹ Anterior
        </button>

        <button
          v-for="page in visiblePages"
          :key="page"
          class="pagination__btn"
          :class="{ 'pagination__btn--active': page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <button
          class="pagination__btn"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Siguiente ›
        </button>

        <button
          class="pagination__btn pagination__btn--refresh"
          title="Recargar desde el servidor"
          @click="refreshData"
        >
          <refresh class="pagination__refresh-icon" />
          <span>Actualizar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Http from "../lib/http";
import { LeadPencil, DeleteEmpty, EyePlus, Magnify, Close, Refresh } from "mdue";
import { get } from "simple-object-query";

// Estado de paginación y ordenamiento en memoria por endpoint (sobrevive a la navegación SPA, se limpia con F5)
const tableStateCache = new Map();

export default {
  name: "Table",
  props: ["columns", "actions", "api_endpoint", "sorting_column"],

  components: {
    LeadPencil,
    DeleteEmpty,
    EyePlus,
    Magnify,
    Close,
    Refresh,
  },

  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    },
    rangeStart() {
      if (this.totalItems === 0) return 0;
      return (this.currentPage - 1) * this.pageSize + 1;
    },
    rangeEnd() {
      return Math.min(this.currentPage * this.pageSize, this.totalItems);
    },
    visiblePages() {
      const total = this.totalPages;
      const current = this.currentPage;
      const maxButtons = 5;
      let start = Math.max(1, current - Math.floor(maxButtons / 2));
      let end = Math.min(total, start + maxButtons - 1);
      if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
      }
      const pages = [];
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    },
  },

  methods: {
    saveTableState() {
      if (!this.api_endpoint) return;
      tableStateCache.set(this.api_endpoint, {
        currentPage: this.currentPage,
        pageSize: this.pageSize,
        sortOrder: this.sortOrder,
        searchQuery: this.searchQuery,
        selectedRowId: this.selectedRowId,
      });
    },
    restoreTableState() {
      if (!this.api_endpoint || !tableStateCache.has(this.api_endpoint)) return;
      const saved = tableStateCache.get(this.api_endpoint);
      if (saved.currentPage) this.currentPage = saved.currentPage;
      if (saved.pageSize) this.pageSize = saved.pageSize;
      if (saved.sortOrder) this.sortOrder = saved.sortOrder;
      if (typeof saved.searchQuery === "string") this.searchQuery = saved.searchQuery;
      if (saved.selectedRowId !== undefined) this.selectedRowId = saved.selectedRowId;
    },
    handleDetail(id) {
      this.selectedRowId = id;
      this.saveTableState();
      this.$emit("detail", id);
    },
    handleUpdate(id) {
      this.selectedRowId = id;
      this.saveTableState();
      this.$emit("update", id);
    },
    normalizeText(val) {
      return String(val ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    },
    onSearchInput() {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }
      this.searchTimer = setTimeout(() => {
        this.applySearch();
      }, 300);
    },
    triggerSearchNow() {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
      this.applySearch();
    },
    clearSearch() {
      this.searchQuery = "";
      this.triggerSearchNow();
    },
    applySearch() {
      this.currentPage = 1;
      this.saveTableState();
      if (this.isServerPaginated) {
        this.callAPI(false);
      } else {
        this.sortClientRows();
        this.totalItems = this.all_rows.length;
        this.sliceClientPage();
      }
    },
    isNameLinkColumn(cIdx) {
      if (!this.actions || !this.actions.includes("detail")) return false;
      const col = this.columns && this.columns[cIdx];
      if (!col) return false;
      const q = (col.query || "").toLowerCase();
      const v = (col.verbose || "").toLowerCase();
      return (
        q === "name" ||
        q.includes("first_name") ||
        v === "nombre" ||
        v === "nombres"
      );
    },
    isSortableColumn(idx) {
      return Boolean(
        this.columns &&
          this.columns[idx] &&
          this.columns[idx].query === this.sorting_column
      );
    },
    toggleSortOrder() {
      this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
      this.currentPage = 1;
      this.saveTableState();
      if (this.isServerPaginated) {
        this.callAPI(false);
      } else {
        this.sortClientRows();
        this.sliceClientPage();
      }
    },
    buildEndpointUrl() {
      const separator = this.api_endpoint.includes("?") ? "&" : "?";
      const orderingParam = `${this.sortOrder === "desc" ? "-" : ""}${this.sorting_column || "id"}`;
      const trimmedSearch = (this.searchQuery || "").trim();
      const searchParam = trimmedSearch
        ? `&search=${encodeURIComponent(trimmedSearch)}`
        : "";
      return `${this.api_endpoint}${separator}page=${this.currentPage}&page_size=${this.pageSize}&ordering=${orderingParam}${searchParam}`;
    },
    async callAPI(forceRefresh = false) {
      this.loading = true;
      const http = new Http();
      const endpoint = this.buildEndpointUrl();
      let response = await http.authGet(endpoint, { forceRefresh });
      // Si la página guardada ya no existe (ej. tras eliminar elementos), volver a página 1
      if (response && response.status === 404 && this.currentPage > 1) {
        this.currentPage = 1;
        this.saveTableState();
        response = await http.authGet(this.buildEndpointUrl(), { forceRefresh });
      }
      this.mapData(response);
      this.loading = false;
    },
    mapHeader() {
      this.columns_header = [...this.columns.map((column) => column.verbose)];
      if (this.has_actions) {
        this.columns_header.push("Acciones");
      }
    },
    compareBySortColumn(a, b) {
      const dir = this.sortOrder === "desc" ? -1 : 1;
      const valA = get(a, this.sorting_column);
      const valB = get(b, this.sorting_column);
      if (typeof valA === "number" && typeof valB === "number") {
        return (valA - valB) * dir;
      }
      return String(valA ?? "").localeCompare(String(valB ?? ""), undefined, { numeric: true }) * dir;
    },
    sortClientRows() {
      const trimmed = this.normalizeText((this.searchQuery || "").trim());
      const filteredRaw = trimmed
        ? this.raw_rows.filter((row) =>
            this.columns.some((col) =>
              this.normalizeText(get(row, col.query)).includes(trimmed)
            )
          )
        : this.raw_rows;
      const sortedRaw = [...filteredRaw].sort((a, b) =>
        this.compareBySortColumn(a, b)
      );
      this.all_rows = sortedRaw.map((row) =>
        this.columns.map((column) => get(row, column.query))
      );
    },
    mapData(response) {
      if (!response || response.status !== 200) {
        console.error("Error on fetch");
        this.table_data = [];
        this.all_rows = [];
        this.raw_rows = [];
        this.totalItems = 0;
        return;
      }

      if (
        response.data &&
        Object.prototype.hasOwnProperty.call(response.data, "results")
      ) {
        this.isServerPaginated = true;
        this.totalItems =
          typeof response.data.count === "number"
            ? response.data.count
            : response.data.results.length;
        const rows = [...response.data.results].sort((a, b) =>
          this.compareBySortColumn(a, b)
        );
        this.table_data = rows.map((row) =>
          this.columns.map((column) => get(row, column.query))
        );
      } else if (Array.isArray(response.data)) {
        this.isServerPaginated = false;
        this.raw_rows = [...response.data];
        this.sortClientRows();
        this.totalItems = this.all_rows.length;
        this.sliceClientPage();
      } else {
        this.table_data = [];
        this.all_rows = [];
        this.raw_rows = [];
        this.totalItems = 0;
      }
    },
    sliceClientPage() {
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
        this.saveTableState();
      }
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.table_data = this.all_rows.slice(start, end);
    },
    goToPage(page) {
      if (page < 1 || page > this.totalPages || page === this.currentPage) {
        return;
      }
      this.currentPage = page;
      this.saveTableState();
      if (this.isServerPaginated) {
        this.callAPI(false);
      } else {
        this.sliceClientPage();
      }
    },
    onPageSizeChange() {
      this.currentPage = 1;
      this.saveTableState();
      if (this.isServerPaginated) {
        this.callAPI(false);
      } else {
        this.sliceClientPage();
      }
    },
    refreshData() {
      this.callAPI(true);
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
    this.restoreTableState();
    this.mapHeader();
    this.callAPI(false);
  },

  beforeUnmount() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  },

  data() {
    return {
      loading: false,
      columns_header: [],
      has_actions: false,
      table_data: [],
      all_rows: [],
      raw_rows: [],
      isServerPaginated: false,
      currentPage: 1,
      pageSize: 20,
      totalItems: 0,
      sortOrder: "asc",
      searchQuery: "",
      searchTimer: null,
      selectedRowId: null,
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
.table__search {
  display: flex;
  align-items: center;
  padding: 0 10px 14px 10px;
}
.table__search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}
.table__search-icon {
  position: absolute;
  left: 12px;
  font-size: 1.2rem;
  color: #475569;
  fill: currentColor;
  display: inline-flex;
  align-items: center;
  pointer-events: none;
}
.table__search-input {
  width: 100%;
  padding: 10px 38px 10px 40px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.table__search-input:focus {
  border-color: #1e293b;
  box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.12);
}
.table__search-clear {
  position: absolute;
  right: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 1.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.table__search-clear:hover {
  background: #f1f5f9;
  color: #0f172a;
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
  align-items: center;
  gap: 6px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}
.table__header--sortable {
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s ease;
}
.table__header--sortable:hover {
  opacity: 0.85;
}
.header--sort-icon {
  font-size: 0.72rem;
  line-height: 1;
}
.table__data__row {
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: stretch;
  min-height: 48px;
  border-bottom: 1px solid #e2e8f0;
}
.table__data__row--selected,
.table__data__row--selected .table__data__cell {
  background-color: #e2e8f0;
}
.table__data__row--selected .table__data__cell > span {
  font-weight: 700 !important;
  color: #0f172a;
}
.table__data__cell {
  margin: 0 10px;
  padding: 8px 6px;
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}
.table__cell-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  max-height: 4.2em;
  word-break: break-word;
}
.table__data__cell--action {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.table__action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 34px !important;
  width: 34px;
  padding: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.table__action-btn:hover {
  transform: scale(1.12);
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.22);
  z-index: 10;
}
.table__action-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(3px);
  background: #1e293b;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 400;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.22);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 20;
}
.table__action-btn::before {
  content: "";
  position: absolute;
  bottom: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px 5px 0 5px;
  border-style: solid;
  border-color: #1e293b transparent transparent transparent;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
  z-index: 20;
}
.table__action-btn:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
.table__action-btn:hover::before {
  opacity: 1;
  visibility: visible;
}
.table__action-icon {
  font-size: 1.1rem;
  display: inline-flex;
  flex-shrink: 0;
}
.table__cell--link {
  cursor: pointer;
  transform-origin: left center;
  transition: color 0.15s ease, transform 0.16s ease;
}
.table__cell--link:hover {
  text-decoration: underline;
  color: #0f172a;
  transform: scale(1.04);
}
.table__loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}
.table__pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  margin-top: 8px;
  border-top: 1px solid #e2e8f0;
}
.table__pagination--top {
  margin-top: 0;
  margin-bottom: 12px;
  padding: 4px 12px 12px 12px;
  border-top: none;
  border-bottom: 1px solid #e2e8f0;
}
.pagination__info {
  font-size: 0.9rem;
  color: #475569;
}
.pagination__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.pagination__size {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 8px;
  font-size: 0.88rem;
}
.pagination__select {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #1e293b;
  cursor: pointer;
}
.pagination__btn {
  padding: 6px 11px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.pagination__btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}
.pagination__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pagination__btn--active {
  background: #1e293b;
  color: #ffffff;
  border-color: #1e293b;
  font-weight: 600;
}
.pagination__btn--active:hover:not(:disabled) {
  background: #0f172a;
}
.pagination__btn--refresh {
  margin-left: 6px;
  background: #f8fafc;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.pagination__refresh-icon {
  font-size: 1rem;
  display: inline-flex;
}
</style>
