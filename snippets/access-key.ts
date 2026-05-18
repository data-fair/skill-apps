import { computed } from 'vue'
import type { Ref } from 'vue'

// Extraction de l'accessKey depuis window.APPLICATION.exposedUrl
// L'accessKey est présente quand l'app est accédée via un lien partagé

export function useAccessKey (): { accessKey: Ref<string | null> } {
  const last = window.APPLICATION?.exposedUrl?.split('/').pop()
  const toks = last?.split('%3A')
  const accessKey = computed<string | null>(() =>
    (toks?.length === 2) ? toks[0] : null
  )

  return { accessKey }
}

// Propagation aux embeds d-frame via la prop :access-key
//
// <d-frame
//   :src="`/embed/dataset/${datasetId}/table`"
//   :adapter="dFrameAdapter"
//   :access-key="accessKey"
// />
//
// L'accessKey n'a PAS besoin d'être propagée aux appels useFetch de l'app :
// - Les appels API sont authentifiés par le cookie de session
// - Le proxy DataFair vérifie l'accessKey au niveau de la requête entrante
// - Seuls les embeds d-frame (iframes séparées) ont besoin de l'accessKey
//   car ils n'héritent pas du cookie parent
