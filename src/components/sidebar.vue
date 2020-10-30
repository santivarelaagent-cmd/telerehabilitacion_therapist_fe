<template>
  <div class="sidebar dark_bg light_text light_font">
    <ul>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.therapies,
        }"
        @click="() => goTo('/therapies')"
      >
        <hospital-box class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Terapias</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.routines,
        }"
      >
        <clipboard-list class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Rutinas</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.exercises,
        }"
      >
        <run class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Ejercicios</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { HospitalBox, ClipboardList, Run } from "mdue";
export default {
  name: "Sidebar",
  props: ["open"],
  components: {
    HospitalBox,
    ClipboardList,
    Run,
  },
  methods: {
    goTo(path) {
      this.$router.push(path);
    },
    activateRoute(key) {
      if (key) {
        for (const entry in this.activeRoute) {
          this.activeRoute[entry] = entry == key;
        }
      } else {
        for (const entry in this.activeRoute) {
          this.activeRoute[entry] = false;
        }
      }
    },
    setActiveRoute() {
      if (this.$route.path === "/therapies") {
        this.activateRoute("therapies");
      } else {
        this.activateRoute();
      }
    },
  },
  beforeMount() {
    this.setActiveRoute();
  },
  watch: {
    $route() {
      this.setActiveRoute();
    },
  },
  data() {
    return {
      activeRoute: {
        therapies: false,
        routines: false,
        exercises: false,
      },
    };
  },
};
</script>

<style scoped>
.sidebar {
  padding: 10px 0 10px 0;
}
.sidebar ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.sidebar__item {
  display: flex;
  align-items: center;
  height: 30px;
  padding-left: 10px;
  padding-right: 10px;
}
.sidebar__item:hover {
  text-decoration: underline;
  cursor: pointer;
}
.sidebar__item--text {
  padding-left: 10px;
}
.sidebar__item__active {
  border-left: 2px solid #3c6fc8;
}
</style>