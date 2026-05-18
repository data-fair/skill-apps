// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Sélecteur dynamique peuplé par API (layout.getItems avec url)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  type: 'object',
  properties: {
    // 1. Sélecteur de dataset (depuis l'API DataFair)
    datasets: {
      type: 'array',
      layout: {
        getItems: {
          url: 'api/v1/datasets?status=finalized&q={q}&select=id,title,schema&${context.datasetFilter}&sort=createdAt:-1&size=100',
          itemKey: 'data.href',
          itemTitle: 'data.title',
          itemsResults: 'data.results'
        }
      },
      items: {
        type: 'object',
        properties: {
          href: { type: 'string' },
          title: { type: 'string' },
          id: { type: 'string' },
          schema: { type: 'array' }
        }
      }
    },

    // 2. Sélecteur de champ depuis le dataset sélectionné
    // ${rootData.datasets[0].href} référence le premier dataset choisi
    field: {
      type: 'string',
      title: 'Colonne',
      layout: {
        getItems: {
          url: '${rootData.datasets[0].href}/schema?calculated=false',
          itemKey: 'data.key',
          itemTitle: 'data.label'
        }
      }
    },

    // 3. Sélecteur de champ depuis un parent dans un array
    // ${parent.parent.data.dataset.href} remonte dans la hiérarchie
    labelField: {
      type: 'string',
      title: 'Champ de libellé',
      layout: {
        getItems: {
          url: '${parent.parent.data.dataset.href}/schema?calculated=false',
          itemKey: 'data.key',
          itemTitle: 'data.label'
        }
      }
    },

    // 4. Sélecteur d'application (autre type de ressource DataFair)
    application: {
      type: 'object',
      layout: {
        getItems: {
          url: 'api/v1/applications?q={q}&owner=${context.owner.type}:${context.owner.id}&select=id,title,baseApp',
          itemKey: 'data.id',
          itemTitle: 'data.title',
          itemsResults: 'data.results'
        }
      },
      properties: {
        id: { type: 'string' },
        title: { type: 'string' }
      }
    }
  }
}

// Variables disponibles dans les expressions :
// • {q}                → texte de recherche saisi par l'utilisateur
// • ${rootData...}     → accès à n'importe quel champ de la config racine
// • ${parent...}       → remonte dans la hiérarchie du schéma
// • ${context...}      → variables du contexte DataFair (owner, datasetFilter, etc.)
// • data.key           → accès à une propriété de l'item retourné par l'API
