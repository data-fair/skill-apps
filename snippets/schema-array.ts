// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Arrays avancés (itemTitle, itemCopy, getDefaultData, messages)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  type: 'object',
  properties: {
    layers: {
      type: 'array',
      title: 'Calques',
      layout: {
        // Expression JS pour le titre de chaque élément dans la liste
        // Permet de résumer l'état de l'élément (ex: "Dataset - Champ couleur")
        itemTitle: 'data.title || (!data.dataset && \'Source non définie\') || (data.dataset.title + (data.shapes?.field ? \' - \' + data.shapes.field : \'\'))',

        // Transformation appliquée quand l'utilisateur duplique un élément
        // Ici : on garde tout mais on régénère un UUID unique
        itemCopy: '{...item, uuid: crypto.randomUUID()}',

        // Messages localisés
        messages: {
          addItem: 'ajouter un calque'
        }
      },
      items: {
        type: 'object',
        layout: {
          // Affichage conditionnel selon le contexte (ici : expansion-panels)
          switch: [
            {
              if: '!summary',
              comp: 'expansion-panels'
            },
            {
              children: []
            }
          ],
          // Valeurs par défaut à la création d'un nouvel élément
          getDefaultData: '{ uuid: crypto.randomUUID() }'
        },
        properties: {
          uuid: { type: 'string', layout: 'none' },
          title: { type: 'string', title: 'Titre' }
        }
      }
    }
  }
}

// Résumé des propriétés de layout pour les arrays :
// • itemTitle      → expression JS affichée comme résumé de l'élément
// • itemCopy       → expression JS de transformation lors de la copie
// • getDefaultData → expression JS pour initialiser un nouvel élément
// • messages.addItem → label du bouton d'ajout
// • switch / comp  → composant d'affichage (expansion-panels, cards, etc.)
