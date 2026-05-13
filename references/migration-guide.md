# Guide de migration

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

- Remplacer `vue.config.js` par `vite.config.mjs`
- Utiliser `@vitejs/plugin-vue`
- Déplacer `index.html` à la racine
- Remplacer `VUE_APP_*` par `VITE_*`
- Remplacer `process.env` par `import.meta.env`

## HTTP

- Remplacer `axios` par `useFetch` de `@data-fair/lib-vue/fetch.js`
- `useFetch` gère la réactivité, le loading, l'annulation et les notifications
- `ofetch` direct uniquement pour des cas particuliers (download fichiers)

## Notifications

- `withUiNotif` est **déprécié**
- Remplacer par `useAsyncAction` de `@data-fair/lib-vue/async-action.js`

## Configuration DataFair

- Remplacer le lecteur manuel de `window.APPLICATION` par le plugin `createConfig` standard (voir `snippets/create-config.ts`)
- Installer `createReactiveSearchParams` pour la gestion des query params
- Installer `createUiNotif` pour les notifications

## Checklist de migration

1. [ ] Migrer le build (Vue CLI → Vite)
2. [ ] Migrer Vuetify 2 → Vuetify 4
3. [ ] Migrer les composants Vue 2 → Vue 3 (Composition API)
4. [ ] Remplacer axios par useFetch
5. [ ] Implémenter createConfig
6. [ ] Implémenter reactiveSearchParams
7. [ ] Implémenter theme dynamique (session)
8. [ ] Tester le mode draft (postMessage)
9. [ ] Tester les filtres et la réactivité URL
10. [ ] `npm run build` + `npm run type-check` + `npm run lint`
