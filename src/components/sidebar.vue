<template>
  <div :class="['sidebar', 'dark-bg', 'light-text', 'light-font', { 'sidebar--collapsed': !open }]">
    <ul>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.therapies,
        }"
        data-tooltip="Terapias"
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
        data-tooltip="Rutinas"
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
        data-tooltip="Ejercicios"
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
        data-tooltip="Mis pacientes"
        @click="() => goTo('/my-patients')"
        v-show="groups.includes('Therapist')"
      >
        <AccountChild class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Mis pacientes</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.admins,
        }"
        data-tooltip="Administradores"
        @click="() => goTo('/admins')"
        v-show="groups.includes('Admin')"
      >
        <PoliceBadgeOutline class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Administradores</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.therapists,
        }"
        data-tooltip="Terapeutas"
        @click="() => goTo('/therapists')"
        v-show="groups.includes('Admin')"
      >
        <Doctor class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Terapeutas</span>
      </li>
      <li
        :class="{
          sidebar__item: true,
          sidebar__item__active: activeRoute.patients,
        }"
        data-tooltip="Pacientes"
        @click="() => goTo('/patients')"
        v-show="groups.includes('Admin')"
      >
        <Account class="sidebar__item--icon" />
        <span class="sidebar__item--text" v-show="open">Pacientes</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { HospitalBox, ClipboardList, Run, AccountChild, Doctor, Account, PoliceBadgeOutline } from "mdue";
export default {
  name: "Sidebar",
  props: ["open"],
  components: {
    HospitalBox,
    ClipboardList,
    Run,
    AccountChild,
    Doctor,
    Account,
    PoliceBadgeOutline,
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
      } else if (this.$route.path.startsWith("/admins")) {
        this.activateRoute("admins");
      } else if (this.$route.path.startsWith("/therapists")) {
        this.activateRoute("therapists");
      } else if (this.$route.path.startsWith("/patients")) {
        this.activateRoute("patients");
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
        admins: false,
        therapists: false,
        patients: false,
      },
      groups: [],
    };
  },
};
</script>

<style scoped lang="scss">
.sidebar {
  position: relative;
  z-index: 20;
  padding: 10px 0 10px 0;
}
.sidebar ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.sidebar__item {
  position: relative;
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
.sidebar__item--icon {
  display: inline-flex;
  transition: transform 0.16s ease;
}
.sidebar__item--text {
  padding-left: 10px;
  white-space: nowrap;
  display: inline-block;
  transform-origin: left center;
  transition: transform 0.16s ease;
}
.sidebar__item:hover .sidebar__item--icon {
  transform: scale(1.12);
}
.sidebar__item:hover .sidebar__item--text {
  transform: scale(1.05);
}
.sidebar--collapsed .sidebar__item:hover {
  text-decoration: none;
}
.sidebar--collapsed .sidebar__item:hover .sidebar__item--icon {
  transform: scale(1.18);
}
.sidebar--collapsed .sidebar__item::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  background: #1e293b;
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 30;
}
.sidebar--collapsed .sidebar__item::before {
  content: "";
  position: absolute;
  left: calc(100% + 4px);
  top: 50%;
  transform: translateY(-50%);
  border-width: 5px 6px 5px 0;
  border-style: solid;
  border-color: transparent #1e293b transparent transparent;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
  z-index: 30;
}
.sidebar--collapsed .sidebar__item:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
}
.sidebar--collapsed .sidebar__item:hover::before {
  opacity: 1;
  visibility: visible;
}
.sidebar__item__active {
  border-left: 2px solid $primary;
}
</style>