import { createApp } from 'vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { createConfig } from './composables/config'
import App from './App.vue'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

// Expose reactiveSearchParams au shim v-iframe-compat injecté par DataFair
// pour éviter le rechargement complet quand l'app est elle-même embedded
// dans un d-frame parent (portail, dashboard, autre app via <d-frame>).
// Sans ce bloc, le shim tombe dans son fallback window.location.href = src
// à chaque updateSrc → rechargement → clignotement.
// À mettre au niveau module, AVANT createApp().
;(window as any).vIframeOptions = { reactiveParams: reactiveSearchParams }

// createI18n DOIT être créé au niveau module (pas dans init()) :
// plusieurs composants de @data-fair/lib-vuetify (ui-notif, colors-preview,
// layout-empty-state, layout-fetch-error, ...) appellent useI18n() à
// l'évaluation du module. Si la création est différée, ces modules reçoivent
// une instance i18n non initialisée et les traductions de la lib ne
// fonctionnent pas (snackbar, empty state, page d'erreur).
// On initialise avec une locale par défaut et on ajuste depuis la session
// une fois qu'elle est chargée.
const i18n = createI18n({ legacy: false, locale: 'fr', fallbackLocale: 'en' })

async function init () {
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })
  // Mise à jour de la locale dès que la session est connue
  i18n.global.locale.value = session.lang.value

  const vuetify = createVuetify({
    ...vuetifySessionOptions(session),
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  })

  const app = createApp(App)
  app.use(vuetify)
    .use(session)
    .use(i18n)
    .use(createLocaleDayjs(session.lang.value))
    .use(createUiNotif())
    .use(createConfig())
  app.mount('#app')
}

init()
