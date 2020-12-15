import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'vue-progress-path/dist/vue-progress-path.css';
import VueProgress from 'vue-progress-path';

createApp(App)
  .use(router)
  .use(VueProgress)
  .mount('#app') ;