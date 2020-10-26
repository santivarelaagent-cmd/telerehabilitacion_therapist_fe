<template>
  <h1>Welcome home</h1>
  <button @click="signOut">Cerrar sesión</button>
</template>

<script>
import Storage from '../lib/storage'

export default {
    name: 'Home',
    methods: {
        signOut() {
            const storage = new Storage()
            storage.removeToken()
            this.$router.push('/login')
        }
    }
}
</script>

<style>

</style>