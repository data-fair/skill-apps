# Endpoints API DataFair pour les applications

## Endpoints principaux

### 1. Données brutes — `GET /api/v1/datasets/{id}/lines`

Pour les visus affichant des lignes individuelles : tableaux, listes, cartes avec points, timelines, etc.

**Paramètres** :
- `size` : nombre de résultats (max 10000)
- `q` : recherche textuelle fulltext
- `sort` : tri (`field:-1` pour desc, `field:1` pour asc)
- `*_eq` / `*_in` : filtres sur les champs (ex: `departement_eq=75`)
- `select` : champs à retourner (séparés par virgule)
- `finalizedAt` : timestamp pour le cache

**Exemple** :
```ts
useFetch(
  computed(() => datasetUrl.value + '/lines'),
  {
    query: computed(() => ({
      size: 100,
      sort: 'date:-1',
      departement_eq: selectedDept.value,
      select: 'nom,valeur,date'
    }))
  }
)
```

---

### 2. Valeurs distinctes avec labels — `GET /api/v1/datasets/{id}/values_labels`

Pour obtenir les valeurs distinctes d'un champ avec leurs labels (traductions, énumérations, concepts). Utile pour les listes déroulantes de filtres, les axes des graphiques, les légendes.

**Paramètres** :
- `field` : champ cible (obligatoire)
- `size` : nombre maximum de valeurs (max 1000)
- `sort` : tri (`count:-1` ou `field:1`)
- `*_eq` / `*_in` : filtres préalables
- `missing` : label pour les valeurs nulles

**Réponse** :
```ts
interface ValuesLabelsResponse {
  total: number
  results: Array<{
    value: string        // valeur brute
    label: string        // label affichable (traduit si concept)
    count: number        // nombre d'occurrences
  }>
}
```

**Exemple** :
```ts
// Liste des régions pour un sélecteur de filtre
const { data } = useFetch(
  computed(() => datasetUrl.value + '/values_labels'),
  {
    query: {
      field: 'region',
      size: 100,
      sort: 'count:-1'
    }
  }
)
// data.value.results → [{ value: '75', label: 'Paris', count: 1250 }, ...]
```

---

### 3. Agrégation groupée — `GET /api/v1/datasets/{id}/values_agg`

Pour les graphiques avec regroupement : bar charts, pie charts, line charts, treemaps, etc.

**Paramètres** :
- `field` ou `groupBy` : champ de regroupement (obligatoire)
- `metric` : type d'agrégation (`sum`, `avg`, `min`, `max`, `count`)
- `metricField` : champ sur lequel calculer la métrique (si `metric` ≠ `count`)
- `size` : nombre de groupes (max 1000)
- `*_eq` / `*_in` : filtres préalables
- `sort` : tri des résultats (`metric:-1` ou `field:1`)
- `percents` : `true` pour inclure les pourcentages
- `missing` : label pour les valeurs nulles (ex: `Non renseigné`)

**Exemples par type de visu** :

```ts
// Bar chart : total des ventes par région (filtré par année)
useFetch(
  computed(() => datasetUrl.value + '/values_agg'),
  {
    query: computed(() => ({
      field: 'region',
      metric: 'sum',
      metricField: 'montant',
      annee_eq: selectedYear.value,
      size: 20,
      sort: 'metric:-1'
    }))
  }
)

// Pie chart : répartition par catégorie (count)
useFetch(
  computed(() => datasetUrl.value + '/values_agg'),
  {
    query: computed(() => ({
      field: 'categorie',
      metric: 'count',
      status_eq: 'actif',
      size: 10,
      percents: true,
      missing: 'Autre'
    }))
  }
)

// Line chart : évolution temporelle (groupBy date)
useFetch(
  computed(() => datasetUrl.value + '/values_agg'),
  {
    query: computed(() => ({
      field: 'date',
      groupBy: 'date',      // ou 'date.year', 'date.month'
      metric: 'sum',
      metricField: 'valeur',
      region_eq: selectedRegion.value,
      size: 100,
      sort: 'field:1'
    }))
  }
)
```

---

### 4. Métrique simple — `GET /api/v1/datasets/{id}/metric_agg`

Pour les KPIs, compteurs, scorecards, ou quand on a besoin d'une seule valeur agrégée.

**Paramètres** :
- `metric` : type (`sum`, `avg`, `min`, `max`, `count`)
- `field` : champ cible (obligatoire si `metric` ≠ `count`)
- `*_eq` / `*_in` : filtres

**Exemple** :
```ts
// KPI : moyenne des notes
const { data } = useFetch(
  computed(() => datasetUrl.value + '/metric_agg'),
  {
    query: { metric: 'avg', field: 'note' }
  }
)
// data.value contient : { value: 14.5 }
```

---

### 5. Agrégation géo — `GET /api/v1/datasets/{id}/geo_agg`

Pour les cartes (tuiles vectorielles ou géométries agrégées).

**Paramètres** :
- `simplify` : niveau de simplification des géométries
- `bbox` : bounding box (format `minX,minY,maxX,maxY`)
- `*_eq` / `*_in` : filtres
- `format` : `geojson` ou `pbf`

---

## Paramètres communs à tous les endpoints

| Paramètre | Description |
|-----------|-------------|
| `*_eq` | Filtre d'égalité sur un champ (ex: `departement_eq=75`) |
| `*_in` | Filtre IN sur un champ (ex: `type_in=A,B,C`) |
| `finalizedAt` | Timestamp de la version du dataset (pour le cache navigateur) |
| `draft` | `true` pour utiliser le brouillon du dataset (mode édition) |

**Suffixes de filtres disponibles** : `_eq`, `_ne`, `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_nin`, `_search`

## Construction des filtres

### Paramètres de requête `_eq` et `_in`

Privilégier les paramètres de requête explicites (`_eq`, `_in`) plutôt que le format `qs`.

```ts
// Égalité simple : champ _eq valeur
const query = {
  'departement_eq': '75',
  'status_eq': 'actif',
  'annee_eq': '2023'
}

// Liste de valeurs : champ _in valeur1,valeur2
const query = {
  'departement_in': '75,92,93',
  'statut_in': 'actif,publie'
}

// Supérieur / inférieur
const query = {
  'population_gt': '10000',
  'date_gte': '2023-01-01',
  'date_lt': '2024-01-01'
}
```

### Le paramètre `qs`

Le format `qs` est un raccourci pour construire des filtres complexes en une seule string. Il est utile pour des filtres dynamiques construits par l'utilisateur, mais moins lisible que `_eq`/`_in`.

```ts
// Équivalent en qs (à éviter quand possible)
const qs = 'departement:75,population:>10000,status:actif,publie'
```

### Recommandation

- **Toujours privilégier les suffixes de filtres** (`_eq`, `_in`, `_gt`, etc.) pour tous les cas simples
- **`qs` uniquement en dernier recours** : logiques de filtrage complexes impliquant des AND / OR imbriqués
- **Jamais mélanger les deux** sur le même champ

## Filtres de concepts

Fusionner les filtres statiques (`config.staticFilters`) avec les filtres dynamiques de concepts (`@data-fair/lib-vue/concept-filters.js`) avant d'appeler les endpoints.

```ts
import { getConceptFilters } from '@data-fair/lib-vue/concept-filters.js'

const conceptFilters = computed(() => getConceptFilters(dataset.value))
const allFilters = computed(() => ({
  ...config.staticFilters,
  ...conceptFilters.value
}))
```

## Réponse `values_agg`

```ts
interface ValuesAggResponse {
  total: number           // nombre total de groupes
  results: Array<{
    value: string         // valeur du champ groupBy
    metric: number        // valeur agrégée
    percents?: number     // pourcentage (si percents=true)
    count?: number        // nombre de lignes dans le groupe
  }>
}
```

## Réponse `lines`

```ts
interface LinesResponse {
  total: number           // nombre total de lignes
  results: Array<Record<string, any>>  // lignes du dataset
}
```
