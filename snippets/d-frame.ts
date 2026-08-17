// Synchronisation des params entre l'app et les embeds d-frame.
// Voir SKILL.md > "Intégration iframe / d-frame" pour le modèle mental parent/enfant
// et references/embeds-params.md pour les conventions d'émission par type d'embed.
//
// Deux mécanismes complémentaires, à utiliser ensemble :
//   - createDFrameAdapter (ci-dessous) : côté parent, l'app EMBARQUE des d-frames
//   - window.vIframeOptions : côté enfant, l'app est EMBARQUÉE dans un d-frame
//     (portail, dashboard, autre app). Voir snippets/main.ts pour le setup.

import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

// Côté parent : créer l'adapter pour synchroniser les params entre l'app
// et les embeds d-frame qu'elle embarque.
const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)

// Côté enfant : exposer reactiveSearchParams au shim v-iframe-compat injecté
// par DataFair. À mettre dans src/main.ts au niveau module, avant createApp().
// (voir snippets/main.ts)
// Pour que DataFair injecte ce shim, le index.html doit contenir :
//   <meta name="df:sync-state" content="true">
;(window as any).vIframeOptions = { reactiveParams: reactiveSearchParams }

// Côté enfant, redimensionnement (remplace iframe-resizer) : poser
// `data-iframe-height` sur la racine de l'app pour que le shim d-frame
// mesure sa hauteur et l'envoie au parent. Déclarer aussi
//   <meta name="df:overflow" content="true">   (si la visu peut grandir)
// dans index.html. Côté parent, le <d-frame> doit porter `resize="auto"` :
//   <d-frame :src="..." :adapter="dFrameAdapter" resize="auto" />
// Voir SKILL.md > "Intégration iframe / d-frame" > "Redimensionnement".

// Dans le composable config, exposer dFrameAdapter et accessKey
// Dans le composant, utiliser d-frame avec l'adapter et l'accessKey

// Exemple d'utilisation dans un composant Vue :
/*
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
*/

// Exemple avec plusieurs embeds :
/*
<template>
  <v-row>
    <v-col cols="6">
      <d-frame
        :src="`/embed/dataset/${mainDatasetId}/table`"
        :adapter="dFrameAdapter"
        :access-key="accessKey"
      />
    </v-col>
    <v-col cols="6">
      <d-frame
        :src="`/embed/dataset/${secondaryDatasetId}/map`"
        :adapter="dFrameAdapter"
        :access-key="accessKey"
      />
    </v-col>
  </v-row>
</template>
*/
