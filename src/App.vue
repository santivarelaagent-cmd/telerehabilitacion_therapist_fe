<template>
  <router-view />
</template>

<script>
export default {
  name: "App",
};
</script>

<style>
body {
  margin: 0;
  font-family: "Open Sans";
}

*:focus {
  outline: none;
}

.font-family {
  font-family: "Open Sans";
}

.regular_font {
  font-weight: 400;
}

.light_font {
  font-weight: 300;
}

.dark_bg {
  background-color: #20252c;
}

.light_bg {
  background-color: #f0f5fc;
}

.muted_bg {
  background-color: #272c35;
}

.secondary_bg {
  background-color: #3a4049;
}

.primary_bg {
  background-color: #3c6fc8;
}

.danger_bg {
  background-color: #ef6372;
}

.white_bg {
  background-color: #fff;
}

.dark_text {
  color: #20252c;
}

.light_text {
  color: #f0f5fc;
}

.muted_text {
  color: #272c35;
}

.secondary_text {
  color: #3a4049;
}

.primary_text {
  color: #3c6fc8;
}

.danger_text {
  color: #ef6372;
}

.white_text {
  color: #fff;
}

.btn {
  display: inline-block;
  height: 100%;
  border: 0;
  margin-right: 5px;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.btn-update {
  background-color: #3a4049;
}
.btn-delete {
  background-color: #ef6372;
}
.btn-detail {
  background-color: #3c6fc8;
}
.btn-create {
  background-color: #32a35c;
}
.btn__label {
  margin-left: 10px;
}
</style>