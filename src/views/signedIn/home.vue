<template>
  <div class="wrapper"></div>
</template>

<script>
export default {
  name: "Home",
};
</script>

<style scoped>
.wrapper {
  height: calc(100vh - 30px);
  width: 100%;
  background-image: url(../../assets/home.jpg);
  filter: grayscale(100%);
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
}
</style>