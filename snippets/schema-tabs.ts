// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Organisation par onglets (allOf + title)
// ─────────────────────────────────────────────────────────────────────────────

// Chaque élément de `allOf` avec un `title` devient une section/onglet
// dans le formulaire de configuration DataFair.

export default {
  type: 'object',
  required: ['datasets'],
  allOf: [
    {
      title: 'Source de données',
      properties: {
        datasets: {
          // Voir snippets/schema-getitems.ts pour peupler ce sélecteur
        }
      }
    },
    {
      title: 'Paramètres du graphique',
      properties: {
        chart: {
          type: 'object',
          // Voir snippets/schema-discriminator.ts pour les sous-types
        }
      }
    }
  ],
  // Le layout "tabs" à la racine force l'affichage en onglets explicites
  layout: 'tabs'
}

// Note : `layout: "tabs"` à la racine est optionnel. Sans lui, les sections
// allOf s'affichent quand même sous forme d'étapes ou d'accordéons selon
// la configuration du portail DataFair.
