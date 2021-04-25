<template>
  <div class="therapies">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Nuevo administrador</h2>
    </div>
    <div class="form-wrapper">
      <form class="create-therapy" @submit.prevent="saveTherapist">
        <div class="danger-bg form-error" v-show="!form_valid">
          <span class="white-text light-font">{{ error_msg }}</span>
        </div>
        <div class="form-group">
          <label for="first_name" class="light-font dark-text"
            >Nombres</label
          >
          <input
            type="text"
            name="first_name"
            id="first_name"
            :class="{ 'light-font': true, 'has-error': !first_name_valid }"
            placeholder="Nombre del administrador"
            v-model="first_name"
          />
        </div>
        <div class="form-group">
          <label for="last_name" class="light-font dark-text"
            >Apellidos</label
          >
          <input
            type="text"
            name="last_name"
            id="last_name"
            :class="{ 'light-font': true, 'has-error': !last_name_valid }"
            placeholder="Apellidos del administrador"
            v-model="last_name"
          />
        </div>
        <div class="form-group">
          <label for="email" class="light-font dark-text"
            >Correo</label
          >
          <input
            type="email"
            name="email"
            id="email"
            :class="{ 'light-font': true, 'has-error': !email_valid }"
            placeholder="Correo electrónico del administrador"
            v-model="email"
          />
        </div>
        <div class="form-group">
          <label for="username" class="light-font dark-text"
            >Nombre de usuario</label
          >
          <input
            type="text"
            name="username"
            id="username"
            :class="{ 'light-font': true, 'has-error': !username_valid }"
            placeholder="Nombre de usuario único del administrador"
            v-model="username"
          />
        </div>
        <button type="submit" class="btn btn-success btn-lg">
          <plus />
          <cached v-if="loading" class="rotate" />
          <span v-else>Crear</span>
        </button>
        <span class="light-font muted-text">La contraseña del usuario será <span class="light-italic-font">123456789</span>, recuerde pedirle al usuario cambiarla</span>
      </form>
    </div>
  </div>
</template>

<script>
import { Plus, Cached } from "mdue";
import Http from "@/lib/http";
export default {
  name: "NewTherapist",

  components: {
    Plus,
    Cached,
  },

  methods: {
    async saveTherapist() {
      this.loading = true;
      this.first_name_valid = this.first_name !== "";
      this.last_name_valid = this.last_name !== "";
      this.email_valid = this.email !== "";
      this.username_valid = this.username !== "";
      this.form_valid = this.first_name_valid && this.last_name_valid && this.email_valid && this.username_valid
      if (this.form_valid) {
        const http = new Http();
        const response = await http.authPost("/therapists", {
          username: this.username,
          email: this.email,
          first_name: this.first_name,
          last_name: this.last_name,
        });
        if (response.request.status === 201) {
          this.$router.push({ name: "therapists" });
        } else {
          this.error_msg = `La petición falló con estado ${response.status}`;
        }
      } else {
        this.error_msg = "Revisa el formulario";
      }
      this.loading = false;
    },
  },

  data() {
    return {
      first_name_valid: true,
      first_name: '',
      last_name_valid: true,
      last_name: '',
      email_valid: true,
      email: '',
      username_valid: true,
      username: '',
      loading: false,
      form_valid: true,
      error_msg: "",
    };
  },
};
</script>

<style scoped lang="scss">
.therapies {
  height: calc(100vh - 50px);
  width: 100%;
  overflow-y: scroll;
  padding: 10px;
}
.header {
  margin-bottom: 20px;
}
.header__title {
  margin: 0;
}
.form-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
.create-therapy {
  border: 1px solid $dark;
  border-radius: 20px;
  padding: 1.5em;
  display: flex;
  width: 80%;
  flex-direction: column;
  button {
    align-self: flex-end;
  }
}
.form-group {
  width: 100%;
  display: flex;
  flex-direction: column;

  * {
    display: block;
  }
  label {
    margin-bottom: 5px;
  }
  textarea {
    resize: none;
  }
  input,
  textarea {
    margin-bottom: 10px;
    padding: 5px;
    padding-left: 10px;
    border-radius: 10px;
    border: 0;
    background-color: $light;
  }
  input.has-error,
  textarea.has-error {
    border: 1px solid $danger;
  }
  input::placeholder,
  textarea::placeholder {
    @extend .regular-italic-font;
  }
  &.form-checkbox {
    flex-direction: row;
    align-items: center;
    margin-bottom: 10px;
    input {
      margin: 0;
      margin-left: 10px;
    }
    label {
      margin-bottom: 0;
    }
  }
}
.form-error {
  margin-bottom: 10px;
  padding: 5px;
  padding-left: 10px;
  border-radius: 30px;
  border: 0;
  font-weight: 400;
  font-size: 0.8em;
}
</style>