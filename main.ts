import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import './style.css'
import messages from './i18n/messages'

const app = createApp(App)
const pinia = createPinia()

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('mobi-reader-locale') || 'zh-CN',
  fallbackLocale: 'en-US',
  messages,
  globalInjection: true,
})

app.use(pinia)
app.use(i18n)
app.mount('#app')
