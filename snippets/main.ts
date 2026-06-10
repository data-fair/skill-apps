import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { createConfig } from './composables/config'
import App from './App.vue'

// Expose reactiveSearchParams au shim v-iframe-compat injecté par DataFair
// pour éviter le rechargement complet quand l'app est elle-même embedded
// dans un d-frame parent (portail, dashboard, autre app via <d-frame>).
// Sans ce bloc, le shim tombe dans son fallback window.location.href = src
// à chaque updateSrc → rechargement → clignotement.
// À mettre au niveau module, AVANT createApp().
;(window as any).vIframeOptions = { reactiveParams: reactiveSearchParams }

async function init () {
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })
  const vuetify = createVuetify(vuetifySessionOptions(session))

  const app = createApp(App)
  app.use(vuetify)
  app.use(session)
  app.use(createLocaleDayjs(session.lang.value))
  app.use(createUiNotif())
  app.use(createConfig())
  app.mount('#app')
}

init()
