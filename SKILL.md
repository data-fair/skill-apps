---
name: skill-apps
description: |
  Guide de développement pour les applications DataFair.
  Utiliser ce skill dès que l'utilisateur travaille sur une application DataFair,
  qu'il crée une nouvelle app, migre un projet legacy, ou modifie une app existante.
  S'applique aux projets Vue 3 + Vuetify 4 + Vite.
  S'utilise aussi lorsqu'on parle de createConfig, useFetch, reactiveSearchParams,
  window.APPLICATION, config-schema.json, df-dev-server, d-frame, ou d'intégration iframe DataFair.
---

# Skill Apps – DataFair Applications

## Contexte

Ce skill guide la création et la maintenance d'applications DataFair (visus, apps métier, cartes, formulaires, etc.).

**Profils d'app courants** :
- **Nouvelle visu** → Suivre ce skill à 100 %
- **Visu existante en migration** → Voir `references/migration-guide.md`
- **Plugin backend** → Ne pas utiliser ce skill

**Stack standard** (obligatoire pour les nouveaux projets) :
- Vue 3.5+, Composition API, `<script setup lang="ts">`
- Vuetify 4 avec `vite-plugin-vuetify`
- Vite 8
- TypeScript strict
- `@data-fair/lib-vue` / `@data-fair/lib-vuetify` / `@data-fair/lib-utils`
- Dev server : `df-dev-server` + Zellij layout `.zellij.kdl`

## Scripts obligatoires dans package.json

```json
{
  "dev": "zellij --layout .zellij.kdl",
  "dev-server": "APP_URL=http://localhost:3000/app/ df-dev-server",
  "dev-app": "vite",
  "build": "vite build",
  "lint": "eslint . --fix --ignore-path .gitignore",
  "type-check": "vue-tsc --noEmit"
}
```

## Contrat DataFair

### window.APPLICATION

Dans `index.html`, `%APPLICATION%` est remplacé par DataFair au runtime.
Le code lit `window.APPLICATION` (typé dans `src/types.d.ts`).

**Structure** :

```ts
window.APPLICATION = {
  id, slug, title, owner,
  href: string,            // API URL de l'application
  exposedUrl: string,      // URL publique du proxy (utilisé pour l'accessKey)
  apiUrl: string,          // e.g. https://.../api/v1
  wsUrl: string,           // WebSocket URL
  configuration: {
    datasets: [{            // tableau des datasets configurés
      id, href, title, slug,
      finalizedAt: string,
      schema: Field[],      // schema COMPLET avec concepts, labels, etc.
      userPermissions: string[]
    }],
    // ... config spécifique à l'app (chart, layers, metrics, etc.)
  },
  baseApp: { id, url, meta }
}
```

**Important** : les datasets et leurs schemas sont dans `window.APPLICATION.configuration.datasets` (tableau). Les métadonnées (schema, champs, concepts, finalizedAt) sont **déjà injectées** par DataFair — inutile de les fetcher via API. L'app accède aux données via le `href` du dataset.

### AccessKey

L'accessKey est extraite de l'`exposedUrl` quand l'app est accédée via un lien partagé :

```ts
const last = window.APPLICATION?.exposedUrl?.split('/').pop()
const toks = last?.split('%3A')
const accessKey = (toks?.length === 2) ? toks[0] : null
```

Elle doit être propagée aux embeds d-frame pour maintenir les droits d'accès.

> **Note** : `accessKey` et `d-frame` ne sont pertinents que si votre application intègre d'autres vues DataFair (tableaux, cartes, formulaires) via `<d-frame>`. Pour une **visu simple** (graphique, indicateur, etc.) qui n'embarque pas d'autres apps, l'`accessKey` n'a pas besoin d'être extrait ni propagé. Dans ce cas, le `createConfig` peut omettre `accessKey` et `dFrameAdapter`.

### Fichiers publics obligatoires

- `public/config-schema.json` : DataFair le fetch pour construire le formulaire de config. **Ne jamais renommer ni déplacer**.
- `public/thumbnail.png` : Miniature pour la galerie d'applications.

### Meta tags dans index.html

```html
<meta name="application-name" content="Nom de la visu">
<meta name="title" content="...">
<meta name="description" content="...">
<meta name="thumbnail" content="%PUBLIC_URL%/thumbnail.png">
<meta name="df:filter-concepts" content="true">
```

> **Note sur les filtres par concepts** : le nom canonique reconnu par DataFair est `df:filter-concepts`. Certaines apps récentes utilisent à tort `df:concept-filters` (erreur historique de documentation). Pour les **nouveaux projets**, utilisez impérativement `df:filter-concepts`. Lors d'une migration ou maintenance d'app legacy, corrigez `df:concept-filters` en `df:filter-concepts`.

## Snippets disponibles

Utiliser les fichiers du dossier `snippets/` de ce skill :

| Fichier | Description |
|---------|-------------|
| `snippets/create-config.ts` | Plugin `createConfig()` + `useConfig()` (lecture `window.APPLICATION`) |
| `snippets/create-config-light.ts` | Version allégée de `createConfig()` — visu mono-dataset sans embed |
| `snippets/main.ts` | Bootstrap Vue + session + thème + plugins |
| `snippets/use-fetch-example.ts` | Exemple `useFetch` réactif avec query params |
| `snippets/reactive-search-params.ts` | Setup `reactiveSearchParams` + helpers `useStringSearchParam`, `useBooleanSearchParam` |
| `snippets/async-action.ts` | Exemple `useAsyncAction` avec loading/error/notif |
| `snippets/locale-dayjs.ts` | Synchronisation locale dayjs avec la session |
| `snippets/theme-setup.ts` | Configuration session + Vuetify avec thème dynamique |
| `snippets/error-handling.ts` | Gestion d'erreurs API (snackbar + `useFetch` / `useAsyncAction`) |
| `snippets/ui-notif.ts` | Notifications globales avec `createUiNotif` / `useUiNotif` (API correcte) |
| `snippets/hot-reload.ts` | Rendre la config réactive en mode draft (df:sync-config="true") |
| `snippets/draft-qs-filter.ts` | Synchroniser `staticFilters` / `qsFilter` vers DataFair en mode draft |
| `snippets/d-frame.ts` | Intégration d'autres vues DataFair via d-frame |
| `snippets/schema-tabs.ts` | Organisation par onglets (`allOf` + `title`) |
| `snippets/schema-discriminator.ts` | Discrimination de type (`discriminator` + `oneOf` + `const`) |
| `snippets/schema-getitems.ts` | Sélecteurs dynamiques peuplés par API (`layout.getItems` avec `url`) |
| `snippets/schema-getitems-expr.ts` | Sélecteurs dynamiques peuplés par expression (`layout.getItems` avec `expr`) |
| `snippets/schema-array.ts` | Arrays avancés (`itemTitle`, `itemCopy`, `getDefaultData`) |
| `snippets/schema-conditional.ts` | Affichage conditionnel (`layout.if` / `layout.switch`) |
| `snippets/schema-hidden.ts` | Champs cachés (`layout: "none"`) |
| `snippets/schema-xexports.ts` | Génération de types TypeScript (`x-exports`) |

> **⚠️ Attention : `createSession` est asynchrone**
> `createSession({ siteInfo: true })` fetch les infos du site (thème, couleurs, locale) via API. Il **doit être `await`** avant d'appeler `vuetifySessionOptions(session)`. Ne jamais appeler `createSession` de manière synchrone en dehors d'une fonction `async`.

## Structure de projet type

```
my-visu/
├── .zellij.kdl                  # Layout dev (vite + df-dev-server)
├── index.html                   # %APPLICATION% + meta tags df:*
├── vite.config.mjs
├── package.json
├── public/
│   ├── config-schema.json       # Généré depuis src/config/schema.json
│   └── thumbnail.png            # Miniature 400x300 min.
├── src/
│   ├── main.ts                  # Bootstrap (voir snippets/main.ts)
│   ├── App.vue                  # Root : v-empty-state + rendu visu
│   ├── types.d.ts               # Extensions Window (APPLICATION, etc.)
│   ├── shims.d.ts               # Déclarations modules sans types
│   ├── composables/
│   │   ├── config.ts            # createConfig plugin (voir snippets/create-config.ts)
│   │   └── useData.ts           # Logique métier de fetch
│   ├── components/
│   │   └── ...                  # Composants métier
│   ├── config/
│   │   ├── schema.json          # JSON schema de configuration
│   │   └── index.ts             # Re-export types générés
│   └── styles/
│       └── settings.scss        # Variables SCSS Vuetify
```

## Schéma de configuration (VJSF)

DataFair utilise [VJSF](https://koumoul-dev.github.io/vuetify-jsonschema-form/) v3 pour générer le formulaire de configuration à partir du fichier `public/config-schema.json`. Le fichier source est `src/config/schema.json` et il est traité par `df-build-types` pour générer à la fois les types TypeScript et le schéma résolu copié dans `public/`.

### Pipeline de build

```
src/config/schema.json          → édité à la main
         ↓
    df-build-types
         ↓
src/config/.type/               → généré automatiquement
  ├── index.d.ts                → types TS (importés dans le code)
  └── resolved-schema.json      → copié vers public/config-schema.json
```

**Commande** : `npm run build-types` (doit être relancée après chaque modification de `schema.json`).

### Organisation du formulaire (`allOf` + `title`)

Chaque élément de `allOf` avec un `title` devient une section/onglet dans l'UI DataFair :

```json
{
  "type": "object",
  "allOf": [
    { "title": "Source de données", "properties": { "datasets": {...} } },
    { "title": "Paramètres", "properties": { "chart": {...} } }
  ]
}
```

> Voir `snippets/schema-tabs.ts` pour un exemple complet.

### Discrimination de type (`discriminator` + `oneOf` + `const`)

Pattern recommandé pour des sous-formulaires conditionnels (ex: choisir un type de graphique) :

```json
{
  "discriminator": { "propertyName": "type" },
  "default": { "type": "line" },
  "oneOf": [
    { "title": "Courbe", "properties": { "type": { "const": "line" } } },
    { "title": "Barres", "properties": { "type": { "const": "bar" } } }
  ]
}
```

`oneOfLayout` permet de personnaliser le label du sélecteur de variante. Voir `snippets/schema-discriminator.ts`.

### Sélecteurs dynamiques (`layout.getItems`)

**Depuis une API** (`url`) :
```json
{
  "layout": {
    "getItems": {
      "url": "api/v1/datasets?status=finalized&q={q}&select=id,title",
      "itemKey": "data.href",
      "itemTitle": "data.title",
      "itemsResults": "data.results"
    }
  }
}
```

**Depuis une expression** (`expr`) :
```json
{
  "layout": {
    "getItems": {
      "expr": "rootData.datasets",
      "itemKey": "data.id",
      "itemTitle": "data.title"
    }
  }
}
```

**Variables disponibles** : `{q}` (recherche), `${rootData...}`, `${parent...}`, `${context...}`.

> Voir `snippets/schema-getitems.ts` et `snippets/schema-getitems-expr.ts`.

### Layouts spéciaux

| Layout | Usage | Exemple |
|--------|-------|---------|
| `slider` | Entier avec curseur | `opacity`, `tension` |
| `color-picker` | Sélecteur de couleur | `color` |
| `textarea` | Texte multiligne | `description` |
| `none` | Champ caché | `qsFilter`, `uuid` |
| `tabs` | Onglets explicites à la racine | data-fair-metrics |
| `getItems` | Sélecteur peuplé dynamiquement | datasets, champs |

> Voir `snippets/schema-hidden.ts`.

### Arrays avancés

```json
{
  "layout": {
    "itemTitle": "data.title || 'Nouveau calque'",
    "itemCopy": "{...item, uuid: crypto.randomUUID()}",
    "messages": { "addItem": "ajouter un calque" },
    "getDefaultData": "{ uuid: crypto.randomUUID() }"
  }
}
```

- `itemTitle` : expression JS pour résumer l'élément
- `itemCopy` : transformation à la duplication
- `getDefaultData` : valeurs par défaut à la création
- `messages.addItem` : label du bouton d'ajout

> Voir `snippets/schema-array.ts`.

### Affichage conditionnel (`layout.if` / `layout.switch`)

```json
{
  "layout": { "if": "parent.data.category" }
}
```

```json
{
  "layout": {
    "switch": [
      { "if": "!summary && data.dataset", "comp": "expansion-panels" },
      { "children": [] }
    ]
  }
}
```

> Voir `snippets/schema-conditional.ts`.

### Génération de types TypeScript (`x-exports`)

```json
{
  "x-exports": ["types", "resolvedSchemaJson"]
}
```

`resolvedSchemaJson` est obligatoire pour générer le fichier que DataFair va fetcher. `types` génère les définitions TypeScript utilisables dans le code via `@/config/.type/index.js`.

> Voir `snippets/schema-xexports.ts`.

## Bonnes pratiques de qualité

### Réactivité (critères de livraison)

- **Query params** : la visu réagit aux changements d'URL via `reactiveSearchParams`.
  - **Pattern recommandé** : importer le singleton global (`@data-fair/lib-vue/reactive-search-params-global.js`) — aucun plugin nécessaire.
  - Les helpers `useStringSearchParam`, `useBooleanSearchParam`, etc. nécessitent le plugin `createReactiveSearchParams()`, réservé aux cas avancés ou au SSR.
- **Config en draft** : mise à jour en temps réel via `postMessage` (`type: 'set-config'`).
  - Activer `<meta name="df:sync-config" content="true">` dans `index.html`.
  - **Règle d'or** : ne jamais lire `window.APPLICATION.configuration` en top-level de module (ex: `const config = window.APPLICATION.configuration`). Cela fige la config au chargement et casse le hot reload. Toujours passer par `useConfig()`.
  - Les `computed` qui dépendent de `config.value` se mettent à jour automatiquement.
  - Les `useFetch` avec URLs/query params en `computed` se réexécutent automatiquement quand la config change.
  - Pour les structures dynamiques complexes (tableaux de filtres avec `useFetch` internes), utiliser `effectScope` pour recréer proprement les ressources réactives et éviter les fuites. Voir `snippets/hot-reload.ts`.
- **État dans l'URL** : filtres, tri, métrique sélectionnée reflétés dans l'URL pour le partage.
- **Thème dynamique** : sombre/clair fonctionne via `vuetifySessionOptions(session)`.

### HTTP

- **Toujours utiliser `useFetch`** de `@data-fair/lib-vue/fetch.js` (wrapper réactif autour de `ofetch`).
- `ofetch` direct est **réservé aux cas particuliers** (blob, download, upload). **Tout le reste doit passer par `useFetch`.**
- **Jamais `fetch` natif**, jamais `axios`.

**Pourquoi `useFetch` est obligatoire** :
- **Réactivité** : `data`, `loading`, `error` sont des `ref()` exploitables directement dans le template
- **Annulation automatique** : les requêtes obsolètes sont annulées via AbortController (évite les race conditions)
- **Typage** : typage TypeScript natif du retour
- **Gestion d'état** : pas besoin de gérer manuellement les variables `loading` / `error`

Exemple de migration :

```ts
// AVANT (ofetch direct) — ANTI-PATTERN
const lines = ref([])
const loading = ref(false)
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
// loading et error sont utilisables directement dans le template
```

### Performances

- Débouncer les appels API (`useDebounce` de `@vueuse/core`).
- Utiliser `useFetch` qui gère AbortController (annulation auto des requêtes obsolètes).
- Ne pas faire d'appels HTTP dans les handlers d'événements bruts ; encapsuler dans des fonctions ou composables.

**Exemple `useDebounce`** (params API calculés à partir de filtres utilisateur) :

```ts
import { useDebounce } from '@vueuse/core'
import { computed } from 'vue'

const baseParams = useDebounce(
  computed(() => {
    const params: Record<string, string> = { ...conceptFilters }
    if (staticFilters.length) {
      params.qs = filters2qs(staticFilters)
    }
    return params
  }),
  500 // ms — évite de spammer l'API quand l'utilisateur change plusieurs filtres rapidement
)
```

### Accessibilité / UX

- Gérer l'état de chargement (`loading` de `useFetch` ou `useAsyncAction`).
- Gérer l'état d'erreur (snackbar ou `v-empty-state`).
- Afficher un `v-empty-state` si la configuration est incomplète ou invalide.

## Intégration iframe / d-frame

### Paramètres réactifs

Utiliser `createDFrameAdapter` de `@data-fair/frame` pour synchroniser les paramètres de recherche entre l'app parent et les embeds `d-frame` :

```ts
import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)
```

> **Note** : `window.vIframeOptions` est obsolète. `@data-fair/frame` fournit un mode compat qui lit encore cette variable pour la transition, mais les nouveaux projets doivent impérativement utiliser `createDFrameAdapter`.

### Communication avec le parent (postMessage)

**Écouter la config en draft** (3 formats possibles) :

```ts
window.addEventListener('message', (event) => {
  if (event.data?.type === 'set-config' && event.data?.content) {
    const { content } = event.data
    if (content.configuration) {
      // Config complète reçue de DataFair
      config.value = content.configuration
    } else if (content.chart || content.datasets || content.layers || content.metrics) {
      // Config directement dans content (certains formats DataFair)
      config.value = content
    } else if (content.field && 'value' in content) {
      // Update par path : { field: 'chart.colors.0', value: '#ff0000' }
      const newConfig = JSON.parse(JSON.stringify(config.value))
      setByPath(newConfig, content.field, content.value)
      config.value = newConfig
    }
  }
})
```

**Notifier le parent des changements** (visu → DataFair) :

```ts
if (window.parent !== window) {
  window.parent.postMessage({
    type: 'set-config',
    content: { field: 'chart.colors.0', value: '#ff0000' }
  }, '*')
}
```

### d-frame

Utiliser `@data-fair/frame` (composant `d-frame`) pour intégrer des vues DataFair (tableau, carte, formulaire) dans l'app.

**Setup dans le composable config** (voir `snippets/d-frame.ts`) :

```ts
import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)
```

**Utilisation dans un composant** :

```vue
<template>
  <d-frame
    :src="`/embed/dataset/${datasetId}/table`"
    :adapter="dFrameAdapter"
    :access-key="accessKey"
  />
</template>

<script setup lang="ts">
import { useConfig } from '@/composables/config'

const { dFrameAdapter, accessKey } = useConfig()
</script>
```

L'adapter synchronise automatiquement les paramètres de recherche entre l'app parent et l'embed. L'accessKey propage les droits d'accès.

## Récupération des données

Voir `references/endpoints-datafair.md` pour les endpoints API (utilisés par les apps pour fetcher leurs propres données) et `references/embeds-params.md` pour les paramètres des vues embed (utilisées via d-frame).

### Endpoints courants

| Type de visu | Endpoint | Description |
|--------------|----------|-------------|
| Données brutes | `GET /api/v1/datasets/{id}/lines` | Lignes filtrées/triées/paginées |
| Valeurs distinctes | `GET /api/v1/datasets/{id}/values_labels` | Valeurs + labels (pour filtres, axes) |
| Agrégations groupées | `GET /api/v1/datasets/{id}/values_agg` | Agrégation par champ (`groupBy`) |
| Métrique simple | `GET /api/v1/datasets/{id}/metric_agg` | Une métrique sur un champ |
| Bornes géo | `GET /api/v1/datasets/{id}/geo_agg` | Tuiles ou bounds géographiques |

### Paramètres communs

- `size`, `q` (recherche textuelle), `sort`, `finalizedAt` (cache)
- Filtres : privilégier `*_eq` et `*_in` (ex: `departement_eq=75`)
- `qs` : uniquement pour des filtres dynamiques complexes

## Checklist de livraison

- [ ] `npm run build` passe
- [ ] `npm run type-check` passe (TS strict)
- [ ] `npm run lint` passe
- [ ] `public/config-schema.json` est généré et à jour
- [ ] `public/thumbnail.png` est présent
- [ ] `useFetch` utilisé partout (pas axios / ofetch direct)
- [ ] Réactivité query params OK
- [ ] Réactivité config draft OK (test mode draft dans DataFair)
- [ ] État utilisateur dans l'URL
- [ ] Thème dynamique sombre/clair OK
- [ ] Erreurs de config affichées (pas de crash)
- [ ] Layout responsive

## Migration

Voir `references/migration-guide.md` pour les détails.

Points clés :
- Vue 2 → Vue 3 : `data()` → `ref()`, mixins → composables
- Vuetify 2 → Vuetify 4 : `vite-plugin-vuetify`, nouveaux props (`variant="flat"`)
- Vue CLI → Vite : `vite.config.mjs`, `VITE_*` env vars
- Axios → `useFetch` (`@data-fair/lib-vue/fetch.js`)
- `withUiNotif` → `useAsyncAction` (déprécié)

## Notes pour les agents

- **Ne jamais modifier** la logique `window.APPLICATION` ni renommer `public/config-schema.json`.
- Privilégier la logique métier dans les **composables** plutôt que dans les composants.
- Garder les composants comme des **orchestrateurs** : props, emits, appels aux composables, template.
- Tout nouveau fichier source doit être `.ts` ou `.vue` avec `lang="ts"`.
- Ajouter les extensions globales de `Window` dans `src/types.d.ts`.
