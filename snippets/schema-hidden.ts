// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Champs cachés (layout: "none")
// ─────────────────────────────────────────────────────────────────────────────

// Les champs avec `layout: "none"` existent dans la configuration mais ne sont
// pas affichés dans le formulaire. Utiles pour :
// • stocker des valeurs calculées (qsFilter, uuid, hash)
// • passer des données entre le formulaire et l'app
// • garder un état interne

export default {
  type: 'object',
  properties: {
    // Champ calculé automatiquement depuis les staticFilters
    qsFilter: {
      type: 'string',
      default: '',
      layout: 'none'
    },

    // UUID interne pour identifier un élément dans un array
    uuid: {
      type: 'string',
      layout: 'none'
    },

    // Hash MD5 pour détecter les changements (ex: data-fair-metrics)
    hash: {
      type: 'string',
      layout: 'none'
    },

    // Champ visible (pour comparaison)
    title: {
      type: 'string',
      title: 'Titre'
    }
  }
}

// Note : les champs cachés sont souvent manipulés via postMessage
// (set-config) par l'app elle-même, pas par l'utilisateur.
