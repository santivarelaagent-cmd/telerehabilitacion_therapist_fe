<template>
  <navbar @toggle-sidebar="toggle_sidebar" />
  <div class="content">
    <sidebar :open="open_sidebar" />
    <router-view />
  </div>
</template>

<script>
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";

export default {
  name: "SignedIn",
  components: {
    Navbar,
    Sidebar,
  },
  methods: {
    toggle_sidebar() {
      this.open_sidebar = !this.open_sidebar;
    },
  },
  data() {
    return {
      open_sidebar: false,
    };
  },
};
</script>

<style scoped>
.content {
  margin-top: 30px;
  display: flex;
  height: 100%;
}
</style>