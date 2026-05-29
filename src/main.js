import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Element Plus 样式已通过 unplugin-vue-components 按需引入，无需全量导入
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import App from './App.vue'
import router from './router'
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
