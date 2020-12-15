<template>
  <nav class="navbar dark-bg">
    <div
      class="navbar__action__sidebar light-text light-font"
      @click="toggle_sidebar"
    >
      <Menu />
    </div>
    <h3 class="navbar__title light-text light-font">Sitio administrativo</h3>
    <div class="navbar__user light-text light-font">
      <account class="" />
      <ul class="user__menu dark-bg">
        <li class="secondary_text user__menu__item" v-on:click="() => $router.push('/profile')">
          <card-account-details class="user__menu__item--icon" /><span
            class="user__menu__item--text"
            >Perfil</span
          >
        </li>
        <li class="user__menu__item" v-on:click="logout">
          <logout class="user__menu__item--icon" /><span
            class="user__menu__item--text"
            >Cerrar sesión</span
          >
        </li>
      </ul>
    </div>
  </nav>
</template>

<script>
import { Account, Logout, CardAccountDetails, Menu } from "mdue";
import Storage from "../lib/storage";

export default {
  name: "Navbar",
  components: {
    Account,
    Logout,
    CardAccountDetails,
    Menu,
  },
  methods: {
    logout() {
      const storage = new Storage();
      storage.removeToken();
      this.$router.push("/login");
    },
    toggle_sidebar() {
      this.$emit("toggle-sidebar");
    },
  },
};
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  height: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  z-index: 3;
}

.navbar__action__sidebar {
  margin-left: 10px;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.navbar__user {
  margin-right: 10px;
  height: 100%;
  display: flex;
  align-items: center;
}

.user__menu {
  display: none;
  position: fixed;
  margin: 0;
  padding: 5px 10px 5px 10px;
  top: 30px;
  right: 0;
  list-style: none;
  font-size: 0.8em;
}

.user__menu__item {
  padding: 5px 0 5px 0;
}

.user__menu__item--icon {
  margin-right: 10px;
}

.navbar__user:hover .user__menu,
.user__menu:hover {
  display: block;
}

.user__menu li:hover {
  text-decoration: underline;
  cursor: pointer;
}
</style>