import { createApp } from 'vue'
import 'vuetify/styles'
import '@data-fair/lib-vuetify/style/global.scss'
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

async function init () {
  // siteInfo: true est obligatoire — vuetifySessionOptions lève sans session.site.value
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })

  // createI18n APRÈS la session, avec la locale définitive.
  // - useI18n() ne s'exécute que dans un setup(), donc aucune raison de créer
  //   l'instance au niveau module ; il suffit de app.use(i18n) avant mount().
  // - legacy: false → vue-i18n 11 démarre sinon en mode legacy, déprécié et
  //   retiré en v12.
  // - fallbackLocale: 'en' → le défaut est la valeur de locale, donc aucun repli.
  //   simple-directory sert fr/en/es/pt/it/de, les blocs <i18n> de lib-vuetify
  //   n'ont que fr et en : sans repli, une session de affiche les clés brutes.
  // - ne JAMAIS réassigner i18n.global.locale.value : en legacy c'est une string
  //   (TypeError), et c'est inutile car un changement de langue recharge la page.
  const i18n = createI18n({ legacy: false, locale: session.lang.value, fallbackLocale: 'en' })

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
