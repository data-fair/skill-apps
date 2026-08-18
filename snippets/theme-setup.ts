import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createVuetify } from 'vuetify'

async function setupTheme () {
  // siteInfo: true est obligatoire : vuetifySessionOptions lève
  // 'requires fetching site info in session util' si session.site.value est nul.
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })
  const vuetify = createVuetify(vuetifySessionOptions(session))
  return vuetify
}

// vuetifySessionOptions(session) fournit :
// - le thème résolu par resolveTheme parmi QUATRE valeurs : default, dark, hc, hc-dark
//   (réglages du site + cookie theme + prefers-color-scheme + prefers-contrast)
// - les couleurs du site
// - la locale

// Dans index.html, fixer l'ordre des couches puis inclure le CSS du thème.
// Vuetify 4 livre son CSS dans des cascade layers : la priorité y est donnée par
// l'ordre de PREMIÈRE DÉCLARATION des noms de couches, pas par l'ordre des règles.
// Sans cette ligne, l'ordre dépend du chunk CSS chargé en premier — instable entre
// dev et build (code splitting). La déclarer en tête épingle l'ordre et ouvre
// vuetify-overrides / vuetify-utilities pour vos propres styles.
// _theme.css est volontairement hors couche : du CSS non layered l'emporte sur
// tout CSS layered, quel que soit l'ordre.
// <style>@layer vuetify-core, vuetify-components, vuetify-overrides, vuetify-utilities, vuetify-final;</style>
// <link href="/simple-directory/api/sites/_theme.css" rel="stylesheet">
//
// _theme.css n'est pas redondant avec vuetifySessionOptions : il porte les
// variantes de couleurs texte à contraste corrigé (.text-primary, .text-secondary,
// ... en !important), les couleurs de a.simple-link selon le thème et le fond,
// les @font-face du site et une règle @media print.
// → pour du texte, utiliser text-primary plutôt que primary.
//
// Chemin absolu et sans hash : le proxy data-fair ne substitue que %APPLICATION%,
// les placeholders {SITE_PATH} / {THEME_CSS_HASH} des services sont inaccessibles ici.
// Sans hash, le CSS est revalidé toutes les 60 s au lieu d'être immuable.

// Et dans main.ts, importer les styles globaux de la lib :
// import '@data-fair/lib-vuetify/style/global.scss'

// Alternative non dépréciée à siteInfo: true — laisser simple-directory injecter
// window.__PUBLIC_SITE_INFO, ce que fait chaque service, en ajoutant dans index.html :
// <script src="/simple-directory/api/sites/_public.js"></script>
// la session le lit alors sans fetch bloquant au démarrage.
