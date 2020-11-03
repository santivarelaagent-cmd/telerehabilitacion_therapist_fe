<template>
  <div class="wrapper">
    <div class="dark-bg login">
      <form class="secondary-bg login__form" @submit.prevent="login">
        <h3 class="light-text light-font login__form--title">Bienvenido</h3>
        <div class="danger-bg login__form--error" v-show="hasError">
          <span class="white-text light-font">{{ errorMsg }}</span>
        </div>
        <input
          type="text"
          placeholder="Nombre de usuario"
          v-model="username"
          class="login__form--input"
        />
        <input
          type="password"
          placeholder="Contraseña"
          v-model="password"
          class="login__form--input"
        />
        <button type="submit" class="dark-bg login__form--btn">
          <span class="light-font light-text">Iniciar sesión</span>
        </button>
      </form>
    </div>
    <div class="img"></div>
  </div>
</template>

<script>
import Http from "../lib/http";
import Storage from "../lib/storage";

export default {
  name: "Login",
  methods: {
    async login() {
      this.hasError = false;
      const http = new Http();
      const response = await http.post("/auth/users/login/", {
        username: this.username,
        password: this.password,
      });
      if (response.status === 201) {
        const storage = new Storage();
        const groups = [];
        const permissions = [];
        response.data.user.groups.forEach((group) => {
          groups.push(group.name);
          group.permissions.forEach((permission) => {
            permissions.push(permission.codename);
          });
        });
        console.log(groups);
        if (groups.includes("Admin") || groups.includes("Therapist")) {
          storage.setToken(response.data.access_token);
          storage.set("groups", JSON.stringify(groups));
          storage.set("permissions", JSON.stringify(permissions));
          this.$router.push("/");
        } else {
          this.errorMsg =
            "Para acceder debe contar con el rol Terapeuta o Administrador.";
          this.hasError = true;
        }
      } else if (response.status >= 400 && response.status <= 500) {
        this.errorMsg = "Usuario y contraseña no válidas.";
        this.hasError = true;
      } else {
        this.errorMsg = "Error interno. Inténtelo más tarde.";
        this.hasError = true;
      }
    },
  },
  data() {
    return {
      username: "",
      password: "",
      hasError: false,
      errorMsg: "",
    };
  },
};
</script>

<style scoped lang="scss">
.wrapper {
  height: 100vh;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
}

.login {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login__form {
  border: 1px solid #2f2f2f;
  border-radius: 10px;
  padding: 10px;
  width: 30vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
}

.login__form--title {
  align-self: center;
}

.login__form--error {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
  font-weight: 400;
  font-size: 0.8em;
}

.login__form--input {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
}

.login__form--input::placeholder {
  @extend .regular-italic-font;
}

.login__form--btn {
  font-weight: 300;
  padding: 5px;
  border-radius: 30px;
  border: 0;
  cursor: pointer;
}

.img {
  width: 100%;
  background: url(../assets/login.jpg);
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
}

@media (max-width: 800px) {
  .img {
    display: none;
  }

  .login__form {
    width: 80vw;
  }
}
</style>
