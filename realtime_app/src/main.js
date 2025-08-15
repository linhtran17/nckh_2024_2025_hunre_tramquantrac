import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
;


import App from './App.vue'
import router from './router'


const app = createApp(App)
app.use(ElementPlus)
app.use(createPinia())
app.use(router)
app.component('Plus', Plus);
app.component('Edit', Edit);
app.component('Delete', Delete)

app.mount('#app')
