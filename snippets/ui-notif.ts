import { createUiNotif, useUiNotif } from '@data-fair/lib-vue/ui-notif.js'

// ─────────────────────────────────────────────────────────────────────────────
// Plugin createUiNotif  (dans main.ts)
// ─────────────────────────────────────────────────────────────────────────────

// Ne pas oublier d'installer le plugin :
// app.use(createUiNotif())

// ─────────────────────────────────────────────────────────────────────────────
// useUiNotif  (dans composables ou composants)
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️ L'API expose :
//   - notification  → shallowRef(null)  (contient la notif active)
//   - sendUiNotif   → fonction d'envoi

// ❌ INCORRECT :
// const { notif } = useUiNotif()         // 'notif' n'existe pas
// const { sendNotif } = useUiNotif()     // 'sendNotif' n'existe pas

// ✅ CORRECT :
const { notification, sendUiNotif } = useUiNotif()

// Envoyer une notification :
sendUiNotif({ type: 'error', msg: 'Une erreur est survenue' })

// ─────────────────────────────────────────────────────────────────────────────
// Exemple de SnackBar.vue
// ─────────────────────────────────────────────────────────────────────────────

/*
<script setup lang="ts">
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'

const { notification, sendUiNotif } = useUiNotif()
</script>

<template>
  <v-snackbar
    v-model="notification"
    :timeout="10000"
    color="error"
  >
    <div>
      {{ notification?.msg }}
    </div>
    <template #actions>
      <v-btn
        icon
        variant="text"
        size="small"
        @click="sendUiNotif(null)"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>
*/

// ─────────────────────────────────────────────────────────────────────────────
// Envoi depuis un composable / fonction utilitaire
// ─────────────────────────────────────────────────────────────────────────────

function sendError (e: any) {
  const { sendUiNotif } = useUiNotif()
  sendUiNotif({ type: 'error', msg: e.status + ' - ' + e.data })
}

// Note : si useUiNotif() est appelé en dehors d'un composant Vue
// (ex: dans un module JS/TS exécuté au chargement), il faut s'assurer
// que le plugin createUiNotif() a déjà été installé.
