import { createWebHistory, createRouter } from "vue-router";
import Login from "@/views/login";
import Home from "@/views/signedIn/home";
import Profile from "@/views/signedIn/profile.vue";
import Therapies from "@/views/signedIn/therapies/therapies";
import ViewTherapy from "@/views/signedIn/therapies/view_therapy.vue";
import EnrollPatient from "@/views/signedIn/therapies/enroll-patient.vue";
import AssingRoutine from "@/views/signedIn/therapies/assing-routine.vue";
import NewTherapy from "@/views/signedIn/therapies/new_therapy";
import EditTherapy from "@/views/signedIn/therapies/edit_therapy";
import Routines from "@/views/signedIn/routines/routines";
import NewRoutine from "@/views/signedIn/routines/new_routine";
import ViewRoutine from "@/views/signedIn/routines/view_routine.vue";
import Exercises from "@/views/signedIn/exercises/exercises";
import NewExercise from "@/views/signedIn/exercises/new_exercise";
import EditExercise from "@/views/signedIn/exercises/edit_exercise";
import SignedIn from "@/views/signedIn/signedIn";

const routes = [
  {
    path: "/login",
    name: "login",
    component: Login,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem("access_token")) {
        next({
          name: "home",
        });
      } else {
        next();
      }
    },
  },
  {
    path: "/",
    name: "signedIn",
    component: SignedIn,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "home",
        component: Home,
        meta: { requiresAuth: true },
      },
      {
        path: "profile",
        name: "profile",
        component: Profile,
        meta: { requiresAuth: true },
      },
      {
        path: "therapies",
        name: "therapies",
        component: Therapies,
        meta: { requiresAuth: true },
      },
      {
        path: "therapies/new",
        name: "new_therapy",
        component: NewTherapy,
        meta: { requiresAuth: true },
      },
      {
        path: "therapies/:therapy_id",
        name: "view_therapy",
        component: ViewTherapy,
        meta: { requiresAuth: true },
      },
      {
        path: "therapies/:therapy_id/enroll-patient",
        name: "enroll_patient",
        component: EnrollPatient,
        meta: { requiresAuth: true },
      },
      {
        path: "therapies/:therapy_id/assing-routine",
        name: "assing_routine",
        component: AssingRoutine,
        meta: { requiresAuth: true },
      },
      {
        path: "therapies/:therapy_id/edit",
        name: "edit_therapy",
        component: EditTherapy,
        meta: { requiresAuth: true },
      },
      {
        path: "routines",
        name: "routines",
        component: Routines,
        meta: { requiresAuth: true },
      },
      {
        path: "routines/new",
        name: "new_routine",
        component: NewRoutine,
        meta: { requiresAuth: true },
      },
      {
        path: "routines/:routine_id",
        name: "view_routine",
        component: ViewRoutine,
        meta: { requiresAuth: true },
      },
      {
        path: "exercises",
        name: "exercises",
        component: Exercises,
        meta: { requiresAuth: true },
      },
      {
        path: "exercises/new",
        name: "new_exercise",
        component: NewExercise,
        meta: { requiresAuth: true },
      },
      {
        path: "exercises/:exercise_id/edit",
        name: "edit_exercise",
        component: EditExercise,
        meta: { requiresAuth: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    if (localStorage.getItem("access_token")) {
      next();
    } else {
      next({
        name: "login",
      });
    }
  } else {
    next();
  }
});

export default router;
