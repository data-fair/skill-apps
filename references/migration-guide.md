# Guide de migration

## Pré-audit : migrer ou réécrire ?

Avant de démarrer, évaluez la complexité de l'app legacy :

| Critère | Facilement migrable | Legacy à réécrire |
|---------|---------------------|-------------------|
| Structure | `pages/`, `components/`, `store/` classiques | Logique métier dans `plugins/`, modules Nuxt custom, middlewares complexes |
| État global | `Vuex` simple (quelques modules) | `Vuex` avec actions async imbriquées, plugins perso |
| HTTP | `this.$axios` encapsulé dans des services | Appels axios dispersés dans tous les composants |
| UI | Vuetify 2 standard, peu de custom CSS | Thème lourd, composants Vuetify surchargés, CSS global massif |
| Données | Quelques datasets DataFair | Intégrations multiples, données locales, offline |

**Règle empirique** : si l'app fait > 20 pages, utilise des modules Nuxt custom ou du SSR complexe, envisagez une réécriture progressive par feature plutôt qu'une migration globale.

---

## Migration depuis Nuxt 2 / Vue CLI

### Structure de dossiers

| Ancien (Nuxt 2 / Vue CLI) | Nouveau (Vite) |
|---------------------------|----------------|
| `pages/` | `src/App.vue` + `src/components/` + router si besoin |
| `store/` | `src/composables/` (remplace Vuex) |
| `static/` | `public/` |
| `assets/` | `src/assets/` ou `src/styles/` |
| `plugins/` | `src/main.ts` (bootstrap) ou `src/composables/` |
| `app.html` / `public/index.html` | `index.html` (racine) avec `%APPLICATION%` |

### Fichier d'entrée

Remplacer `app.html` (Nuxt) ou `public/index.html` (Vue CLI) par un `index.html` à la racine, **en reprenant le squelette canonique de la section « index.html — document complet » du SKILL.md** — ne pas le réinventer : `<!DOCTYPE html>` en première ligne, pas de `lang` sur `<html>` (posé par le proxy), `<div id="app">` (car `<v-main>` porte déjà le repère `<main>`), `<link>` vers `_theme.css` + déclaration `@layer`, `application-name` en `[a-z0-9-]`, une seule occurrence du placeholder `%APPLICATION%` (le script inline `window.APPLICATION=%APPLICATION%;`), et les métas `df:*` adaptées à l'app. Lors de la migration, purger les métas mortes (`keywords`, `thumbnail`, `vocabulary-*`, `version`, `title`, `x-capture`, `{VERSION}`).

### État global (Vuex → Composables)

Remplacer les modules Vuex par des composables simples :

```ts
// Avant (store/datasets.js)
export const state = () => ({ list: [] })
export const mutations = { SET_LIST(state, list) { state.list = list } }
export const actions = { async fetchList({ commit }) { ... } }

// Après (src/composables/useDatasets.ts)
// useFetch est appelé UNE fois, au niveau module ou dans un setup : ses refs
// (data, loading, error) restent réactives — ne jamais copier leurs .value.
import { computed } from 'vue'
import { useFetch } from '@data-fair/lib-vue/fetch.js'

const fetch = useFetch<{ results: Dataset[] }>('/api/v1/datasets')

export function useDatasets () {
  const list = computed(() => fetch.data.value?.results ?? [])
  return { list, loading: fetch.loading, refresh: fetch.refresh }
}
```

### HTTP (this.$axios → useFetch)

```ts
// Avant
this.$axios.get('/api/v1/datasets/123/lines')

// Après
import { useFetch } from '@data-fair/lib-vue/fetch.js'
const { data, loading, error } = useFetch('/api/v1/datasets/123/lines')
```

Voir la section dédiée "HTTP" plus bas pour les détails sur `useFetch`.

### Vuetify (@nuxtjs/vuetify → vite-plugin-vuetify)

1. Désinstaller : `npm uninstall @nuxtjs/vuetify`
2. Installer : `npm install vuetify@^4.0.0 vite-plugin-vuetify@^2.0.0`
3. Ne **pas** créer de `src/styles/settings.scss` local : utiliser celui de la lib, qui câble les variables de police du thème DataFair (`$body-font-family: var(--d-body-font-family)`). Un fichier local qui ne les déclare pas fait rendre la visualisation en Roboto dans un portail à typo personnalisée.

4. Créer `vite.config.ts` — reprendre le contenu complet de `references/root-files.md` (base `/app/`, plugin `vueI18n({})` sans `include`, alias `@`, `settingsPath` en `configFile`), et s'assurer que `@data-fair/dev-server` est ≥ 2.3.4 (police du site en dev).

5. Adapter les composants Vuetify (voir section Vuetify 2 → 4 ci-dessous).

---

## Vue 2 → Vue 3

| Vue 2 | Vue 3 |
|-------|-------|
| `data()` | `ref()` / `reactive()` |
| `computed: { }` | `computed(() => ...)` |
| `this.$emit('event')` | `defineEmits(['event'])` + `emit('event')` |
| Slots nommés `slot="name"` | `<template #name>` |
| Mixins | Composables |
| `this.$refs` | `ref()` + template ref |
| Filters | Computed properties ou fonctions utilitaires |

## Vuetify 2 → Vuetify 4

| Vuetify 2 | Vuetify 4 |
|-----------|-----------|
| `vue-cli-plugin-vuetify` | `vite-plugin-vuetify` |
| `v-content` | `v-main` |
| `v-btn depressed` | `v-btn variant="flat"` |
| `v-btn text` | `v-btn variant="text"` |
| `v-app-bar absolute` | `v-app-bar :absolute="true"` |
| Thème via JS | Thème via CSS variables + `vuetifySessionOptions` |

## Vue CLI → Vite

- Remplacer `vue.config.js` par `vite.config.ts`
- Utiliser `@vitejs/plugin-vue`
- Déplacer `index.html` à la racine
- Remplacer `VUE_APP_*` par `VITE_*`
- Remplacer `process.env` par `import.meta.env`

## HTTP

- Remplacer `axios` par `useFetch` de `@data-fair/lib-vue/fetch.js`
- `useFetch` gère la réactivité, le loading, l'erreur et l'annulation (les notifications, elles, passent par `useAsyncAction` pour les mutations)
- `ofetch` direct est **réservé aux cas particuliers** (blob, download, upload). **Tout le reste doit passer par `useFetch`.**

Exemple de migration `ofetch` → `useFetch` :

```ts
// AVANT (ofetch direct) — ANTI-PATTERN
const lines = ref([])
const loading = ref(false)
const error = ref(null)
const fetchLines = async () => {
  loading.value = true
  try {
    lines.value = await $fetch('/api/v1/datasets/123/lines')
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

// APRÈS (useFetch) — PATTERN CORRECT
import { useFetch } from '@data-fair/lib-vue/fetch.js'
const { data: lines, loading, error } = useFetch('/api/v1/datasets/123/lines')
// loading et error sont des refs utilisables directement dans le template
```

## Notifications

- `withUiNotif` est **déprécié**
- Remplacer par `useAsyncAction` de `@data-fair/lib-vue/async-action.js`

## Configuration DataFair

- Remplacer le lecteur manuel de `window.APPLICATION` par le plugin `createConfig` standard (voir `snippets/create-config.ts`)
- Installer `createReactiveSearchParams` pour la gestion des query params
- Installer `createUiNotif` pour les notifications
  - `useUiNotif()` expose `{ notification, sendUiNotif }` (attention : pas `sendNotif` ni `notif`)
- Corriger le meta tag `df:concept-filters` en `df:filter-concepts` dans `index.html` si présent (DataFair reconnaît uniquement `df:filter-concepts`)

## v-iframe → d-frame

`@data-fair/frame` apporte deux mécanismes **complémentaires** qui remplacent `@koumoul/v-iframe` :

| Mécanisme | Rôle |
|---|---|
| `createDFrameAdapter` (`:adapter` sur `<d-frame>`) | L'app **embarque** d'autres vues (côté parent) |
| `window.vIframeOptions = { reactiveParams }` | L'app est **embarquée** dans un d-frame externe (côté enfant) |

Lors d'une migration, **conserver les deux** :

```ts
// src/main.ts — niveau module, AVANT createApp()
// Côté enfant : évite le rechargement complet quand l'app est embedded
// dans un d-frame parent (portail, dashboard, autre app).
// Sans ce bloc, le shim v-iframe-compat injecté par DataFair tombe dans
// son fallback window.location.href = src → rechargement → clignotement.
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
;(window as any).vIframeOptions = { reactiveParams: reactiveSearchParams }
```

```ts
// src/composables/config.ts — côté parent
// Synchronise les params entre l'app et les d-frames qu'elle embarque.
import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)
```

Dans le template, remplacer `<v-iframe>` par `<d-frame>` avec l'adapter et l'accessKey :

```vue
<template>
  <d-frame
    :src="`/embed/dataset/${datasetId}/table`"
    :adapter="dFrameAdapter"
    :access-key="accessKey"
  />
</template>
```

> **Ne pas supprimer `window.vIframeOptions`** lors d'une migration. Il n'est pas remplacé par `createDFrameAdapter` : les deux traitent des sens de synchronisation différents (parent → enfant vs enfant → parent). Le mode compat du shim est maintenu tant que le shim `v-iframe-compat/d-frame-content.js` est injecté par DataFair.

### iframe-resizer → d-frame (redimensionnement)

Le redimensionnement piloté par `iframe-resizer` (injecté sur le chemin legacy sans `?d-frame=true`, déclenché par la meta `df:overflow`) est remplacé par le protocole natif de d-frame :

- **Côté enfant** : poser `data-iframe-height` sur la racine de l'app. Le shim `d-frame-content` mesure la hauteur et l'envoie au parent.
- **Côté parent** : le `<d-frame>` porte `resize="auto"` pour prendre en compte ces messages de hauteur.
- La meta `df:overflow` reste utile comme **contrat d'annonce** : elle dit au parent (ex. `app-dashboards`) que la visu peut grandir. C'est le `resize="auto"` du parent qui active réellement la hauteur fluide.

Concrètement, sur une app legacy qui s'allongeait avec `iframe-resizer` :

```vue
<!-- AVANT (legacy) : la hauteur était pilotée par iframe-resizer via df:overflow -->
<v-container>
  ...
</v-container>

<!-- APRÈS : tagging d-frame + resize=auto côté parent -->
<v-container data-iframe-height>
  ...
</v-container>
```

Ne pas conserver de dépendance à `iframe-resizer` dans le code de l'app : la mesure est désormais faite par le shim d-frame injecté par DataFair (`data-iframe-height`), pas par la lib.

## Schéma de configuration (VJSF 2 → 3)

Les apps legacy portent souvent des mots-clés vjsf 2 (`x-display`, `x-fromUrl`, `x-itemsProp`, `x-itemTitle`, `x-itemKey`, `x-if`) dans leur `config-schema.json` : ils sont **silencieusement ignorés** par VJSF 3+ (onglets aplatis, sélecteurs dégradés en champs texte, sans aucune erreur). Suivre la table de migration du skill `vjsf` (`references/migration-v2-to-v3.md`), poser `<meta name="df:vjsf" content="3">` dans `index.html`, puis relancer `npm run build-types`.

## Checklist de migration

1. [ ] Migrer le build (Vue CLI → Vite)
2. [ ] Migrer Vuetify 2 → Vuetify 4
3. [ ] Migrer les composants Vue 2 → Vue 3 (Composition API)
4. [ ] Migrer le schéma de config VJSF 2 → 3 (`x-*` → `layout`, meta `df:vjsf`, cf. skill `vjsf`)
5. [ ] Remplacer axios par useFetch
6. [ ] Implémenter createConfig
7. [ ] Implémenter reactiveSearchParams
8. [ ] Implémenter le thème dynamique (session) : `vuetifySessionOptions`, `<link>` vers `_theme.css`, déclaration `@layer`, et les quatre thèmes `default` / `dark` / `hc` / `hc-dark`
9. [ ] Tester le mode draft (postMessage)
10. [ ] Tester les filtres et la réactivité URL
11. [ ] `npm run build` + `npm run type-check` + `npm run lint`
