import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'vue-progress-path/dist/vue-progress-path.css';

createApp(App)
  .use(router)
  .mount('#app') ;