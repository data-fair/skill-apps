// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Discrimination de type (discriminator + oneOf + const)
// ─────────────────────────────────────────────────────────────────────────────

// Pattern recommandé pour proposer des sous-formulaires conditionnels.
// L'utilisateur choisit un type dans une liste, et le formulaire adapte
// les champs affichés.

export default {
  type: 'object',
  required: ['type'],
  // Le discriminator indique quel champ détermine la branche
  discriminator: { propertyName: 'type' },
  default: { type: 'line' },
  oneOf: [
    {
      title: 'Courbe',
      additionalProperties: false,
      properties: {
        type: { const: 'line' },
        tension: { type: 'integer', title: 'Tension', minimum: 0, maximum: 10, default: 0 }
      }
    },
    {
      title: 'Barres',
      additionalProperties: false,
      properties: {
        type: { const: 'bar' },
        horizontal: { type: 'boolean', title: 'Horizontal' }
      }
    },
    {
      title: 'Camembert',
      additionalProperties: false,
      properties: {
        type: { const: 'pie' },
        cutout: { type: 'integer', title: 'Trou central (%)', minimum: 0, maximum: 100 }
      }
    }
  ],
  // Personnalise le label du sélecteur de variante (optionnel)
  oneOfLayout: {
    label: 'Type de visualisation'
  }
}

// Alternative sans discriminator (valide mais moins explicite) :
// oneOf avec const suffit. Le discriminator optimise le rendu dans VJSF v3.
