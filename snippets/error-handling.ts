import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { computed } from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
// Gestion d'erreurs API dans une visu DataFair
// ─────────────────────────────────────────────────────────────────────────────

// useFetch expose natively : data, loading, error (readonly FetchError | null)
const { data, loading, error } = useFetch(
  computed(() => datasetUrl.value + '/lines'),
  {
    query: computed(() => ({ size: 100, finalizedAt: finalizedAt.value })),
    notifError: false // on gère l'affichage manuellement (snackbar)
  }
)

// Booléen réactif pour la visibilité du snackbar
const showError = computed(() => !!error.value)

// Dans le template :
//
// <template>
//   <div>
//     <!-- État de chargement -->
//     <v-progress-linear v-if="loading" indeterminate />
//
//     <!-- Rendu des données -->
//     <MyChart v-else-if="data" :data="data" />
//
//     <!-- Aucune donnée (pas d'erreur, juste vide) -->
//     <v-empty-state
//       v-else
//       headline="Aucune donnée"
//       title="Le dataset est vide ou les filtres sont trop restrictifs."
//     />
//
//     <!-- Erreur API affichée dans un snackbar -->
//     <v-snackbar v-model="showError" color="red" :timeout="5000">
//       {{ error?.statusCode }} — {{ error?.message }}
//     </v-snackbar>
//   </div>
// </template>

// ─────────────────────────────────────────────────────────────────────────────
// Variante : erreur déclenchée manuellement (ex: action utilisateur)
// ─────────────────────────────────────────────────────────────────────────────

import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'

const { execute: exportCsv, loading: exporting, error: exportError } = useAsyncAction(
  async () => {
    await ofetch('/api/v1/datasets/123/lines', { method: 'POST', responseType: 'blob' })
  },
  {
    success: { msg: 'Export démarré', type: 'success' },
    error: 'Erreur lors de l\'export'
  }
)

// useAsyncAction gère lui-même la notification toast (snackbar global).
// error ici est une ref utilisable dans le template si on veut afficher un message détaillé.

// ─────────────────────────────────────────────────────────────────────────────
// Variante : notification globale via createUiNotif / useUiNotif
// ─────────────────────────────────────────────────────────────────────────────

import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'

// ⚠️ API correcte :
//   - notification  → shallowRef(null)
//   - sendUiNotif   → fonction d'envoi

const { notification, sendUiNotif } = useUiNotif()

// Envoyer une erreur manuellement :
sendUiNotif({ type: 'error', msg: 'Erreur de chargement' })

// Afficher dans un snackbar global (voir snippets/ui-notif.ts)
