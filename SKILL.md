---
name: skill-apps
description: |
  Utiliser dès que l'utilisateur travaille sur une application DataFair : création d'une
  nouvelle app, migration d'un projet legacy, modification ou reprise d'une app existante.
  S'applique aux projets Vue 3 + Vuetify 4 + Vite.
  Utiliser aussi lorsqu'il est question de createConfig, useFetch, reactiveSearchParams,
  window.APPLICATION, config-schema.json, df-dev-server, d-frame, d'intégration iframe DataFair,
  de la configuration (.dev-config.json), du contenu d'index.html et de ses métas
  (application-name, df:sync-state, df:vjsf, df:capture-delay), ou de l'accessibilité RGAA
  d'une visualisation.
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
  "lint": "eslint . --fix",
  "type-check": "vue-tsc --noEmit",
  "build-types": "df-build-types && cp src/config/.type/resolved-schema.json public/config-schema.json"
}
```

## Contrat DataFair

### window.APPLICATION

Dans `index.html`, `%APPLICATION%` est remplacé par DataFair au runtime.
Le code lit `window.APPLICATION` (typé dans `src/types.d.ts`).

> **⚠️ Une seule occurrence du placeholder** : en prod, DataFair remplace `%APPLICATION%` via une regex **non globale** (`replace(/%APPLICATION%/, ...)`) → seule la première occurrence est remplacée. Le dev-server, lui, les remplace toutes (flag `/g`) → comportement divergent dev/prod. Utiliser le placeholder **exactement une fois** dans `index.html`.

**Structure** :

```ts
window.APPLICATION = {
  id, slug, title, owner,
  href: string,            // API URL de l'application
  exposedUrl: string,      // URL publique du proxy (utilisé pour l'accessKey)
  apiUrl: string,          // e.g. https://.../api/v1
  wsUrl: string,           // WebSocket URL
  captureUrl: string,      // URL du service de capture (screenshots / print)
  applicationKey?: string, // présent uniquement si l'app est accédée avec une clé
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

### .dev-config.json — configuration courante de dev

`df-dev-server` lit `.dev-config.json` à la racine du projet et injecte son contenu dans `window.APPLICATION.configuration` via `%APPLICATION%`. C'est l'équivalent dev de la config injectée par DataFair en production.

> **Règle** : quand l'utilisateur dit « la configuration », lire `.dev-config.json`. Le fichier est aussi disponible pour tout contexte de configuration — le lire si on a besoin de plus de contexte, même sans demande explicite.

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
- `public/thumbnail.png` : Miniature pour la galerie d'applications. C'est la **présence du fichier à la racine** qui compte, et elle seule : `baseApp.image` est calculé en dur — `baseApp.url + 'thumbnail.png'` (`base-applications/operations.ts`). La meta `thumbnail` n'a aucun consommateur, ne pas la déclarer. `%PUBLIC_URL%` n'est substitué par aucun outil, ne pas l'utiliser non plus.

### index.html — document complet

```html
<!DOCTYPE html>
<html><!-- pas de lang : posé par le proxy data-fair -->
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Charts</title>

    <!-- contrat data-fair, lu à l'exécution -->
    <meta name="df:vjsf" content="3">
    <meta name="df:filter-concepts" content="true">
    <meta name="df:sync-config" content="true">
    <meta name="df:sync-state" content="true">
    <meta name="df:overflow" content="false">

    <!-- catalogue, lu à l'import — migrera vers registry -->
    <meta name="application-name" content="app-charts">
    <meta name="description" content="A simple charts application for data-fair.">

    <script>window.APPLICATION=%APPLICATION%;</script>
  </head>
  <body>
    <main id="app" style="height:100vh"></main>
  </body>
</html>
```

Quatre points de ce squelette ne se devinent pas :

- **Pas d'attribut `lang` sur `<html>`.** Le proxy filtre l'attribut déclaré puis le repose depuis la locale de la requête (`api/src/applications/proxy.ts`). Conserver le commentaire : sans lui, un agent qui régénère le fichier remettra `lang="fr"`, que tous les linters HTML réclament.
- **`<meta charset>` en premier**, dans les 1024 premiers octets — un bloc de commentaire placé avant suffit à le repousser et à casser la validation.
- **Un seul `<title>` et une seule `<meta name="description">`.** Les dupliquer avec un attribut `lang` pour porter l'i18n est invalide en HTML et produit deux erreurs W3C. L'i18n du catalogue passera par registry, qui porte `title` et `description` en objets `{ en, fr }`.
- **`<main id="app">` et non `<div id="app">`** — cf. `references/accessibility-rgaa.md`.

#### `<title>` et `meta name="title"` : deux choses différentes

`<title>` est le titre du document, pour l'utilisateur et les technologies d'assistance. `meta name="title"` est le libellé du modèle au catalogue DataFair.

Les deux alimentent `meta.title`, mais **`meta name="title"` écrase la valeur issue de l'élément** : `meta.title` est posé depuis `<title>` puis réécrit par la boucle sur les métas, `title` étant aussi une clé de `metasByName` (`base-applications/service.ts`). Une brique qui déclare les deux n'utilise donc pas son `<title>` comme métadonnée.

**Convention retenue** : on abandonne `meta name="title"`. `<title>` porte le nom anglais du modèle (`Charts`, `Dashboards`, `Treemap`). Le titre du document servi à l'utilisateur sera posé par le proxy depuis le titre de la visualisation, comme il le fait pour `lang` — aucun `document.title` à écrire dans l'application.

#### `application-name` : la clé d'identité, pas un libellé

```
nom du dépôt  =  package.json name (hors scope)  =  meta application-name
     app-charts        @data-fair/app-charts             app-charts
```

Format `[a-z0-9-]` : sans accent, sans espace, sans majuscule.

C'est la **clé d'identité de la brique entre ses versions**. Elle permet à DataFair de reconnaître `app-charts@1.2` et `app-charts@1.3` comme un même modèle et de proposer la montée de version — filtre `?applicationName=`, qui matche `applicationName` ou `meta.application-name` (`base-applications/router.ts`). Champ requis du schéma `BaseApp`, et seule porte d'entrée à l'import si l'application n'expose pas de `config-schema.json`.

C'est aussi ce qui rend un renommage possible. Le nom du dépôt est invisible pour DataFair, qui ne voit qu'une URL de brique : le renommer n'a aucun effet. Renommer le paquet npm change l'URL, donc l'identifiant de la brique (`id: slug(app.url)`) — DataFair enregistre une **nouvelle** brique, l'ancienne subsiste et les applications existantes continuent de fonctionner. `application-name` inchangée relie les deux.

> **Règle de modification** : à la création, les trois noms alignés sont une contrainte. Sur une application existante, **n'en modifier aucun des trois** — c'est une décision humaine, jamais un effet de bord d'une migration. Réaligner une brique déjà enregistrée exige de patcher aussi l'`applicationName` **stocké** de toutes ses versions, sinon la correspondance des versions est perdue.

#### Métas à ne pas déclarer

| Méta | Raison |
|---|---|
| `keywords` | extraite dans `baseApp.meta.keywords`, jamais relue. Aucun consommateur dans data-fair, portals, registry, capture, frame ni lib. Absente du type `BaseApp` |
| `thumbnail` | aucun consommateur, `baseApp.image` est calculé en dur (cf. fichiers publics obligatoires) |
| `vocabulary-accept`, `vocabulary-require` | zéro occurrence, tous dépôts confondus. Les filtres sur jeux de données sont déduits de `config-schema.json` et stockés dans `datasetsFilters` |
| `version` | `baseApp.version` est déduit du segment de version de l'URL de la brique, ou saisi en administration. Attention, ce repli est cassé pour les URL jsdelivr : `.../app-charts@1.3/dist/` donne `"dist"`. Registry fournira la version depuis le paquet npm |
| `title` | abandonnée, cf. ci-dessus |
| `x-capture` | déprécié, cf. section capture |
| `{VERSION}` | artefact de build, cf. ci-dessous |

| Meta tag | Rôle |
|---|---|
| `df:vjsf` | Version de VJSF du schéma de config. Seule la valeur `"3"` est reconnue (sinon mode compat VJSF 2). Obligatoire pour les nouveaux projets. |
| `df:filter-concepts` | Active les filtres par concepts partagés avec d'autres vues DataFair. |
| `df:sync-config` | Active le rechargement à chaud de la configuration en mode draft (`postMessage` de type `set-config`). |
| `df:sync-state` | Active la synchronisation de l'état de l'application avec son parent (portail, dashboard, capture d'écran). DataFair injecte alors les shims `v-iframe-compat` / `d-frame-content`. |
| `df:overflow` | Déclare que la visu peut grandir au-delà de la hauteur du conteneur (tableau de bord qui s'allonge). Lu par les parents (dashboard, portail, service) pour décider si l'iframe peut fluer. Le redimensionnement **moderne** est géré nativement par d-frame : côté enfant via `data-iframe-height` sur la racine, côté parent via `resize="auto"` sur `<d-frame>`. `iframe-resizer` n'est plus utilisé que sur le chemin **legacy** sans `?d-frame=true`. `"true"` pour une visu qui s'allonge, `"false"` pour une visu à hauteur fixe. |

> **⚠️ `df:sync-state` : toujours la déclarer explicitement.** Le proxy teste `=== "true"` (`api/src/applications/proxy.ts`), tandis que le dialogue de capture du backoffice teste « présente **et** `!== "false"` » (`ui/src/components/application/application-capture-dialog.vue`). Omettre la balise et la mettre à `"false"` ne sont donc pas équivalents partout.

> **Attention à ne pas confondre** : `df:sync-config` concerne la **configuration** (hot reload draft), tandis que `df:sync-state` concerne l'**état runtime** de l'application (params URL, sélection, etc.). Pour une app embarquée dans un dashboard ou un portail, les deux sont généralement nécessaires.

> **Note sur les filtres par concepts** : le nom canonique reconnu par DataFair est `df:filter-concepts` (vérifié dans `api/src/applications/service.ts`). Certaines apps récentes utilisent à tort `df:concept-filters` (erreur historique de documentation, zéro occurrence dans le code). Pour les **nouveaux projets**, utilisez impérativement `df:filter-concepts`. Lors d'une migration ou maintenance d'app legacy, corrigez `df:concept-filters` en `df:filter-concepts`.

> **⚠️ Artefact de build `{VERSION}`** : ne jamais laisser de placeholder non substitué dans les metas de `index.html`. Une meta `<meta name="{VERSION}" content="trigger">` (nom littéral `{VERSION}`) s'est retrouvée en prod dans 32 base apps (800+ apps) — elle ne sert à rien et pollue le catalogue. Avant chaque build, vérifier qu'aucun `{...}` non substitué ne subsiste ; lors d'une migration, retirer la meta `{VERSION}` si elle est présente.

### Capture d'écran / miniatures

DataFair capture les apps (miniature de galerie, bouton « capture » du backoffice, print PDF) via un service headless qui charge l'app dans un navigateur. L'app peut influencer le timing de la capture.

**Stratégie d'attente du service** :
1. Si l'app appelle `window.triggerCapture(animationSupported?)` → capture immédiate.
2. Sinon, après network idle : attente de `triggerCapture` pendant `df:capture-delay` secondes (si la meta est présente), sinon +1 s de sécurité puis capture.
3. Timeout global du service en dernier recours.

| Meta / mécanisme | Rôle |
|---|---|
| `window.triggerCapture(animationSupported?)` | Fonction injectée par le service dans la page. L'appeler dès que la visu est **réellement rendue** (données chargées, carte prête). Passer `true` si l'app supporte le mode animation (GIF). |
| `<meta name="df:capture-delay" content="2">` | Après network idle, attend `triggerCapture` jusqu'à N secondes avant de capturer quand même. |
| `<meta name="x-capture" content="trigger">` | **Déprécié** (rétro-compat) : attend `triggerCapture` après network idle, jusqu'au timeout. Remplacer par `df:capture-delay` + appel explicite. |
| `df:capture-width` / `df:capture-height` | Dimensions de la capture, en pixels. **Trois niveaux de défauts** : le service capture retient 800×450 si l'appelant n'envoie rien (`capture/api/routers/capture.ts`), le dialogue du backoffice pré-remplit `meta \|\| 800×450`, les portails envoient `meta \|\| 1280×720` (`portals/.../application-capture.vue`). Même ratio 16:9, résolutions différentes. À ne déclarer que si le rendu impose un format précis — sinon laisser les appelants décider. |
| `?thumbnail=true` | Paramètre ajouté à l'URL cible pour la miniature par défaut — l'app peut adapter son rendu (masquer contrôles, légendes, etc.). |

> **⚠️ Piège** : si l'app annonce une attente explicite (`df:capture-delay` ou `x-capture: trigger`) mais n'appelle jamais `triggerCapture` (ex. appel conditionné à une ressource qui n'existe pas), chaque capture attend le **timeout complet** du service. Appeler `triggerCapture` de façon fiable — y compris en cas d'erreur de chargement.

> **Règle de migration** : `x-capture` est déprécié — lors de toute migration ou maintenance d'app existante, le **retirer** et le remplacer par `df:capture-delay` + un appel explicite à `window.triggerCapture()` (fiable, y compris en erreur). Une app qui garde `x-capture` sans jamais appeler `triggerCapture` fait attendre le timeout du service de capture à chaque capture backoffice (constaté sur ~100 base apps en prod, 2 600+ apps configurées).

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
| `snippets/ui-notif.ts` | Notifications globales avec `<DfUiNotif />` de `@data-fair/lib-vuetify` + `createUiNotif` / `useUiNotif` |
| `snippets/hot-reload.ts` | Rendre la config réactive en mode draft (df:sync-config="true") |
| `snippets/draft-qs-filter.ts` | **Déprécié** — ancienne sync `staticFilters` → `qsFilter` (abandonnée : plus de `qs` pour les filtres statiques) |
| `snippets/schema-static-filters.ts` | Définition VJSF des filtres statiques prédéfinis (`in`, `out`, `interval`, `starts`, `exists`, `notExists`) |
| `snippets/report-config-error.ts` | Remonter une erreur de config à DataFair (`POST /error`, mode draft) |
| `snippets/d-frame.ts` | Intégration d'autres vues DataFair via d-frame (côté parent + côté enfant) |
| `snippets/schema-tabs.ts` | Organisation par onglets (`allOf` + `title`) |
| `snippets/schema-discriminator.ts` | Discrimination de type (`discriminator` + `oneOf` + `const`) |
| `snippets/schema-getitems.ts` | Sélecteurs dynamiques peuplés par API (`layout.getItems` avec `url`) |
| `snippets/schema-getitems-expr.ts` | Sélecteurs dynamiques peuplés par expression (`layout.getItems` avec `expr`) |
| `snippets/schema-array.ts` | Arrays avancés (`itemTitle`, `itemCopy`, `getDefaultData`) |
| `snippets/schema-conditional.ts` | Affichage conditionnel (`layout.if` / `layout.switch`) |
| `snippets/schema-hidden.ts` | Champs cachés (`layout: "none"`) |
| `snippets/schema-xexports.ts` | Génération de types TypeScript (`x-exports`) |
| `snippets/schema-color.ts` | Couleurs (string hex + pattern thème/custom, piège `format: "hexcolor"`) |

> **⚠️ Attention : `createSession` est asynchrone**
> `createSession({ siteInfo: true })` fetch les infos du site (thème, couleurs, locale) via API. Il **doit être `await`** avant d'appeler `vuetifySessionOptions(session)`. Ne jamais appeler `createSession` de manière synchrone en dehors d'une fonction `async`.

> **⚠️ Attention : `createI18n` doit être créé au niveau module, pas dans `init()`**
> Plusieurs composants de `@data-fair/lib-vuetify` (`ui-notif`, `colors-preview`, `layout-empty-state`, `layout-fetch-error`, ...) appellent `useI18n()` **à l'évaluation du module** (`const { t } = useI18n()` en top-level du fichier compilé). Si `createI18n` est créé dans `init()` (donc après ces imports), ces modules reçoivent une instance i18n non initialisée et les traductions de la lib ne fonctionnent pas (snackbar, empty state, page d'erreur).
> **Pattern correct** :
> ```ts
> // Au niveau module, AVANT init() et AVANT createApp()
> const i18n = createI18n({ locale: 'fr', fallbackLocale: 'en' })
>
> async function init () {
>   const session = await createSession(...)
>   i18n.global.locale.value = session.lang.value  // ajustement async
>   const app = createApp(App)
>   app.use(i18n)
>   ...
> }
> ```
> Voir `snippets/main.ts` pour le bootstrap complet.

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

> **Note** : `df-build-types` est fourni par le package **`@data-fair/lib-types-builder`** (à installer en `devDependencies`).

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

**Script** (dans `package.json`) :
```json
{
  "build-types": "df-build-types && cp src/config/.type/resolved-schema.json public/config-schema.json"
}
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

### Prérequis dataset déclarés par l'URL du sélecteur

Les paramètres du `getItems.url` (ou de `x-fromUrl`) de la propriété `datasets` ne servent pas qu'au formulaire : à l'enregistrement de la base application, DataFair résout `config-schema.json` et en **déduit les filtres de compatibilité** (`datasetsFilters`) — ex. `bbox=true` (jeux géo), `concepts=https://schema.org/box`. Ces filtres déterminent les jeux proposés à la configuration et les messages « Cette application nécessite… » du catalogue.

- Déclarer les prérequis dans l'URL du sélecteur racine `datasets` : `api/v1/datasets?status=finalized&bbox=true&...`.
- Les placeholders `${...}` (ex. `${context.datasetFilter}`) sont ignorés par l'extraction.
- La meta `vocabulary-require` des apps legacy n'est **plus lue** (aucune occurrence dans le code) : la supprimer lors des migrations et reporter l'exigence dans l'URL du sélecteur.

### Layouts spéciaux

| Layout | Usage | Exemple |
|--------|-------|---------|
| `slider` | Entier avec curseur | `opacity`, `tension` |
| `color-picker` | Sélecteur de couleur | `color` |
| `textarea` | Texte multiligne | `description` |
| `none` | Champ caché | `uuid`, `hash` |
| `tabs` | Onglets explicites à la racine | data-fair-metrics |
| `getItems` | Sélecteur peuplé dynamiquement | datasets, champs |

> Voir `snippets/schema-hidden.ts`.

### Schémas de couleur

Deux patterns selon le besoin :

**1. Couleur simple (string hex)** — pour la majorité des cas :
```json
{
  "type": "string",
  "title": "Couleur",
  "default": "#1976D2",
  "layout": "color-picker"
}
```

**2. Couleur thème OU custom** — quand l'utilisateur doit pouvoir choisir entre une couleur Vuetify (primary, secondary, ...) et une couleur libre :
```json
{
  "type": "object",
  "title": "Couleur",
  "discriminator": { "propertyName": "type" },
  "oneOf": [
    {
      "title": "Thème",
      "properties": {
        "type": { "const": "theme" },
        "strValue": {
          "type": "string",
          "oneOf": [
            { "const": "primary", "title": "Primaire" },
            { "const": "secondary", "title": "Secondaire" }
          ]
        }
      }
    },
    {
      "title": "Personnalisée",
      "properties": {
        "type": { "const": "custom" },
        "hexValue": { "type": "string", "default": "#222222", "layout": "color-picker" }
      }
    }
  ]
}
```

> **⚠️ Anti-pattern** : ne jamais écrire `"format": "hexcolor"`. Ce format n'existe pas dans le validateur JSON Schema standard et VJSF 3 émet un warning `unknown format "hexcolor" ignored in schema`. Le rendu reste correct par chance (grâce à `layout: "color-picker"`) mais le `format` est trompeur. À retirer lors de toute migration ou revue de schéma.

> Voir `snippets/schema-color.ts` pour les deux patterns complets et prêts à copier.

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
  - Sérialiser les filtres avec la convention interop : champ à concept → `_c_<conceptId>_<op>`, champ sans concept → `_d_<datasetId>_<fieldKey>_<op>` (jamais de clé nue dans une URL partagée — portals et apps ne les lisent pas).
  - En réception, utiliser `useConceptFilters(reactiveSearchParams, datasetId)` (`@data-fair/lib-vue/concept-filters.js`) pour extraire les filtres `_c_*` et dé-préfixer les `_d_<datasetId>_*` de votre dataset.
  - Une sélection émise (clic) = filtre `_c_`/`_d_` + marqueur `_s_<cible>=app_<id>` : l'app source s'auto-exclut, les autres appliquent le filtre. Voir le mode sélection `_s_` dans `references/filters-url-convention.md`.
  - Voir `references/filters-url-convention.md`.
- **Thème dynamique** : sombre/clair fonctionne via `vuetifySessionOptions(session)`.

### HTTP

- **Toujours utiliser `useFetch`** de `@data-fair/lib-vue/fetch.js` (wrapper réactif autour de `ofetch`) pour les **lectures** de données (GET).
- `ofetch` direct est toléré pour les **mutations** (POST, PUT, PATCH, DELETE) lorsqu'elles sont encapsulées dans **`useAsyncAction`** (loading, erreur et notification gérés par le composable).
- `ofetch` direct est aussi réservé aux cas très particuliers (blob, download, upload).
- **Jamais `fetch` natif**, jamais `axios`.

**Pourquoi `useFetch` est obligatoire pour les lectures** :
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

**Utilitaires d'erreur** — `@data-fair/lib-vue/ui-notif.js` expose `getErrorMsg(error)` et `getErrorCode(error)` pour extraire proprement le message et le code HTTP d'une erreur API (compatible `ofetch`, `axios`, `fetch` natif).

### Performances

- Débouncer les appels API (`useDebounce` de `@vueuse/core`).
- Utiliser `useFetch` qui gère AbortController (annulation auto des requêtes obsolètes).
- Ne pas faire d'appels HTTP dans les handlers d'événements bruts ; encapsuler dans des fonctions ou composables.

**Exemple `useDebounce`** (params API calculés à partir de filtres utilisateur) :

```ts
import { useDebounce } from '@vueuse/core'
import { computed } from 'vue'
import { filters2params } from '@data-fair/lib-utils/filters/index.js'

const baseParams = useDebounce(
  computed(() => {
    const params: Record<string, any> = { ...conceptFilters }
    if (staticFilters.length) {
      Object.assign(params, filters2params(staticFilters)) // params REST, plus de `qs`
    }
    return params
  }),
  500 // ms — évite de spammer l'API quand l'utilisateur change plusieurs filtres rapidement
)
```

### Accessibilité (RGAA)

**Référence complète : `references/accessibility-rgaa.md`.** À lire dès qu'on touche au rendu d'une visualisation ou à `index.html`.

Les applications sont majoritairement embarquées dans des portails du secteur public soumis au RGAA 4.1, et une brique non conforme rend non conformes **toutes** les visualisations qui l'utilisent.

Le point à comprendre : le document servi à `/data-fair/app/<id>` est une **page web autonome**. Il n'hérite ni de la langue, ni du `<main>`, ni des titres de la page porteuse. Une visualisation qui rend dans un `<canvas>` sans alternative a un arbre d'accessibilité **vide** — un lecteur d'écran ne restitue rien, et aucun réglage de couleur n'y change quoi que ce soit.

Les cinq points qui reviennent sur tout le parc :

| Point | Critères |
|---|---|
| `<main id="app">` et non `<div id="app">` | 9.2, 12.6 |
| Nom accessible + tableau de données équivalent pour tout canvas ou svg porteur d'information | 1.1, 1.6, 4.8, 4.9 |
| Visualisation atteignable et opérable au clavier, infobulles masquables par Échap | 7.1, 7.3, 10.13, 12.11 |
| Texte du graphique agrandissable à 200 % — le texte rasterisé d'un canvas ne l'est pas | 10.4 |
| Séries distinguables autrement que par la couleur, ratios ≥ 3:1 — y compris dans les palettes par défaut du schéma de config | 3.1, 3.3 |

Un rendu **SVG** satisfait gratuitement le critère 10.4 et se rend accessible sur place, contrairement à un canvas. À prendre en compte au moment de choisir une bibliothèque de graphiques.

### États de chargement et d'erreur (UX)

- Gérer l'état de chargement (`loading` de `useFetch` ou `useAsyncAction`).
- Gérer l'état d'erreur (snackbar ou `v-empty-state`).
- Afficher un `v-empty-state` si la configuration est incomplète ou invalide.

> **Composants `@data-fair/lib-vuetify` complémentaires** :
> - `layout-fetch-error.vue` — page d'erreur complète (404/403/500, SVG thémés, i18n, bouton retour, switch org).
> - `layout-empty-state.vue` — empty state avec icône, texte i18n et bouton d'action optionnel.
> Ces composants sont disponibles dans `@data-fair/lib-vuetify` et peuvent être utilisés dans les apps métier ou visus complexes.

## Intégration iframe / d-frame

### Modèle mental : parent vs enfant

Quand vous intégrez une vue DataFair via `<d-frame>`, deux espaces de paramètres URL coexistent :

| Espace | Clés typiques | Préfixage |
|---|---|---|
| Parent (notre app) | `_d_{datasetId}__id_eq`, `_d_{datasetId}__c_*` | Préfixé par l'id du dataset pour les apps data-fair |
| Enfant (iframe) | `_id_eq`, `_c_*`, `_d_*` | Conventions REST data-fair natives |

L'attribut `sync-params` du `<d-frame>` traduit les clés du parent vers l'enfant. Une règle `enfantKey:parentPrefix_` fait la **substitution** : `_d_{id}_id_eq` côté parent → `_id_eq` côté enfant. Une règle sans `:parentPrefix_` est une **identité** (la clé passe inchangée).

**Conséquence** : votre code n'a besoin de connaître que la convention **parent**. C'est `:sync-params` qui adapte ce qui est passé à l'enfant. Voir `references/embeds-params.md` pour le détail par type d'embed.

### Paramètres réactifs

Deux mécanismes complémentaires, **à utiliser ensemble** :

| Mécanisme | Rôle | Sens |
|---|---|---|
| `createDFrameAdapter` (`:adapter="..."` sur `<d-frame>`) | L'app **embarque** d'autres vues (côté parent) | Enfant → parent : `stateChange` du d-frame enfant est reflété dans le `reactiveSearchParams` de l'app |
| `window.vIframeOptions = { reactiveParams }` | L'app est **embarquée** dans un d-frame externe (côté enfant) | Parent → enfant : `updateSrc` reçu est appliqué aux params de l'URL **sans recharger l'iframe** |

Une même app peut être les deux à la fois (visu embedded dans un portail ET qui embed elle-même d'autres vues) : il faut alors **les deux**.

```ts
// Côté parent : synchroniser les params vers les embeds d-frame
import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)
```

```ts
// Côté enfant : éviter le rechargement complet quand l'app est embedded
// dans un d-frame parent (portail, dashboard, autre app). À mettre dans
// src/main.ts, au niveau module, AVANT createApp().
// @ts-expect-error vIframeOptions n'est pas typé globalement
window.vIframeOptions = { reactiveParams: reactiveSearchParams }
```

Sans `window.vIframeOptions`, le shim `v-iframe-compat/d-frame-content.js` (injecté par DataFair dans toute iframe) tombe dans son fallback `window.location.href = src` à chaque `updateSrc` → **rechargement complet → clignotement** de la visu.

**Injection du shim en prod** (`api/src/applications/proxy.ts`) — le shim n'est **pas toujours injecté** :
- URL avec `?d-frame=true` **et** meta `df:sync-state` ou `df:overflow` → `v-iframe-compat/d-frame-content.min.js`. C'est la voie **moderne** : ce shim gère à la fois la synchro d'état (`updateSrc`) et le redimensionnement (`data-iframe-height` → message `df-child:height`).
- Sinon (URL sans `?d-frame=true`, **chemin legacy**) : meta `df:sync-state` → `@koumoul/v-iframe` (content-window) ; meta `df:overflow` → `iframe-resizer` (contentWindow).
- Sans ces metas → **aucun shim** : pas de synchro d'état ni de redimensionnement.
- Le dev-server injecte le shim d-frame **systématiquement** (sans condition) → ne pas se fier au comportement dev pour valider les metas.

> **⚠️ `iframe-resizer` est un héritage du chemin legacy** (sans `?d-frame=true`). Pour tout nouvel embed ou migration, c'est d-frame qui porte le redimensionnement : voir la sous-section « Redimensionnement » ci-dessous. Ne pas compter sur `iframe-resizer` pour une app embarquée via `<d-frame>`.

### Se comporter en enfant d'un d-frame externe

Quand l'app est embarquée dans un portail, un dashboard ou une autre app via `<d-frame>`, le parent envoie des messages `updateSrc` à chaque changement de paramètres synchronisés. Le shim `v-iframe-compat` injecté par DataFair dans toute iframe essaie trois stratégies, dans l'ordre :

1. `window.vIframeOptions.reactiveParams` → applique les params à un objet réactif (pas de rechargement)
2. `window.vIframeOptions.router` → `router.replace(newRoute)` (pas de rechargement)
3. Fallback → `window.location.href = src` → **rechargement complet**

Pour éviter le clignotement, exposer `reactiveSearchParams` au shim dès l'initialisation de l'app (avant `createApp` dans `src/main.ts`) :

```ts
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

;(window as any).vIframeOptions = { reactiveParams: reactiveSearchParams }
```

**Quand c'est nécessaire** :
- L'app est destinée à être embedded dans un portail, un dashboard, ou une autre app via `<d-frame>`.
- Et le parent utilise `sync-params` (ou modifie le `src` du d-frame).

**Quand ce n'est pas nécessaire** :
- Visu simple affichée en pleine page sans être embedded.
- Visu embedded sans `sync-params` côté parent (rare, le parent ne fait que recharger l'iframe au changement de `src`).

Voir `snippets/main.ts` pour le setup complet et `references/migration-guide.md` section "v-iframe → d-frame" pour ne pas supprimer ce bloc lors d'une migration.

### Communication avec le parent (postMessage)

**Écouter la config en draft** — l'UI DataFair n'émet réellement que **2 formats** (vérifié dans `application-config.vue`) :

```ts
window.addEventListener('message', (event) => {
  if (event.data?.type === 'set-config' && event.data?.content) {
    const { content } = event.data
    if (content.configuration) {
      // Tolérance défensive : format enveloppé, jamais émis par l'UI actuelle
      config.value = content.configuration
    } else if (content.chart || content.datasets || content.layers || content.metrics) {
      // Format réel UI → app : la config directement dans content.
      // ⚠️ Fusionner avec la config existante plutôt qu'écraser : certains
      // émetteurs n'envoient qu'un sous-arbre modifié (perte des champs frères sinon).
      config.value = { ...toRaw(config.value), ...content }
    } else if (content.field && 'value' in content) {
      // Update par path : { field: 'chart.colors.0', value: '#ff0000' }
      const newConfig = JSON.parse(JSON.stringify(config.value))
      setByPath(newConfig, content.field, content.value)
      config.value = newConfig
    }
  }
})
```

> **Hors `df:sync-config`** : l'UI ne poste pas de `set-config` — elle recharge l'iframe de prévisualisation à chaque sauvegarde du brouillon.

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

#### Redimensionnement

Le redimensionnement des embeds d-frame remplace l'ancien `iframe-resizer` (chemin legacy sans `?d-frame=true`). Il repose sur un protocole natif : l'app **enfant** mesure ses éléments porteurs d'un attribut `data-iframe-height`, et le composant **parent** `d-frame` applique la hauteur reçue.

**Côté enfant** (l'app embarquée) — poser `data-iframe-height` sur le ou les éléments dont la hauteur doit piloter l'iframe :

```vue
<template>
  <v-container data-iframe-height>
    ...
  </v-container>
</template>
```

- `data-iframe-height="<offset>"` ajoute un décalage en pixels sous l'élément.
- `data-iframe-height="false"` / `"no"` neutralise l'élément.
- Le shim `d-frame-content` injecté par DataFair mesure le maximum des positions basses et envoie `df-child:height` au parent (`lib/DFrameContent.ts`). Le `data-iframe-height` est donc lu **même sans code app** : il suffit que l'app soit servie avec `?d-frame=true` et déclare `df:sync-state` ou `df:overflow`.

**Côté parent** (l'app qui intègre) — contrôler la politique de hauteur via l'attribut `resize` du `<d-frame>` :

| `resize` | Comportement |
|---|---|
| `auto` | Hauteur pilotée par les messages `df-child:height` de l'enfant (`data-iframe-height`). |
| `yes` | Même protocole, mais l'iframe est prête dès le premier message de hauteur. |
| `no` | Hauteur fixe : attribut `height`, sinon ratio d'aspect (`aspect-ratio`). |

```vue
<template>
  <d-frame
    :src="src"
    :adapter="dFrameAdapter"
    resize="auto"
  />
</template>
```

> **⚠️ Le parent décide, l'enfant annonce.** Une app qui déclare `df:overflow="true"` **annonce** qu'elle peut grandir, mais c'est le `resize` du `<d-frame>` parent qui **active** la prise en compte (`resize="auto"`). C'est ainsi que `app-dashboards` pilote ses éléments : il lit la meta `df:overflow` de l'app embarquée pour choisir entre hauteur contrainte et hauteur fluide (`src/components/element-dframe.vue`).

> Voir la documentation `@data-fair/frame` : `doc/pages/dynamic-height.vue` (tagging `data-iframe-height`, offset), `doc/pages/dynamic-src.vue` (variant vue-router) et `doc/pages/iframe-resizer.vue` (comparaison / rétro-ingénierie).

## Récupération des données

Voir `references/endpoints-datafair.md` pour les endpoints API (utilisés par les apps pour fetcher leurs propres données) et `references/embeds-params.md` pour les paramètres des vues embed (utilisées via d-frame).

> **Convention URL des filtres** : la sérialisation des filtres dans l'URL
> (interop entre apps, portails et dashboards) suit une convention unique —
> filtres sur champ à concept = `_c_<conceptId>_<op>`, filtres sur champ sans
> concept = `_d_<datasetId>_<fieldKey>_<op>` (préfixe obligatoire). Voir
> `references/filters-url-convention.md`.

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
- Filtres : privilégier `*_eq` et `*_in` (ex: `departement_eq=75`) pour les appels REST directs ; dans une URL partagée (état d'app, pages portals), suivre la convention `_c_<concept>` / `_d_<datasetId>_<field>_<op>` (voir `references/filters-url-convention.md`)
- `qs` : uniquement pour des filtres dynamiques complexes. **Ne plus l'utiliser pour les filtres statiques** — voir la section `staticFilters` ci-dessous.

### Filtres statiques prédéfinis (`staticFilters`)

Les apps définissent souvent dans leur config un tableau `staticFilters` de filtres
appliqués en permanence aux sources. Chaque filtre est un objet
`{ type, field, ... }` où `field` peut être une chaîne (clé du champ) ou un objet
`{ key }` (normalisation app-side `normalizeStaticFilters` : string → `{ key }`).

**⚠️ Ne plus utiliser le paramètre `qs` pour les filtres statiques.** La conversion se
fait en **paramètres REST suffixés** via `filters2params` de
`@data-fair/lib-utils/filters`. Les fonctions `filter2qs` / `filters2qs` et le champ de
config `qsFilter` associé sont **dépréciés** (le `qs` reste réservé aux logiques de
filtrage complexes, cf. « Paramètres communs »).

| type | sens | param REST |
|---|---|---|
| `in` | inclure des valeurs | `key_in=v1,v2` |
| `out` | exclure des valeurs | `key_nin=v1,v2` |
| `interval` | intervalle (bornes incluses) | `key_gte=min` + `key_lte=max` (seules les bornes renseignées sont émises) |
| `starts` | commence par | `key_starts=prefixe` |
| `exists` | exclure les valeurs vides / non définies | `key_exists` (valeur `' '`, convention UI DataFair) |
| `notExists` | restreindre aux valeurs vides / non définies | `key_nexists` (valeur `' '`, convention UI DataFair) |

La définition canonique du type `Filtres` et la conversion vivent dans
`@data-fair/lib-utils` (monorepo `data-fair/lib`, `packages/utils/filters/schema.json`
+ `index.ts`). Le schéma UI d'une app doit rester aligné avec ce type : il duplique la
définition `oneOf` (discriminator sur `type`, cf. « Discrimination de type ») en y
ajoutant les `getItems` dataset-spécifiques (sélecteur de champ, valeurs) — voir
`snippets/schema-static-filters.ts`.

Flux runtime :

```ts
import { filters2params } from '@data-fair/lib-utils/filters/index.js'
import { normalizeStaticFilters } from '@/utils/staticFilters' // field string → { key }

const sf = normalizeStaticFilters(config.staticFilters)
const params: Record<string, any> = { size: 0, finalizedAt, ...conceptFilters }
if (sf.length) Object.assign(params, filters2params(sf))
const { data } = useFetch(() => datasetUrl + '/lines', { query: params })
```

> **Ne pas confondre** avec la convention « objet plat » utilisée par app-dashboards
> (`{ ...config.staticFilters }` spreadé tel quel dans les params REST), illustrée dans
> `references/filters-url-convention.md`. Le pattern array → `filters2params` est celui
> des visus (carto-explore, treemap, list-details, calendar, charts…).

## Checklist de livraison

- [ ] `npm run build` passe
- [ ] `npm run type-check` passe (TS strict)
- [ ] `npm run lint` passe
- [ ] `public/config-schema.json` est généré et à jour
- [ ] `public/thumbnail.png` est présent
- [ ] `index.html` : pas de `lang` sur `<html>`, `charset` en premier, un seul `<title>`, une seule `<meta name="description">`, `<main id="app">`
- [ ] `application-name` = nom du dépôt = nom du paquet, en `[a-z0-9-]`
- [ ] aucune méta morte (`keywords`, `thumbnail`, `vocabulary-*`, `version`, `title`, `x-capture`, `{VERSION}`)
- [ ] accessibilité : checklist de `references/accessibility-rgaa.md` passée
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
- **Ne jamais modifier** le nom du dépôt, le `name` du `package.json` ni la méta `application-name` d'une application existante : décision humaine (cf. section `application-name`).
- **Une correction dans `index.html` peut ne pas remonter dans le catalogue.** Les champs Titre, Description, Identifiant d'application, Version, Image et Catégorie de l'écran d'administration des briques font un `$set` direct en base, et la résolution est `baseApp.X || baseApp.meta.X` (`base-applications/operations.ts`) : la valeur saisie gagne toujours sur la méta et **survit aux ré-imports**. Pour revenir à la valeur du code, vider le champ côté administration.
- Privilégier la logique métier dans les **composables** plutôt que dans les composants.
- Garder les composants comme des **orchestrateurs** : props, emits, appels aux composables, template.
- Tout nouveau fichier source doit être `.ts` ou `.vue` avec `lang="ts"`.
- Ajouter les extensions globales de `Window` dans `src/types.d.ts`.
