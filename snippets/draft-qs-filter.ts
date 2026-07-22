import { watch } from 'vue'
import { filters2qs } from '@data-fair/lib-utils/filters'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

// ─────────────────────────────────────────────────────────────────────────────
// Synchroniser des filtres internes (staticFilters) vers DataFair en mode draft
// ─────────────────────────────────────────────────────────────────────────────

// Quand une app définit des filtres statiques internes (ex: filtres par défaut
// ou filtres calculés), il est utile de les refléter dans le formulaire de
// configuration DataFair pour que l'utilisateur puisse les voir/modifier.

// On calcule un `qsFilter` à partir des `staticFilters` et on le pousse vers
// le parent via postMessage en mode draft.
//
// ⚠️ `staticFilters` / `qsFilter` sont des conventions APPLICATIVES (noms de
// champs de config choisis par l'app) — pas un contrat DataFair. Seul le
// paramètre `qs` des requêtes datasets (syntaxe Lucene query_string) est
// contractuel côté API.

function notifyConfigChange (field: string, value: unknown) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'set-config', content: { field, value } }, '*')
  }
}

watch(() => config.value?.staticFilters, (staticFilters) => {
  // Uniquement en mode draft (l'utilisateur configure l'app)
  if (reactiveSearchParams.draft !== 'true') return
  if (!staticFilters?.length) return

  const qsFilter = filters2qs(staticFilters)

  // Éviter les boucles infinies : ne pas renvoyer si la valeur n'a pas changé
  if (!qsFilter && !config.value?.qsFilter) return
  if (qsFilter === config.value?.qsFilter) return

  notifyConfigChange('qsFilter', qsFilter)
}, { immediate: true, deep: true })

// ─────────────────────────────────────────────────────────────────────────────
// Variante : signaler une erreur de config au parent (DataFair)
// ─────────────────────────────────────────────────────────────────────────────
//
// Voir snippets/report-config-error.ts — endpoint POST {href}/error,
// réservé au mode draft (permission writeConfig requise, 403 sinon,
// échec à toujours catcher).
