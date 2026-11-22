import { createApp } from "vue";
import App from "./App.vue";
import router from "./router.js";
import "./assets/css/main.css";
import "./assets/css/pickers.css";

createApp(App).use(router).mount("#root");
