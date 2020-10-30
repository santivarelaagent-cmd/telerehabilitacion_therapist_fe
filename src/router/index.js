import { createWebHistory, createRouter } from "vue-router"
import Login from '@/views/login'
import Home from '@/views/signedIn/home'
import Therapies from '@/views/signedIn/therapies/therapies'
import NewTherapy from '@/views/signedIn/therapies/new_therapy'
import SignedIn from '@/views/signedIn/signedIn'

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
        name: 'signedIn',
        component: SignedIn,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: 'home',
                component: Home,
                meta: { requiresAuth: true }
            },
            {
                path: 'therapies',
                name: 'therapies',
                component: Therapies,
                meta: { requiresAuth: true }
            },
            {
                path: 'therapies/new',
                name: 'new_therapy',
                component: NewTherapy,
                meta: { requiresAuth: true }
            }
        ]
    },
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
    } else {
        next()
    }
})

export default router