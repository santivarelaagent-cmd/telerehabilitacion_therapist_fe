import { createWebHistory, createRouter } from "vue-router"
import Login from '@/views/login'
import Home from '@/views/home'

const routes = [
    {
        path: '/login',
        name: 'login',
        component: Login,
        beforeEnter: (to, from, next) => {
            if (localStorage.getItem('access_token')) {
                next({
                    name: 'home'
                })
            } else {
                next()
            }
        }
    },
    {
        path: '/',
        name: 'home',
        component: Home,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth) {
        if (localStorage.getItem('access_token')) {
            next()
        } else {
            next({
                name: 'login'
            })
        }
    } else  {
        next()
    }
})

export default router