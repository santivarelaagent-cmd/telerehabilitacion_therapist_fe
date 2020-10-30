<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark_text regular_font">Nueva terapia</h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy">
        <div class="form-group">
          <label for="name">Nombre de la terapia</label>
          <input type="text" name="name" id="name" />
        </div>
        <div class="form-group">
          <textarea
            name="description"
            id="description"
            cols="30"
            rows="10"
          ></textarea>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: "NewTherapy",
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
}
.header__title {
  margin: 0;
}
</style>