# Fichiers de configuration racine — contenus complets

Ces fichiers ne se devinent pas et se recopient mal : reprendre celui d'une application maintenue au hasard fait hériter de ses divergences. Les pièges principaux sont résumés dans le SKILL.md ; ce fichier porte les contenus intégraux à copier.

> **Statut** : ce boilerplate est la **cible**, définie sur `bar-chart-race` (le pilote) en s'inspirant des services `data-fair` / `catalogs` / `processings`. Ce n'est **pas** l'état du parc — l'écart réel est signalé section par section (« État du parc »). Sur un nouveau projet, appliquer la cible telle quelle ; sur une reprise, migrer vers la cible.

## package.json — dépendances

**Les peerDependencies de `@data-fair/lib-vue` doivent être déclarées explicitement.** La lib les déclare en `peerDependencies` et ne les installe donc pas :

```
@vueuse/core >=10 · dayjs 1 · ofetch 1 · reconnecting-websocket 4 · vue 3 · vue-router 4||5
```

`dayjs` est le piège courant : il n'est jamais importé directement (on passe par `createLocaleDayjs` / `useLocaleDayjs`), donc son absence ne se voit ni au `type-check` ni au build tant que npm l'a hissé depuis une dépendance transitive — puis casse ailleurs. Les applications de référence la déclarent toutes. Ne déclarer que les peers réellement utilisées (`reconnecting-websocket` et `vue-router` ne servent qu'aux apps qui font du WS ou du routage).

**Scripts** : cf. « Scripts obligatoires » du SKILL.md. Deux précisions :

- `"dev": "zellij --layout .zellij.kdl"` **suppose que `.zellij.kdl` existe** — sans lui le script échoue. 24 applications du parc l'ont ; c'est la convention, pas une option.
- `build-types` doit tourner **avant** `type-check` et `build` sur un clone neuf : `src/config/.type/` est git-ignoré et `src/config/index.ts` le réexporte. Ordonner la CI en conséquence (`build-types` → `lint` → `type-check` → `build`) — le `"build": "vite build"` nu ne le garantit pas seul.
- **Scripts de test au tiret comme les services** : `test` / `test-unit` / `test-e2e` (`playwright test --max-failures=1`, `--project unit` / `--project e2e`). La plupart des apps legacy utilisent encore la variante `test:e2e` / `test:unit` (deux-points) — adopter la forme tiret en reprise. Pas de variante `--ui` en script : le flag se passe à la volée (`npm run test-e2e -- --ui`).
- **État du parc** : `quality`, `lint-fix` et `lint` sans `--fix` n'existent que dans bar-chart-race. **Toutes les autres apps ont `"lint": "eslint . --fix"`** — un `lint` qui réécrit les fichiers, y compris dans un hook pre-commit : à scinder en `lint`/`lint-fix` dès qu'on touche au dépôt.

## Husky, commitlint et `npm run quality`

Comme les services (`data-fair`, `portals`, `catalogs`, `processings`) et les plugins, une application installe **husky + commitlint** et fait passer la qualité au push. Ne pas faire tourner les e2e en CI : le hook pre-push les a déjà lancés sur la machine du dev (cf. le commentaire `commits.yml` des services : *« husky already did it on the dev computer »*).

**État du parc** : seule bar-chart-race a un `.husky/` ; `infos-territoires` a `"prepare": "husky"` mais aucun dossier `.husky/`. Le setup husky d'une app en reprise est donc presque toujours à faire entièrement.

**devDependencies** — `husky ^9.1.7` est la seule version commune à tout l'écosystème ; pour commitlint, s'aligner sur bar-chart-race et les plugins :

```
husky ^9.1.7 · @commitlint/cli ^19.8 · @commitlint/config-conventional ^19.8
```

(Les services sont hétérogènes : `^20.5` chez catalogs/processings/portals — certains sans `@commitlint/cli` explicite, le `npx --no-install` du hook le résolvant en transitif. Ne pas les imiter là-dessus : déclarer les deux paquets.)

**Scripts** : `"prepare": "husky || true"` (le `|| true` évite qu'un `npm install` sans dépôt git — archive, CI — ne casse) et `"quality"` (cf. « Scripts obligatoires »). Le `lint` n'a **pas** de `--fix` : c'est `lint-fix` qui le porte, comme dans les services.

**Fichiers `.husky/`** (le répertoire `.husky/_` est auto-généré et git-ignoré par husky v9) :

```
.husky/pre-commit → npm run lint
.husky/commit-msg → npx --no-install commitlint --edit ""
.husky/pre-push   → npm run quality
```

(Chez les plugins processings, `pre-push` lance `npm run test` — ils n'ont pas de script `quality`.)

**Config commitlint : un fichier `commitlint.config.ts`**, comme les services et les plugins :

```ts
export default { extends: ['@commitlint/config-conventional'] }
```

C'est la convention de tout l'écosystème (et la seule forme qui accueille proprement des règles custom, cf. portals : `scope-enum`, `scope-empty`). Une clé `commitlint` dans `package.json` fonctionne aussi (cosmiconfig) mais n'est pas la convention — la migrer vers le fichier si on en croise une. Sans configuration du tout, commitlint refuse tous les messages (`Please add rules to your commitlint.config.js [empty-rules]`).

> **⚠️ Pourquoi `pre-commit` exécute `npm run lint` sans `--fix`** : un `--fix` dans le hook réécrirait les fichiers au moment du commit (modifications non stagées, surprises). D'où le couple `lint` (signale) / `lint-fix` (réécrit), identique aux services.

## .nvmrc

**Obligatoire dès que `.zellij.kdl` existe** : chaque pane lance `nvm use` (sans argument) avant la vraie commande. Sans `.nvmrc` à la racine, `nvm use` échoue avec `No .nvmrc file found` et sort en code 127 — le `&&` court-circuite, la vraie commande (`npm run dev-app` / `dev-server`) ne démarre jamais, et comme le pane redirige `nvm use` vers `/dev/null 2>&1`, l'erreur reste invisible : le pane affiche juste `[ EXIT CODE: 127 ]` sans message. C'est l'oubli le plus facile à faire en générant les fichiers racine d'un nouveau projet — le vérifier systématiquement.

**Version majeure seule** pour les applications :

```
24
```

**État du parc** : 18 apps sur 25 sont à `24` ; traînent encore un `18`, un `21`, un `22`, un `v14.17.1`, et 5 apps sans `.nvmrc`. Côté services, `catalogs` et `processings` sont à `24` mais `data-fair` (`24.9`) et `portals` (`24.11.1`) épinglent une mineure — pour une app, rester à la majeure seule.

## .zellij.kdl

Trois panes : un shell libre, `dev-app` (Vite) et `dev-server` (`df-dev-server`). Le `nvm use` de chaque pane aligne la version de Node — d'où la dépendance stricte au `.nvmrc` ci-dessus. 24 apps du parc ont ce fichier, 22 au motif exact (exceptions : `app-humidex` et `carto-explore` sans `nvm use`, `app-timelines` sur un vieux layout). Les services ont un layout plus riche (panes `ui`/`api`/`worker`/`deps` + bandeau URL) qui ne s'applique pas aux apps.

```kdl
layout {
    pane {
      split_direction "vertical"
      pane name="MonApp" borderless=true {
        command "bash"
        args "-ic" "nvm use > /dev/null 2>&1 && bash"
      }
    }
    pane {
      split_direction "vertical"
      pane name="app" {
        command "bash"
        args "-ic" "nvm use > /dev/null 2>&1 && npm run dev-app"
      }
      pane name="dev-server" {
        command "bash"
        args "-ic" "nvm use > /dev/null 2>&1 && npm run dev-server"
      }
    }
}
```

## eslint.config.js

Ne pas s'aligner sur les applications : 11 apps sur 25 sont encore en `.eslintrc` legacy, et plusieurs configs flat n'utilisent que `tseslint.configs.recommended` + `eslint-plugin-vue`, deux presets qui ne portent **aucune règle de formatage**. Un dépôt ainsi configuré n'impose ni indentation, ni quotes, ni point-virgule sur ses `.ts` — le style ne tient plus qu'aux réglages d'éditeur de chacun. La cible ci-dessous est celle de `bar-chart-race`, calquée sur `data-fair/ui`.

```js
import neostandard from 'neostandard'
import pluginVue from 'eslint-plugin-vue'
import pluginVuetify from 'eslint-plugin-vuetify'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

// le flat/base de eslint-plugin-vuetify enregistre déjà le plugin `vue`, et
// ESLint 9.39+ refuse qu'un plugin soit redéfini — retirer `plugins` de la config de vue.
const vueFlatRecommended = pluginVue.configs['flat/recommended'].map(({ plugins, ...rest }) => rest)

export default [
  ...dfLibRecommended,
  ...vueFlatRecommended,
  ...pluginVuetify.configs['flat/recommended'],
  ...neostandard({ ts: true, env: ['browser'] }),
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'no-undef': 'off' // typescript s'en charge
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: '@typescript-eslint/parser' } }
  },
  { ignores: ['dist/', 'node_modules/', 'src/config/.type/', 'tests/output/'] }
]
```

> **⚠️ Ordre et double enregistrement du plugin `vue`.** Le `flat/base` de `eslint-plugin-vuetify` enregistre lui-même le plugin `vue`, et **ESLint 9.39+ lève une erreur si un plugin est redéfini**. Empiler naïvement `pluginVue.configs['flat/recommended']` et `pluginVuetify.configs['flat/recommended']` casse donc `npm run lint`. Le contournement — retirer la clé `plugins` de la config de vue avec un `.map(({ plugins, ...rest }) => rest)` — vient de `data-fair/ui`, seul service déjà en ESLint 9.39+ ; `catalogs`/`processings` (ESLint 9.35, presets `flat/base`) n'en ont pas encore besoin mais y passeront en montant de version. Et `neostandard` vient **après** vue et vuetify, pas avant.

- `neostandard({ ts: true, env: ['browser'] })` apporte le **style** et les globals navigateur (`neostandard` en devDependencies).
- `eslint-plugin-vuetify` détecte les composants et props Vuetify dépréciés — précieux sur une migration depuis Vuetify 2. Les cinq services le configurent (dans leur `ui/`), en `^2.7.2`.
- `@data-fair/lib-utils/eslint/recommended.js` est livré avec `lib-utils`, déjà installé : il bloque les imports de modules dépréciés (`@koumoul/sd-vue`, `http-errors`, `rfdc`…). Il ne fait que ça — il ne remplace pas `neostandard`.
- `src/config/.type/` doit être ignoré : c'est du généré.

> **Piège** : `"lint-fix"` (`eslint --fix .`) **réécrit** les fichiers qu'il atteint. Sur une migration, tout répertoire legacy encore présent sera reformaté au premier `npm run lint-fix`. L'ajouter aux `ignores` tant qu'il n'est pas supprimé — `lint`, lui, se contente de signaler.

## Pas de `.editorconfig`

Aucun dépôt maison n'en a. Sur une reprise, le supprimer — mais seulement après avoir vérifié qu'ESLint porte bien les règles de style (`neostandard`), sinon le dépôt se retrouve sans aucune convention.

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

> **Pas de `baseUrl`** : `baseUrl` est déprécié depuis TypeScript 5/6 et sera retiré dans TS 7.0. `paths` résout automatiquement par rapport au dossier du `tsconfig.json` dès lors que les chemins cibles commencent explicitement par `./` (`"./src/*"` et non `"src/*"`).

`include` doit couvrir `tests/**` : sans lui les fichiers de test échappent au `type-check`, et l'alias `@/` n'y résout pas. **C'est l'écart le plus répandu du parc** — la quasi-totalité des apps n'incluent que `src/**` et leurs tests ne sont pas type-checkés ; à corriger dès qu'on touche au dépôt. L'alias `@/*` est constant côté apps (les services utilisent `~/*` ou `#api/*` — ne pas transposer).

## vite.config.ts

Extension : `vite.config.ts` pour les nouveaux projets (cohérent avec le TypeScript strict du reste du dépôt). Une bonne partie du parc a encore un `.mjs` ou `.js` — Vite accepte les trois, ne pas renommer sur une simple maintenance.

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import { settingsPath } from '@data-fair/lib-vuetify/vite.js'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: process.env.PUBLIC_URL ?? '/app/',
  plugins: [
    vue({ template: { transformAssetUrls } }),
    vueI18n({}),
    vuetify({ autoImport: true, styles: { configFile: settingsPath } })
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: Number(process.env.PORT ?? 3000),
    strictPort: !!process.env.PORT,
    hmr: { port: Number(process.env.PORT ?? 3000), protocol: 'ws' }
  }
})
```

> **⚠️ Police du site en dev — bug traité côté df-dev-server, pas dans l'app.** Le dev server de Vite réécrit les URLs root-relative d'`index.html` en `base + url` : `/simple-directory/api/sites/_theme.css` devient `/app/simple-directory/…`, que Vite sert en **`200 text/html`** (fallback SPA — encore plus silencieux qu'un 404) → `--d-body-font-family` garde son placeholder et l'app rend dans la serif par défaut du navigateur, **en dev seulement** (le build de prod ne réécrit rien). `@data-fair/dev-server` **≥ 2.3.4** redirige `<base>/simple-directory/*` vers son proxy `/simple-directory` (couvre `_theme.css` et `_public.js`). Symptôme « typo correcte en prod, serif en dev » → **mettre à jour `@data-fair/dev-server`**, ne pas ajouter de plugin Vite dans l'app.

> **⚠️ `vueI18n({})` — sans option `include`.** Certaines applications passent `include: '.../lib-vuetify/**/*.vue'`, hérité de l'ancien `@intlify/vite-plugin-vue-i18n`. Dans `@intlify/unplugin-vue-i18n`, `include` désigne les **fichiers ressources** i18n (JSON/YAML) : le plugin tente alors de parser un SFC entier comme du JSON et le build échoue sur `SyntaxError: Unexpected token '<'` en pointant `@data-fair/lib-vuetify/ui-notif.vue`. Les blocs `<i18n>` des SFC sont pris en charge sans aucune option. Symptôme trompeur : l'erreur n'apparaît qu'une fois un composant de `lib-vuetify` réellement importé — le build passe tant que `App.vue` est un squelette.

`base` vaut `/app/` par défaut, ce qu'attend `df-dev-server` ; la CI le surcharge par `PUBLIC_URL`.

## Tests — Playwright, dans `tests/`

Cible (le modèle de `bar-chart-race`, seul à l'appliquer intégralement) : dossier `tests/`, extension `.spec.ts` (jamais `.test.ts`), Playwright découpé en **projets** `unit`/`e2e`.

```ts
// playwright.config.ts
// webServer est global à la config : le conditionner pour ne pas lancer Vite
// sur un run purement unitaire (plutôt que de scinder en deux fichiers).
const isUnitOnly = process.argv.includes('--project') &&
  process.argv[process.argv.indexOf('--project') + 1] === 'unit'

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  outputDir: './tests/output',
  projects: [
    { name: 'unit', testDir: './tests/unit' },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: isUnitOnly
    ? undefined
    : { command: 'PUBLIC_URL= vite --port ' + port, port, reuseExistingServer: !process.env.CI }
})
```

```json
{ "test": "playwright test --max-failures=1", "test-unit": "playwright test --project unit", "test-e2e": "BCR_E2E_PORT=$((30000 + RANDOM % 10000)) playwright test --project e2e" }
```

Trois détails du modèle qui se perdent facilement :

- **`PUBLIC_URL=` vidé dans la commande du `webServer`** — protège d'un `PUBLIC_URL` exporté dans le shell du dev, qui casserait la `base` de Vite.
- **Port e2e randomisé** via une variable d'environnement (`BCR_E2E_PORT`, `TREEMAP_E2E_PORT`…) — permet des runs parallèles sans collision.
- **`tests/e2e/fixtures.ts`** centralise les mocks (`mockSite`, `buildApplication`, dataset de test, config de base) pour des e2e sans instance data-fair réelle.

**État du parc** : les autres apps déclarent un seul projet `chromium` avec `webServer` inconditionnel (seule `atelier-carto` isole l'unitaire, via un fichier `playwright.unit.config.ts` séparé) ; `app-charts` et `app-timelines` rangent leurs specs dans `tests-e2e/specs/` ; `carto-explore` colocalise encore ses tests unitaires `node --test` à côté des sources. Les services suivent une convention différente (projets discriminés par suffixe `*.unit.spec.ts` / `*.api.spec.ts` / `*.e2e.spec.ts`, pas de `webServer` — leur stack démarre en docker) : ne pas la transposer aux apps.

Pour les tests e2e, mocker `**/simple-directory/**` (session) et les endpoints de données, et injecter `window.APPLICATION` via `page.addInitScript` avec `writable: false` **avant** le script inline de `index.html` : en `vite` nu, `window.APPLICATION=%APPLICATION%` lève une `SyntaxError` (placeholder non substitué) que le parser ignore ensuite.

> **Un test e2e qui ne peut pas échouer ne prouve rien.** Un `toHaveCount(0)` sur un élément que la configuration de test ne produit jamais passe trivialement. Écrire le **contrôle positif** en regard (même configuration, ressource valide → l'élément est présent), ou vérifier par mutation que l'assertion échoue bien quand on casse le code visé.

## .gitignore

```
node_modules
dist
src/config/.type
tests/output
playwright-report
```

`src/config/.type/` est généré par `df-build-types` ; `public/config-schema.json`, lui, **est commité**.

## CI

Les applications sont sur **GitLab CI** (`.gitlab-ci.yml` — aucune app n'a de `.github/workflows`), avec un pipeline `npm install && npm run build-types && npm run lint && npm run type-check && npm run build` : pas de tests ni d'audit en CI, la qualité complète (dont les e2e) est portée par le hook `pre-push` — même philosophie que le `commits.yml` des services GitHub (*« husky already did it on the dev computer »*), mécanisme différent. Respecter l'ordre `build-types` → `lint` → `type-check` → `build` (cf. § package.json).
