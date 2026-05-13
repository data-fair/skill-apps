import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createVuetify } from 'vuetify'

const session = createSession({ directoryUrl: '/simple-directory', siteInfo: true })
const vuetify = createVuetify(vuetifySessionOptions(session))

// vuetifySessionOptions(session) fournit :
// - theme dark/light depuis DataFair
// - couleurs du site
// - locale

// Dans index.html, inclure le CSS du thème :
// <link href="/simple-directory/api/sites/_theme.css" rel="stylesheet">
