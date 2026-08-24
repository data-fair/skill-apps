---
name: skill-apps
description: >
  Utiliser dès que le travail porte sur une application DataFair (visu Vue 3 +
  Vuetify 4 + Vite) : création d'une nouvelle app, migration d'un projet legacy,
  reprise d'une app existante. Déclencheurs : window.APPLICATION,
  config-schema.json, .dev-config.json, df-dev-server, d-frame ou intégration
  iframe, createConfig, useFetch, reactiveSearchParams, index.html et ses métas
  df:*, capture d'écran et miniatures, thème dynamique (_theme.css, mode sombre,
  contraste renforcé), internationalisation de session, accessibilité RGAA d'une
  visualisation, fichiers racine (eslint, tsconfig, vite, zellij, husky,
  commitlint) et tests Playwright.
---

# Skill Apps – DataFair Applications

## Contexte

Ce skill guide la création et la maintenance d'applications DataFair (visus, apps métier, cartes, formulaires, etc.).

**Profils d'app courants** :
- **Nouvelle visu** → Suivre ce skill à 100 %
- **Visu existante en migration** → Voir `references/migration-guide.md`
- **Plugin backend** → Ne pas utiliser ce skill

**SKILL COMPLÉMENTAIRE REQUIS : `vjsf`** (dépôt `data-fair/lib`, `skills/vjsf/`) dès qu'on touche au schéma de configuration — vocabulaire `layout`, `getItems`, conditionnels, `discriminator`, i18n `x-i18n-*`, migration vjsf 2 → 3, et les patterns du parc (slider, sélecteur d'icônes MDI, onglets, arrays). Ce skill-ci ne couvre que ce qui est propre aux applications.

**Stack standard** (obligatoire pour les nouveaux projets) :
- Vue 3.5+, Composition API, `<script setup lang="ts">`
- Vuetify 4 avec `vite-plugin-vuetify`
- Vite 8
- TypeScript strict
- `@data-fair/lib-vuetify` **2.x** — c'est la ligne Vuetify 4 (`peerDependencies: { vuetify: "4" }`) ; la 1.x est la ligne Vuetify 3 et n'est pas compatible
- `@data-fair/lib-vue` **≥ 1.15** (peer de lib-vuetify 2.x) / `@data-fair/lib-utils`

> Tout ce que ce skill décrit du thème suppose ces versions : les cascade layers `vuetify-*` sont propres à Vuetify 4, le reset CSS de `global.scss` est arrivé en lib-vuetify 2.0.3, et la résolution des quatre thèmes (`default`, `dark`, `hc`, `hc-dark`) en lib-vue 1.14. Sur une reprise, vérifier ces versions avant d'appliquer les conseils de la section thème.
- Dev server : `df-dev-server` + Zellij layout `.zellij.kdl`

## Scripts obligatoires dans package.json

```json
{
  "dev": "zellij --layout .zellij.kdl",
  "dev-server": "APP_URL=http://localhost:3000/app/ df-dev-server",
  "dev-app": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "lint-fix": "eslint --fix .",
  "prepare": "husky || true",
  "type-check": "vue-tsc --noEmit",
  "build-types": "df-build-types && cp src/config/.type/resolved-schema.json public/config-schema.json",
  "test": "playwright test --max-failures=1",
  "test-unit": "playwright test --project unit",
  "test-e2e": "playwright test --project e2e",
  "quality": "npm run lint && npm run build-types && npm run type-check && npm run build && npm test && npm audit --omit=dev --audit-level=critical"
}
```

> Scripts de test **au tiret** (`test-e2e`), comme les services — pas la variante legacy `test:e2e` encore présente dans la plupart des apps.

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

    <style>@layer vuetify-core, vuetify-components, vuetify-overrides, vuetify-utilities, vuetify-final;</style>
    <link href="/simple-directory/api/sites/_theme.css" rel="stylesheet">

    <title>Charts</title><!-- nom du modèle : le proxy le remplace par le titre de l'application -->

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
    <div id="app" style="height:100vh"></div>
  </body>
</html>
```

Cinq points de ce squelette ne se devinent pas :

- **`<!DOCTYPE html>` obligatoire en première ligne** (critère RGAA 8.1). Il garantit le mode de rendu standard du navigateur (évite le mode Quirks) et doit figurer tout en haut avant tout commentaire ou balise.
- **Pas d'attribut `lang` sur `<html>`.** Le proxy filtre l'attribut déclaré puis le repose depuis la locale de la requête (`api/src/applications/proxy.ts`). Conserver le commentaire : sans lui, un agent qui régénère le fichier remettra `lang="fr"`, que tous les linters HTML réclament. **Limite connue** : le `lang` du document et la locale de l'interface sont résolus indépendamment et peuvent diverger — voir `references/accessibility-rgaa.md`. Rien à corriger côté application.
- **`<meta charset>` en premier**, dans les 1024 premiers octets — un bloc de commentaire placé avant suffit à le repousser et à casser la validation.
- **Un seul `<title>` et une seule `<meta name="description">`.** Les dupliquer avec un attribut `lang` pour porter l'i18n est invalide en HTML et produit deux erreurs W3C. L'i18n du catalogue passera par registry, qui porte `title` et `description` en objets `{ en, fr }`.
- **Le `<link>` vers `_theme.css` et la déclaration `@layer`.** `/simple-directory/api/sites/_theme.css` apporte ce que `vuetifySessionOptions` ne calcule pas : les variantes de couleurs **texte à contraste corrigé** (`.text-primary`, `.text-secondary`, ... en `!important`, distinctes des couleurs brutes du thème), les couleurs de `a.simple-link` selon le thème et le fond, les `@font-face` du site et une règle `@media print`. Le chemin est absolu et sans hash : les placeholders `{SITE_PATH}` / `{THEME_CSS_HASH}` qu'utilisent les services relèvent de `serve-spa`, et le proxy data-fair ne substitue que `%APPLICATION%` — sans hash le CSS est simplement revalidé toutes les 60 s au lieu d'être mis en cache immuable, les deux routes existent côté simple-directory. La déclaration `@layer` vient avant tout style parce que Vuetify 4 livre son CSS dans des couches en cascade (`vuetify-core`, `vuetify-components`, `vuetify-final`...) : avec `@layer`, la priorité est fixée par l'**ordre de première déclaration des noms**, pas par l'ordre des règles. Sans cette ligne, cet ordre dépend du chunk CSS qui se charge en premier — instable entre le dev et le build à cause du code splitting, donc une surcharge qui fonctionne en local peut cesser de fonctionner en production. La déclarer en tête épingle l'ordre et ouvre `vuetify-overrides` / `vuetify-utilities` comme emplacements pour vos propres styles. `_theme.css`, lui, est volontairement hors couche : du CSS non layered l'emporte sur tout CSS layered, quel que soit l'ordre.
- **`<div id="app">` avec `<v-main>` (ou `<main id="app">` sans Vuetify)** : Dans une application Vuetify standard, le composant `<v-main>` dans `App.vue` rend déjà nativement un élément `<main class="v-main">` dans le DOM. Si `index.html` utilisait `<main id="app">`, le DOM contiendrait deux balises `<main>` imbriquées, ce qui est invalide (violation `landmark-main-is-top-level` / `landmark-no-duplicate-main`). Si l'application utilise `<v-main>`, `index.html` doit donc avoir `<div id="app">`. Si l'application n'utilise pas Vuetify ou pas de `<v-main>`, alors `index.html` doit porter `<main id="app">` pour fournir le repère principal requis (RGAA 9.2, 12.6).

#### `<title>` et `meta name="title"` : deux choses différentes

`<title>` est le titre du document au sens HTML — mais dans une brique DataFair il ne sert **pas** de titre à l'utilisateur final, le proxy le réécrivant (cf. plus bas). `meta name="title"` est le libellé du modèle au catalogue DataFair.

Les deux alimentent `meta.title`, mais **`meta name="title"` écrase la valeur issue de l'élément** : `meta.title` est posé depuis `<title>` puis réécrit par la boucle sur les métas, `title` étant aussi une clé de `metasByName` (`base-applications/service.ts`). Une brique qui déclare les deux n'utilise donc pas son `<title>` comme métadonnée.

**Convention retenue** : on abandonne `meta name="title"`. `<title>` porte le nom anglais du modèle (`Charts`, `Dashboards`, `Treemap`).

Ce `<title>` n'a qu'un rôle : **libellé du modèle au catalogue DataFair**. Comme `lang`, il est réécrit par le proxy, qui le remplace par le titre de l'application servie (`api/src/applications/proxy.ts`) — et l'insère si la brique n'en déclare pas. Une visualisation « Graphiques divers » sert donc un document intitulé « Graphiques divers », et non plus `data-fair-charts` : c'est ce que lisent l'onglet du navigateur, l'historique, les favoris et les technologies d'assistance quand l'application est ouverte seule plutôt qu'embarquée dans un portail (WCAG 2.4.2 / RGAA 8.6).

Le catalogue n'est pas affecté par cette réécriture : les métadonnées de brique sont lues sur l'`index.html` récupéré **directement** à l'URL de la brique (`base-applications/service.ts`), jamais à travers le proxy. Rien à faire côté application : pas de `document.title` à écrire, et le `<title>` du dépôt reste le nom anglais du modèle.

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

DataFair capture les apps (miniature de galerie et de carte, bouton « Capturer » du back-office et des portails, aperçu d'un élément de page, print PDF) via le service `capture` : Chrome headless qui charge **l'application servie nue** (`{publicUrl}/app/{id}`, sans le portail autour) et photographie **le viewport** — ce qui dépasse est coupé, la capture n'est pas un rendu pleine page.

**Référence complète : `references/capture.md`** (routes et paramètres du service, timeouts, mode gif, cache de la miniature, injection d'état, simulation par le dev-server, checklist). À lire dès qu'on touche au timing de rendu, à l'animation ou à `index.html`.

> **Tester en local** : `@data-fair/dev-server` ≥ 2.4.0 reproduit la stratégie d'attente du service — les deux contextes (vignette par défaut / capture manuelle), le format png ou gif, `df:capture-delay`, `x-capture`, les budgets du mode gif — et signale tout en `[capture]` dans la console. Sur une version antérieure la simulation anime toujours et ignore `df:capture-delay` : **mettre à jour la dépendance** avant de conclure quoi que ce soit du comportement dev. Détail et différences résiduelles dans `references/capture.md` § 8.

**Stratégie d'attente du service** (`capture/api/utils/page.ts`) :
1. Si l'app appelle `window.triggerCapture(animationSupported?)` → capture immédiate. Seul chemin rapide.
2. Sinon, après network idle : attente de `triggerCapture` pendant `df:capture-delay` **secondes** (si la méta est présente), sinon +1 s de sécurité puis capture.
3. Timeout du service en dernier recours (`screenshotTimeout`, 20 s par défaut).

| Meta / mécanisme | Rôle |
|---|---|
| `window.triggerCapture(animationSupported?)` | Fonction exposée par puppeteer, installée **avant** le `goto` donc disponible dès le premier script : `!!window.triggerCapture` est un test « suis-je dans une capture ? » fiable. L'appeler dès que la visu est **réellement rendue**. Passer `true` si l'app supporte le mode animation (gif). **Résout vers un booléen** (`animate`) : `Promise<boolean>`, à `await`. |
| `window.animateCaptureFrame()` | À définir **avant** tout appel à `triggerCapture(true)` : en mode gif le service l'appelle aussitôt, et une fonction absente fait échouer toute la capture. Avance le rendu d'un pas de 1/15 s, retourne `true` à la fin. Borner le nombre d'images (budget : 1800 images **et** 40 s d'horloge murale). |
| `<meta name="df:capture-delay" content="2">` | Après network idle, attend `triggerCapture` jusqu'à N **secondes** avant de capturer quand même. Plafonné à `screenshotTimeout` : une valeur en millisecondes (`content="1500"` sur atelier-carto) équivaut à « attendre 20 s ». Valeurs saines : 1 à 5. |
| `<meta name="x-capture" content="trigger">` | **Déprécié** (rétro-compat) : attend `triggerCapture` après network idle, jusqu'au timeout. Remplacer par `df:capture-delay` + appel explicite. |
| `df:capture-width` / `df:capture-height` | Dimensions en pixels. **Trois niveaux de défauts, deux ratios** : le service retient 800×450 si l'appelant n'envoie rien (`capture/api/routers/capture.ts`), le dialogue du back-office préremplit `meta \|\| 800×450`, les portails envoient `meta \|\| 1280×720` (`portals/.../application-capture.vue`). La **miniature par défaut de data-fair est 1050×450 (ratio 21/9) codée en dur** (`api/src/misc/utils/capture.ts`) et **ignore ces métas**. À ne déclarer que si le rendu impose un format précis. |
| `?thumbnail=true` | Ajouté à l'URL cible **uniquement pour la miniature par défaut** (requête sans autre paramètre que `updatedAt`) — pas pour une capture manuelle, qui a pourtant `triggerCapture`. Signifie « vignette », pas « contexte de capture ». |
| `app_*` | Tout paramètre de requête préfixé `app_` est dépréfixé et reporté sur l'URL cible : **seul canal d'injection d'état**. Un état absent des paramètres d'URL n'est pas capturable — le tenir dans `reactiveSearchParams`, et déclarer `df:sync-state` pour que le dialogue du back-office propose de le choisir. |

**Que masquer dans une capture ?** Le critère n'est pas « c'est cliquable » mais **« est-ce que ça porte de l'information dans une image fixe ? »**. Masquer les commandes dont l'image ne peut rien faire et qui ne disent rien de l'état : boutons lecture/pause, curseur d'animation, boutons d'export, barres d'outils, infobulles, aides « cliquez pour… ». **Garder** ce qui documente l'état capturé : barre de filtres avec ses valeurs courantes, période sélectionnée, légende, titre, unité. `app-dashboards` n'a aucun rendu spécifique à la capture, et c'est le bon choix — ses filtres affichent les valeurs qui ont produit les graphiques. Le dépouillement plus poussé se justifie surtout sous `?thumbnail=true` (vignette de galerie de 1050×450), pas sur une capture manuelle qu'un utilisateur a demandée pour illustrer un état précis. Détail dans `references/capture.md` § 6 bis.

> **⚠️ Piège de timing** : si l'app annonce une attente explicite (`df:capture-delay` ou `x-capture: trigger`) mais n'appelle jamais `triggerCapture` (ex. appel conditionné à une ressource qui n'existe pas), chaque capture attend le **timeout complet** du service. Appeler `triggerCapture` de façon fiable — y compris sur résultat vide, erreur de données et configuration invalide.

> **⚠️ Piège de contenu — le plus fréquent** : la miniature par défaut est une **image fixe prise à l'état initial** de l'app. Une visu qui démarre vide (animation à t=0, carte pas encore centrée, formulaire pas encore rempli) produit une vignette vide, affichée partout dans le back-office et les portails avant même l'ouverture de l'app. Utiliser le booléen retourné par `triggerCapture` : `false` = image fixe, donc se placer sur l'état **final ou représentatif** ; `true` = gif, donc repartir du début. Le dev-server ≥ 2.4.0 sait simuler le chemin png (format `png` dans son dialogue de capture) ; les versions antérieures animaient toujours et ne montraient jamais ce cas.

> **⚠️ 450 px est la plus petite hauteur à laquelle l'app est rendue en production** (1050×450). C'est la contrainte de densité de référence : vérifier la lisibilité à cette taille, avec la configuration **la plus dense** que le schéma autorise, pas seulement avec les valeurs par défaut.

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
| `snippets/schema-xexports.ts` | Génération de types TypeScript (`x-exports`) |
| `snippets/schema-color.ts` | Couleurs (string hex + pattern thème/custom, piège `format: "hexcolor"`) |

> Les exemples de schéma génériques (onglets, discriminator, `getItems`, arrays, conditionnels, champs cachés, slider, sélecteur d'icônes) vivent dans le **skill `vjsf`** (`vjsf/references/patterns.md`).

> **⚠️ Attention : `createSession` est asynchrone, et `siteInfo` n'est pas optionnel**
> `createSession({ siteInfo: true })` fetch les infos du site (thème, couleurs, locale) via API. Il **doit être `await`** avant d'appeler `vuetifySessionOptions(session)`, qui lève `vuetifySessionOptions requires fetching site info in session util` si `session.site.value` est nul. Ne jamais appeler `createSession` de manière synchrone en dehors d'une fonction `async`.
> À noter : la lib marque `refreshSiteInfo` — ce que déclenche `siteInfo: true` — comme déprécié. La voie moderne, celle des services, est de laisser simple-directory injecter `window.__PUBLIC_SITE_INFO` en ajoutant `<script src="/simple-directory/api/sites/_public.js"></script>` dans `index.html` ; la session le lit alors sans fetch bloquant. Comme pour `_theme.css`, le chemin est absolu et sans hash.

> **⚠️ Attention : créer `createI18n` après la session, et ne jamais réassigner la locale**
> `useI18n()` commence par `getCurrentInstance()` et lève `MUST_BE_CALL_SETUP_TOP` sinon : il ne peut s'exécuter que dans un `setup()`. Dans un `<script setup>`, le code de premier niveau **est** le corps de `setup()`, évalué à l'instanciation du composant et non à l'import — les composants de `@data-fair/lib-vuetify` n'imposent donc aucune création au niveau module. La seule contrainte réelle est `app.use(i18n)` avant `.mount()`.
> **Pattern correct**, celui des services (`catalogs`, `processings`, `metrics`, `events`) :
> ```ts
> async function init () {
>   const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })
>   const i18n = createI18n({ legacy: false, locale: session.lang.value, fallbackLocale: 'en' })
>   const app = createApp(App)
>   app.use(i18n)
>   ...
> }
> ```
> - **`legacy: false`** — sans lui, vue-i18n 11 démarre en mode legacy : déprécié, retiré en v12, et un avertissement s'affiche dans la console de dev.
> - **`fallbackLocale: 'en'`** — le défaut de `fallbackLocale` est la valeur de `locale`, donc *aucun repli*. simple-directory sert six langues (`fr, en, es, pt, it, de`) alors que les blocs `<i18n>` de `lib-vuetify` n'ont que `fr` et `en` : sans repli, une session `de` affiche les clés brutes (`noResult` au lieu de « Aucun résultat »).
> - **Ne jamais écrire `i18n.global.locale.value = ...`** — en mode legacy `i18n.global.locale` est une string, et l'assignation lève `TypeError: Cannot create property 'value' on string`. C'est de toute façon inutile : un changement de langue ou de thème recharge le document (`session.ts`, `watch(() => state.lang, () => goTo(null))`).
> Voir `snippets/main.ts` pour le bootstrap complet.

## Structure de projet type

```
my-visu/
├── .nvmrc                       # Version Node majeure seule (ex: "24") — requis par .zellij.kdl
├── .zellij.kdl                  # Layout dev (vite + df-dev-server)
├── index.html                   # %APPLICATION% + meta tags df:*
├── vite.config.ts
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

## Fichiers de configuration racine

Ces fichiers ne se devinent pas et se recopient mal : reprendre celui d'une application maintenue au hasard fait hériter de ses divergences.

> **Statut de ce boilerplate** : c'est la **cible**, définie sur `bar-chart-race` en s'inspirant des services (`data-fair`, `catalogs`, `processings`) — pas l'état du parc. La plupart des apps existantes en divergent (pas de husky, `lint` avec `--fix`, un seul projet Playwright, tsconfig sans `tests/**`). Sur une **reprise**, migrer vers cette cible plutôt que d'imiter l'app voisine ; l'état réel du parc est noté point par point dans `references/root-files.md`.

Contenus intégraux à copier : **`references/root-files.md`** (package.json et peerDependencies, husky/commitlint, `.nvmrc`, `.zellij.kdl`, `eslint.config.js`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `.gitignore`). Les pièges à connaître même sans générer de fichier :

- **peerDependencies de `@data-fair/lib-vue` à déclarer explicitement** — `dayjs` est le piège courant : jamais importé directement, son absence ne se voit ni au `type-check` ni au build tant que npm l'a hissé depuis une dépendance transitive, puis casse ailleurs.
- **`build-types` avant `type-check` et `build`** sur un clone neuf : `src/config/.type/` est git-ignoré et réexporté par `src/config/index.ts` — ordonner la CI en conséquence.
- **`.nvmrc` obligatoire dès que `.zellij.kdl` existe** (version majeure seule, ex. `24`) : sans lui, chaque pane sort en `[ EXIT CODE: 127 ]` sans aucun message — l'oubli le plus facile en générant les fichiers racine d'un nouveau projet.
- **eslint : `neostandard({ ts: true })` + vue + vuetify + `@data-fair/lib-utils/eslint/recommended.js`**, avec le contournement du double enregistrement du plugin `vue` — obligatoire dès **ESLint 9.39+** (aujourd'hui seuls `bar-chart-race` et `data-fair/ui` y sont ; les autres services, en 9.35, n'en ont pas encore besoin) — config complète dans `references/root-files.md`.
- **`vueI18n({})` sans option `include`** dans `vite.config.ts` : un `include` hérité de l'ancien plugin fait parser des SFC entiers comme du JSON et le build échoue sur `SyntaxError: Unexpected token '<'` en pointant `ui-notif.vue`.
- **Police du site cassée en dev seulement** : le dev server de Vite réécrit les URLs root-relative d'`index.html` en `base + url` → le `<link>` vers `/simple-directory/api/sites/_theme.css` part en `/app/simple-directory/…`, servi en `200 text/html` (fallback SPA de Vite), rendu en serif par défaut. Corrigé dans `@data-fair/dev-server` ≥ 2.3.4 (redirection vers son proxy `/simple-directory`) : **mettre à jour la dépendance**, pas de correctif dans l'app.
- **Husky + commitlint comme les services** : `pre-commit` → `lint` (sans `--fix` — la plupart des apps legacy ont encore `lint: eslint . --fix`, à corriger en reprise), `commit-msg` → commitlint, `pre-push` → `quality` ; config dans un fichier `commitlint.config.ts`, comme tout l'écosystème. Ne pas rejouer les e2e en CI.
- **Tests Playwright dans `tests/`**, `.spec.ts` (jamais `.test.ts`), projets `unit`/`e2e` ; `webServer` conditionné au projet e2e ; injecter `window.APPLICATION` via `page.addInitScript` ; toute assertion négative exige son contrôle positif en regard.
- **Pas de `.editorconfig`** — aucun dépôt maison n'en a ; le supprimer sur une reprise, une fois `neostandard` en place.

## Schéma de configuration (VJSF)

DataFair utilise [VJSF](https://koumoul-dev.github.io/vuetify-jsonschema-form/) 3+ (la v4 partage le même vocabulaire) pour générer le formulaire de configuration à partir du fichier `public/config-schema.json`. Le fichier source est `src/config/schema.json` et il est traité par `df-build-types` pour générer à la fois les types TypeScript et le schéma résolu copié dans `public/`.

> **Note** : `df-build-types` est fourni par le package **`@data-fair/lib-types-builder`** (à installer en `devDependencies`).

### Libellés : majuscule initiale, casse de phrase

La règle complète (majuscule initiale, casse de phrase française, exceptions identifiants techniques et noms propres) est dans le **skill `vjsf`**. Point propre aux applications : elle porte sur **toute chaîne visible, où qu'elle vive** — pas seulement les schémas. Dans l'état actuel du parc, l'immense majorité des textes sont des chaînes françaises en dur dans les templates : elles sont concernées au premier chef. Ne pas attendre un passage à l'i18n pour appliquer la casse ; quand des blocs `<i18n>` existent, la majuscule est portée dans chaque langue.

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

### Vocabulaire, patterns et sélecteurs → skill `vjsf`

Tout le générique vit dans le skill `vjsf` et n'est pas dupliqué ici : organisation en onglets (`allOf` + `title`), discrimination de type (`discriminator` + `oneOf` + `const` + `oneOfLayout` — gros point de **performance** sur les grands `oneOf`), sélecteurs dynamiques `getItems` (`url` / `expr`, règle **`size=50`** sur les URLs data-fair dont le défaut est 12), affichage conditionnel (`layout.if` / `layout.switch`), champs cachés (`layout: "none"`), arrays avancés (`itemTitle` / `itemSubtitle` / `itemCopy` / `getDefaultData`), slider soigné (`label: ""` + `slots.before` + ticks), sélecteur d'icônes MDI (`icons-mdi-latest`, URL **absolue `https://koumoul.com/data-fair/api/v1/…` codée en dur — jamais relative**). Les exemples prêts à copier sont dans `vjsf/references/patterns.md`.

### Prérequis dataset déclarés par l'URL du sélecteur

Les paramètres du `getItems.url` (ou de `x-fromUrl`) de la propriété `datasets` ne servent pas qu'au formulaire : à l'enregistrement de la base application, DataFair résout `config-schema.json` et en **déduit les filtres de compatibilité** (`datasetsFilters`) — ex. `bbox=true` (jeux géo), `concepts=https://schema.org/box`. Ces filtres déterminent les jeux proposés à la configuration et les messages « Cette application nécessite… » du catalogue.

- Déclarer les prérequis dans l'URL du sélecteur racine `datasets` : `api/v1/datasets?status=finalized&bbox=true&...`.
- Les placeholders `${...}` (ex. `${context.datasetFilter}`) sont ignorés par l'extraction.
- La meta `vocabulary-require` des apps legacy n'est **plus lue** (aucune occurrence dans le code) : la supprimer lors des migrations et reporter l'exigence dans l'URL du sélecteur.

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

**2. Couleur thème OU custom** — quand l'utilisateur doit pouvoir choisir entre une couleur Vuetify (primary, secondary, ...) et une couleur libre.

> **Règle** : dès qu'un sélecteur propose `primary`, il propose **toujours aussi `secondary` et `accent`** — jamais `primary` seul. Les trois couleurs de thème forment le contrat minimal d'un portail.

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
            { "const": "secondary", "title": "Secondaire" },
            { "const": "accent", "title": "Accent" }
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
- **Thème dynamique** : `vuetifySessionOptions(session)` couvre **quatre** thèmes et non deux — `default`, `dark`, `hc`, `hc-dark` — résolus par `resolveTheme` depuis les réglages du site, le cookie `theme` de l'utilisateur, `prefers-color-scheme` **et** `prefers-contrast`. Le contraste renforcé fait partie du contrat, pas seulement le mode sombre.
  - Le câblage de la police du site tient en **deux points, tous les deux nécessaires** :
    1. dans `vite.config`, `Vuetify({ styles: { configFile: settingsPath } })` avec `import { settingsPath } from '@data-fair/lib-vuetify/vite.js'` — jamais un `src/styles/settings.scss` local, qui ne déclare pas les variables de police ;
    2. dans `main.ts`, `import '@data-fair/lib-vuetify/style/global.scss'` **à la place de** `'vuetify/styles'`, jamais les deux.

    Les deux fichiers de la lib posent `$body-font-family: var(--d-body-font-family)`, la variable que `_theme.css` définit (`:root { --d-body-font-family: … !important }`). Il faut `sass-embedded` en `devDependencies`.
  - Pour du **texte**, utiliser `text-primary` / `text-secondary` plutôt que `primary` / `secondary` : ce sont les variantes dont `_theme.css` garantit le contraste sur le fond du site.
  - Rien à coder pour le multi-site : le document est servi depuis l'origine du portail, donc `_theme.css` et les infos de site sont résolus sur cette origine. Une même configuration d'application rend aux couleurs de chaque portail qui l'embarque, vérifié en production.
  - **Piège de la police du site** : avec `'vuetify/styles'`, les `@font-face` du site sont chargées et `--d-body-font-family` est définie, mais rien ne les consomme — la visualisation rend en Roboto dans un portail en typo personnalisée, constaté en production. C'est le symptôme d'un `global.scss` manquant, pas d'un manque côté serveur.
  - **Deuxième panne de police, en dev seulement** : typo correcte en prod mais serif par défaut en dev = le dev server de Vite a réécrit le `<link>` `_theme.css` sous la `base` de l'app (404). Corrigé côté `@data-fair/dev-server` (≥ 2.3.4) — mettre à jour la dépendance, cf. `references/root-files.md` (constaté sur bar-chart-race).

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

Les points clés qui reviennent sur tout le parc :

| Point | Critères |
|---|---|
| `<!DOCTYPE html>` obligatoire en première ligne d'`index.html` | 8.1 |
| Landmark `<main>` unique (`<v-main>` dans `App.vue` + `<div id="app">`, ou `<main id="app">` sans Vuetify) — jamais de `<main>` imbriqués | 9.2, 12.6 |
| Nom accessible + tableau de données équivalent pour tout canvas ou svg porteur d'information | 1.1, 1.6, 4.8, 4.9 |
| Visualisation atteignable et opérable au clavier, infobulles masquables par Échap | 7.1, 7.3, 10.13, 12.11 |
| Texte du graphique agrandissable à 200 % — le texte rasterisé d'un canvas ne l'est pas | 10.4 |
| Séries distinguables autrement que par la couleur, ratios ≥ 3:1 — y compris dans les palettes par défaut du schéma de config | 3.1, 3.3 |

Un rendu **SVG** satisfait gratuitement le critère 10.4 et se rend accessible sur place, contrairement à un canvas. À prendre en compte au moment de choisir une bibliothèque de graphiques.

### Internationalisation

Aucune application du parc ne traduit ses propres textes : `createI18n` n'y sert qu'à faire fonctionner les composants de `@data-fair/lib-vuetify`. Pour rendre une visualisation réellement bilingue, reprendre le pattern des services plutôt que d'inventer un mécanisme.

**Un bloc `<i18n>` par composant**, pas de dossier `locales/` central :

```vue
<i18n lang="yaml">
fr:
  noResult: Aucun résultat
en:
  noResult: No result
</i18n>
```

puis `const { t } = useI18n()` dans le `<script setup>` (la portée locale est automatiquement déduite dès qu'un bloc `<i18n>` est présent).

- **Activer le plugin de compilation** dans `vite.config.ts` : `import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'`, puis `VueI18nPlugin()` dans `plugins`. Sans lui les blocs `<i18n>` ne sont pas compilés. Plusieurs applications l'ont déjà installé sans s'en servir — vérifier avant de l'ajouter.
- **Dates et durées** : `createLocaleDayjs(session.lang.value)` puis `useLocaleDayjs()`, cf. `snippets/locale-dayjs.ts`.
- **Ne pas porter l'i18n du catalogue dans `index.html`** (un seul `<title>`, une seule `<meta name="description">`) : elle passera par registry, qui porte `title` et `description` en objets `{ en, fr }`.
- **Casse des libellés** : la règle de majuscule initiale s'applique à toutes les chaînes visibles, traduites ou en dur — voir « Libellés : majuscule initiale, casse de phrase » dans la section VJSF.

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
    :src="`/data-fair/embed/dataset/${accessKey ? accessKey + '%3A' : ''}${datasetId}/table`"
    :adapter="dFrameAdapter"
  />
</template>

<script setup lang="ts">
import { useConfig } from '@/composables/config'

const { dFrameAdapter, accessKey } = useConfig()
</script>
```

L'adapter synchronise automatiquement les paramètres de recherche entre l'app parent et l'embed. L'accessKey propage les droits d'accès : ce n'est **pas** une prop de `d-frame` (le composant n'a pas d'attribut `access-key`) mais un préfixe de l'id de la ressource dans le chemin de l'URL (`{accessKey}%3A{id}`), interprété côté data-fair — même mécanique pour `/data-fair/app/{accessKey}%3A{appId}`.

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
- [ ] schéma conforme au skill `vjsf` : aucun `x-*` legacy, `size=50` et `{q}`/`qSearchParam` sur les `getItems` data-fair, `discriminator` sur les `oneOf` de variantes
- [ ] tous les libellés visibles commencent par une majuscule — `title`, `description`, options d'`enum` / `oneOf`, boutons, empty states, messages d'erreur, **y compris les chaînes en dur dans les templates**
- [ ] `public/thumbnail.png` est présent
- [ ] `index.html` : `<!DOCTYPE html>` obligatoire, pas de `lang` sur `<html>`, `charset` en premier, un seul `<title>` lisible, une seule `<meta name="description">`, `<div id="app">` (si `<v-main>`) ou `<main id="app">`, `<link>` vers `_theme.css` et déclaration `@layer`
- [ ] `application-name` = nom du dépôt = nom du paquet, en `[a-z0-9-]`
- [ ] aucune méta morte (`keywords`, `thumbnail`, `vocabulary-*`, `version`, `title`, `x-capture`, `{VERSION}`)
- [ ] accessibilité : checklist de `references/accessibility-rgaa.md` passée
- [ ] capture : checklist de `references/capture.md` passée — `triggerCapture` appelé sur tous les chemins terminaux, rendu adapté au contexte de capture, état parlant plutôt qu'initial, lisible à 1050×450
- [ ] `useFetch` utilisé partout (pas axios / ofetch direct)
- [ ] Réactivité query params OK
- [ ] Réactivité config draft OK (test mode draft dans DataFair)
- [ ] État utilisateur dans l'URL
- [ ] Thème dynamique OK : clair, sombre **et** contraste renforcé (`hc`, `hc-dark`)
- [ ] police du site câblée : `settingsPath` de `@data-fair/lib-vuetify/vite.js` en `configFile`, et `main.ts` qui importe `@data-fair/lib-vuetify/style/global.scss` et **pas** `vuetify/styles`
- [ ] `createI18n` créé après la session, avec `legacy: false` et `fallbackLocale: 'en'`, sans réassignation de `i18n.global.locale`
- [ ] Erreurs de config affichées (pas de crash)
- [ ] Layout responsive

## Migration

Voir `references/migration-guide.md` pour les détails.

Points clés :
- Vue 2 → Vue 3 : `data()` → `ref()`, mixins → composables
- Vuetify 2 → Vuetify 4 : `vite-plugin-vuetify`, nouveaux props (`variant="flat"`)
- Vue CLI → Vite : `vite.config.ts`, `VITE_*` env vars
- VJSF 2 → 3 : mots-clés `x-*` silencieusement ignorés — table de migration dans le skill `vjsf` (`references/migration-v2-to-v3.md`)
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
