<template>
  <div class="sidebar dark-bg light-text light-font">
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
        @click="() => goTo('/routines')"
      >
        <clipboard-list class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Rutinas</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.exercises,
        }"
        @click="() => goTo('/exercises')"
      >
        <run class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Ejercicios</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.my_patients,
        }"
        @click="() => goTo('/my-patients')"
        v-show="groups.includes('Therapist')"
      >
        <AccountChild class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Mis pacientes</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.therapists,
        }"
        @click="() => goTo('/therapists')"
        v-show="groups.includes('Admin')"
      >
        <Doctor class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Terapeutas</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { HospitalBox, ClipboardList, Run, AccountChild, Doctor } from "mdue";
export default {
  name: "Sidebar",
  props: ["open"],
  components: {
    HospitalBox,
    ClipboardList,
    Run,
    AccountChild,
    Doctor,
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
      if (this.$route.path.startsWith("/therapies")) {
        this.activateRoute("therapies");
      } else if (this.$route.path.startsWith("/routines")) {
        this.activateRoute("routines");
      } else if (this.$route.path.startsWith("/exercises")) {
        this.activateRoute("exercises");
      } else if (this.$route.path.startsWith("/my-patients")) {
        this.activateRoute("my_patients");
      } else {
        this.activateRoute();
      }
    },
  },
  beforeMount() {
    this.setActiveRoute();
    this.groups = JSON.parse(localStorage.getItem('groups'))
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
        my_patients: false,
        therapists: false,
      },
      groups: [],
    };
  },
};
</script>

<style scoped lang="scss">
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
  white-space: nowrap;
}
.sidebar__item__active {
  border-left: 2px solid $primary;
}
</style>