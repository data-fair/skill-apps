import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

// Créer l'adapter pour synchroniser les params entre l'app et les embeds
const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)

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
