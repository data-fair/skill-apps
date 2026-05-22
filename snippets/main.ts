import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { createConfig } from './composables/config'
import App from './App.vue'

async function init () {
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })
  const vuetify = createVuetify(vuetifySessionOptions(session))

  const app = createApp(App)
  app.use(vuetify)
  app.use(session)
  app.use(createLocaleDayjs(session.lang.value))
  // Pas besoin de createReactiveSearchParams() — on utilise le global directement
  // import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
  app.use(createUiNotif())
  app.use(createConfig())
  app.mount('#app')
}

init()
