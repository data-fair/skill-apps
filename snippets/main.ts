import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createReactiveSearchParams } from '@data-fair/lib-vue/reactive-search-params.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createConfig } from './composables/config'
import App from './App.vue'

const session = createSession({ directoryUrl: '/simple-directory', siteInfo: true })
const vuetify = createVuetify(vuetifySessionOptions(session))

const app = createApp(App)
app.use(vuetify)
app.use(session)
app.use(createReactiveSearchParams())
app.use(createUiNotif())
app.use(createConfig())
app.mount('#app')
