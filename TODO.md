# Propositions d'améliorations pour le skill `skill-apps`

Analyse réalisée le 13/05/2026 sur la base de ~40 projets dans `~/work/koumoul/`.

---

## 1. Clarification du meta tag DataFair

### Problème observé
Le skill exige le meta tag `df:concept-filters`, mais une majorité d'applications (même celles récentes comme **app-charts**, **app-contribs**, **carto-explore**, etc.) utilisent `df:filter-concepts`.

### Proposition
- **Vérifier le nom canonique** côté DataFair et mettre à jour le skill en conséquence.
- Si les deux sont acceptés, documenter explicitement : "DataFair accepte `df:concept-filters` (ou `df:filter-concepts` sur les anciennes versions)".
- Ajouter une note de migration : "Si votre app utilise `df:filter-concepts`, remplacez par `df:concept-filters`".

---

## 2. Guide de migration élargi (Nuxt 2 / Vue CLI → Vite)

### Problème observé
~50 % des apps analysées sont encore en **Nuxt 2**, **Vue CLI** ou **Vue 2 + Webpack** (ex: app-reports, app-table, bar-chart-race, data-fair-word-cloud, geocoder, etc.).

Le skill mentionne la migration mais de manière très synthétique.

### Proposition
- Ajouter un **chapitre dédié "Migration depuis Nuxt 2 / Vue CLI"** dans `references/migration-guide.md` avec :
  - Migration de la structure de dossiers (`pages/` → `src/App.vue`, `store/` → `src/composables/`, `static/` → `public/`).
  - Remplacement de `app.html` par `index.html` avec `%APPLICATION%`.
  - Migration de `this.$axios` / `Vuex` → `useFetch` / `composables`.
  - Migration de `@nuxtjs/vuetify` → `vite-plugin-vuetify`.
  - Exemple de `vite.config.mjs` pour une ancienne app Nuxt 2.
- Ajouter une **checklist de pré-audit** pour savoir si une app est "migrable facilement" ou "legacy à réécrire".

---

## 3. Prise en compte du JavaScript (pas seulement TypeScript)

### Problème observé
La grande majorité des apps existantes sont en **JavaScript pur**, même certaines apps récentes (app-calendar, app-eco-watt, data-fair-metrics, data-fair-series, etc.). Le skill impose strictement `<script setup lang="ts">` et `tsconfig.json`.

### Proposition
- Ajouter une section **"Apps en JavaScript (legacy ou transition)"** qui précise :
  - Que le standard cible est TS strict, mais que les apps JS existantes peuvent migrer progressivement.
  - Un snippet `jsconfig.json` + `// @ts-check` pour activer l'inférence de types sans réécriture complète.
  - Une feuille de route "JS → TS" par étapes (types.d.ts d'abord, puis composables, puis composants).
- Modifier la checklist de livraison pour distinguer **"nouvelle app"** (TS obligatoire) et **"app existante en migration"** (TS recommandé).

---

## 4. `useFetch` vs `ofetch` direct

### Problème observé
La quasi-totalité des apps utilisent **`ofetch`** directement au lieu de **`useFetch`** fourni par `@data-fair/lib-vue/fetch.js`. Même les apps modernes (app-charts, app-contribs, carto-explore) font ce choix.

### Proposition
- **Expliquer concrètement** dans le skill pourquoi `useFetch` est préféré (réactivité, gestion du `loading`, annulation auto des requêtes via AbortController, typage).
- Fournir un **snippet de migration** `ofetch → useFetch` avec un exemple avant/après.
- Si `ofetch` est toléré pour certains cas (téléchargement de fichiers), le documenter explicitement : "`ofetch` direct est réservé aux cas particuliers (blob, download, upload). Tout le reste doit passer par `useFetch`".

---

## 5. Tolérance des versions transitoires (Vuetify 3 / Vite 7)

### Problème observé
Beaucoup d'apps sont sur **Vuetify 3.10+** et **Vite 7.x** (app-eco-watt, data-fair-metrics, app-treemap, list-details, etc.) au lieu de Vuetify 4 / Vite 8.

### Proposition
- Ajouter une section **"Versions transitoires acceptées"** qui précise que Vuetify 3.4+ et Vite 7+ sont tolérés pour les apps existantes, mais que les **nouveaux projets** doivent cibler Vuetify 4 / Vite 8.
- Fournir un mini-guide de migration Vuetify 3 → 4 (changements de props, `variant="flat"`, etc.).

---

## 6. Migration `v-iframe` → `d-frame`

### Problème observé
Certaines apps utilisent encore **`window.vIframeOptions`** ou `@koumoul/v-iframe` (app-documents, app-treemap, data-fair-sunburst, data-fair-portals) au lieu de `@data-fair/frame`.

### Proposition
- Ajouter un **snippet de migration v-iframe → d-frame** dans `references/migration-guide.md`.
- Documenter le remplacement de `window.vIframeOptions = { reactiveParams: ... }` par `createDFrameAdapter(reactiveSearchParams)`.

---

## 7. Prise en compte des apps Nuxt 3

### Problème observé
**app-chord-diagram** est une app **Nuxt 3.5**, pas une app Vite standalone. Elle n'a ni `src/main.ts` ni `src/App.vue`.

### Proposition
- Ajouter une note dans le skill : "Certaines apps métier complexes peuvent être structurées en Nuxt 3. Dans ce cas, la structure de projet diffère (pas de `src/main.ts`), mais les contrats DataFair (`window.APPLICATION`, `public/config-schema.json`, meta tags, `useFetch`) restent applicables".
- Fournir un snippet `nuxt.config.ts` avec `vite-plugin-vuetify` et `@data-fair/lib-*`.

---

## 8. Distinction "App frontend" vs "Plugin backend"

### Problème observé
**catalog-melodi** et **catalog-ods** sont des plugins Node.js backend, pas des apps Vue. Ils ont été analysés mais ne relèvent pas du skill-apps.

### Proposition
- Ajouter une section d'**identification** en début de skill :
  > "Ce skill s'applique aux applications frontend DataFair (visus, formulaires, cartes, tableaux). Si votre projet est un **plugin backend** (catalogue, traitement, connecteur), il ne relève pas de ce skill."
- Lister les indices qui permettent de différencier les deux (présence de `vue`, `vuetify`, `index.html`, `public/` vs `lib/`, `index.ts`, appels API Node).

---

## 9. Renforcement des scripts `package.json`

### Problème observé
Les scripts `dev-server`, `dev-app`, `type-check` sont absents dans la majorité des apps (même récentes).

### Proposition
- Ajouter une section **"Scripts obligatoires et leur rôle"** avec une explication de chaque script :
  - `dev` : lance Zellij avec le layout `.zellij.kdl`
  - `dev-server` : lance `df-dev-server` pour simuler l'environnement DataFair
  - `dev-app` : lance Vite en mode standalone
  - `build` : build de production
  - `lint` : ESLint
  - `type-check` : `vue-tsc --noEmit`
- Insister sur le fait que `type-check` est aussi important que `build`, même pour les apps en JS qui migrent vers TS.

---

## 10. Snippets plus complets pour la réactivité config draft

### Problème observé
Beaucoup d'apps n'implémentent pas (ou mal) la réactivité de la config en draft via `postMessage` (`set-config`).

### Proposition
- Fournir un **snippet complet et copiable** dans `snippets/create-config.ts` qui gère :
  - La lecture initiale depuis `window.APPLICATION`
  - L'écoute `window.addEventListener('message', ...)` avec les 3 formats de `set-config`
  - La fonction `notifyConfigChange(field, value)` pour remonter au parent
  - L'intégration avec `reactiveSearchParams`
- Ajouter un exemple dans la checklist : "Modifier un paramètre dans DataFair en mode draft et vérifier que l'app réagit sans rechargement".

---

## 11. Thème dynamique : snippet et vérification

### Problème observé
`vuetifySessionOptions(session)` est peu utilisé ; beaucoup d'apps ont un thème statique ou ne gèrent pas le dark mode.

### Proposition
- Rendre le snippet `theme-setup.ts` plus visible (le mentionner dans la checklist de livraison).
- Ajouter un test manuel : "Basculer le thème sombre/clair dans DataFair et vérifier que l'app suit".

---

## 12. Checklist de livraison enrichie

### Proposition
Transformer la checklist actuelle en tableau avec 3 niveaux :

| Critère | Obligatoire nouvelle app | Obligatoire app existante | Recommandé |
|---------|-------------------------|---------------------------|------------|
| `build` passe | ✅ | ✅ | - |
| `type-check` passe | ✅ | ⬜ (si JS) | ✅ |
| `lint` passe | ✅ | ✅ | - |
| `public/config-schema.json` | ✅ | ✅ | - |
| `public/thumbnail.png` | ✅ | ✅ | - |
| Réactivité query params | ✅ | ✅ | - |
| Réactivité config draft | ✅ | ⬜ | ✅ |
| État utilisateur dans l'URL | ✅ | ⬜ | ✅ |
| Erreurs de config affichées | ✅ | ✅ | - |
| Layout responsive | ✅ | ✅ | - |
| Thème dynamique | ✅ | ⬜ | ✅ |
| `useFetch` (pas axios/ofetch direct) | ✅ | ⬜ (migration) | ✅ |

---

## 13. Snippet manquant : `useAsyncAction` avec gestion d'erreur

### Proposition
Le skill mentionne `useAsyncAction` mais ne fournit pas de snippet complet. Ajouter `snippets/async-action-full.vue` qui montre :
- L'appel à une action async (ex: export CSV)
- L'état `loading`
- La gestion d'erreur avec snackbar / `v-empty-state`
- L'intégration avec `useAsyncAction` de `@data-fair/lib-vue`

---

## 14. Documenter l'`accessKey` et sa propagation

### Proposition
- Le skill mentionne l'`accessKey` mais de manière très technique. Ajouter un **snippet dédié** (`snippets/access-key.ts`) qui montre :
  - L'extraction depuis `window.APPLICATION.exposedUrl`
  - La propagation aux `d-frame` via la prop `:access-key`
  - La propagation aux appels `useFetch` via le header ou query param si nécessaire

---

## 15. Récapitulatif par profil d'app

### Proposition
Ajouter une matrice en début de skill pour orienter l'agent selon le type d'app détecté :

| Profil d'app | Stack typique | Actions suggérées |
|--------------|---------------|-------------------|
| **Nouvelle visu** | Vue 3.5 + Vite 8 + Vuetify 4 + TS | Suivre le skill à 100 % |
| **Visu Vue 3 JS existante** | Vue 3 + Vite 7 + Vuetify 3 + JS | Migrer vers TS, Vuetify 4, utiliser `useFetch` |
| **Visu Nuxt 3** | Nuxt 3 + Vuetify 4 | Adapter la structure, garder les contrats DataFair |
| **Legacy Nuxt 2** | Nuxt 2 + Vuetify 2 + Vuex | Audit de réécriture ou migration complète |
| **Legacy Vue CLI** | Vue 2 + Webpack + Vuetify 2 | Réécriture recommandée |
| **Plugin backend** | Node.js, pas de Vue | Ne pas utiliser ce skill |

---

*Fichier généré automatiquement à partir de l'analyse de conformité des apps DataFair.*
