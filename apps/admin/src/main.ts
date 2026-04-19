import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
import 'bootstrap'
import { createBootstrap } from 'bootstrap-vue-next'
import App from './App.vue'
import { router } from './router'
import './style.css'

const app = createApp(App)
app.use(router)
app.use(createBootstrap())
app.mount('#app')
