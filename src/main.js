import { createApp } from 'vue';
import App from './App.vue';
<<<<<<< HEAD
import router from "./router";

createApp(App).use(router).mount("#app");
=======
import router from './router';
import 'vue-progress-path/dist/vue-progress-path.css';

createApp(App)
  .use(router)
  .mount('#app') ;
>>>>>>> feature/login-loader
