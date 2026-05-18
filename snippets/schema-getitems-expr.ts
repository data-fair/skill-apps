// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Sélecteur dynamique peuplé par expression (layout.getItems avec expr)
// ─────────────────────────────────────────────────────────────────────────────

// Quand les données sont déjà disponibles dans la config (pas besoin d'appel API)
// on utilise `expr` au lieu de `url`.

export default {
  type: 'object',
  properties: {
    // 1. Sélectionner un dataset parmi ceux déjà choisis en haut du formulaire
    dataset: {
      type: 'object',
      title: 'Jeu de données',
      layout: {
        getItems: {
          expr: 'rootData.datasets',
          itemKey: 'data.id',
          itemTitle: 'data.title'
        }
      },
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        href: { type: 'string' }
      }
    },

    // 2. Sélectionner une pièce jointe depuis le contexte DataFair
    attachment: {
      type: 'string',
      title: 'Image',
      layout: {
        getItems: {
          expr: 'context.attachments',
          itemKey: 'data.name',
          itemTitle: 'data.title'
        }
      }
    },

    // 3. Sélecteur avec icônes (affichage visuel des items)
    icon: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        svg: { type: 'string' }
      },
      layout: {
        getItems: {
          url: 'https://example.com/api/icons?q={q}',
          itemKey: 'data.name',
          itemTitle: 'data.name',
          itemIcon: 'data.svg',
          itemsResults: 'data.results'
        }
      }
    }
  }
}

// Différence clé :
// • `url`  → appel HTTP vers une API externe ou DataFair
// • `expr` → évaluation d'une expression JS sur les données existantes
//            (rootData, context, parent, etc.)
