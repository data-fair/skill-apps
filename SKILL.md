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

### Fichiers publics obligatoires

- `public/config-schema.json` : DataFair le fetch pour construire le formulaire de config. **Ne jamais renommer ni déplacer**.
- `public/thumbnail.png` : Miniature pour la galerie d'applications.

### Meta tags dans index.html

```html
<meta name="application-name" content="Nom de la visu">
<meta name="title" content="...">
<meta name="description" content="...">
<meta name="thumbnail" content="%PUBLIC_URL%/thumbnail.png">
<meta name="df:concept-filters" content="true">
```

## Snippets disponibles

Utiliser les fichiers du dossier `snippets/` de ce skill :

| Fichier | Description |
|---------|-------------|
| `snippets/create-config.ts` | Plugin `createConfig()` + `useConfig()` (lecture `window.APPLICATION`) |
| `snippets/main.ts` | Bootstrap Vue + session + thème + plugins |
| `snippets/use-fetch-example.ts` | Exemple `useFetch` réactif avec query params |
| `snippets/reactive-search-params.ts` | Setup `reactiveSearchParams` + helpers `useStringSearchParam`, `useBooleanSearchParam` |
| `snippets/async-action.ts` | Exemple `useAsyncAction` avec loading/error/notif |
| `snippets/locale-dayjs.ts` | Synchronisation locale dayjs avec la session |
| `snippets/theme-setup.ts` | Configuration session + Vuetify avec thème dynamique |
| `snippets/d-frame.ts` | Intégration d'autres vues DataFair via d-frame |

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

## Bonnes pratiques de qualité

### Réactivité (critères de livraison)

- **Query params** : la visu réagit aux changements d'URL via `reactiveSearchParams`.
- **Config en draft** : mise à jour en temps réel via `postMessage` (`type: 'set-config'`).
- **État dans l'URL** : filtres, tri, métrique sélectionnée reflétés dans l'URL pour le partage.
- **Thème dynamique** : sombre/clair fonctionne via `vuetifySessionOptions(session)`.

### HTTP

- **Toujours utiliser `useFetch`** de `@data-fair/lib-vue/fetch.js` (wrapper réactif autour de `ofetch`).
- `ofetch` direct uniquement pour des cas particuliers (download de fichiers, etc.).
- **Jamais `fetch` natif**, jamais `axios`.

### Performances

- Débouncer les appels API (`useDebounce` de `@vueuse/core`).
- Utiliser `useFetch` qui gère AbortController (annulation auto des requêtes obsolètes).
- Ne pas faire d'appels HTTP dans les handlers d'événements bruts ; encapsuler dans des fonctions ou composables.

### Accessibilité / UX

- Gérer l'état de chargement (`loading` de `useFetch` ou `useAsyncAction`).
- Gérer l'état d'erreur (snackbar ou `v-empty-state`).
- Afficher un `v-empty-state` si la configuration est incomplète ou invalide.

## Intégration iframe / d-frame

### Paramètres réactifs

```ts
window.vIframeOptions = {
  reactiveParams: reactiveSearchParams // ref avec les query params actifs
}
```

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
- [ ] Réactivité query params OK
- [ ] Réactivité config draft OK
- [ ] État utilisateur dans l'URL
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
