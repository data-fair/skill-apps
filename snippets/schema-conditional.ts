// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Affichage conditionnel (layout.if et layout.switch)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  type: 'object',
  properties: {
    // Afficher un champ uniquement si une condition est remplie
    subcategory: {
      type: 'string',
      title: 'Sous-catégorie',
      // Le champ n'apparaît que si `category` est renseigné
      layout: {
        if: 'parent.data.category'
      }
    },

    // Afficher un groupe de champs conditionnellement
    label: {
      type: 'object',
      properties: {
        text: { type: 'string', title: 'Texte' },
        color: { type: 'string', title: 'Couleur' }
      },
      // Le bloc entier n'apparaît que si showTitle est true
      layout: {
        if: 'parent.data.showTitle'
      }
    },

    // switch : afficher différents composants selon le contexte
    items: {
      type: 'object',
      layout: {
        switch: [
          {
            // Si on n'est pas en mode résumé ET qu'un dataset est choisi
            if: '!summary && data.dataset',
            comp: 'expansion-panels'
          },
          {
            // Si pas de dataset, on affiche seulement la première section
            if: '!summary && !data.dataset',
            comp: 'expansion-panels',
            children: ['$allOf-0']
          },
          {
            // Mode résumé : rien n'est affiché
            children: []
          }
        ]
      }
    }
  }
}

// Expressions dans `if` :
// • `parent.data.xxx`    → accès aux données du parent immédiat
// • `data.xxx`           → accès aux données du nœud courant
// • `!summary`           → variable spéciale VJSF (mode résumé/compact)
