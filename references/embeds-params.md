# Paramètres des vues embed DataFair (pour les apps)

Référence des paramètres de query supportés par les vues embed les plus utilisées dans les apps DataFair.

## Tableau — `/embed/dataset/<id>/table`

Affiche les lignes d'un jeu de données sous forme de tableau, liste ou cartes.

| Paramètre | Description |
|-----------|-------------|
| `draft` | Mode brouillon (`true` / `false`) |
| `cols` | Colonnes affichées (séparées par virgule, ex: `nom,valeur,date`) |
| `display` | Mode d'affichage : `list`, `table` ou `cards` |
| `q` | Recherche textuelle fulltext pré-remplie |
| `sort` | Tri (`field:1` pour asc, `field:-1` pour desc) |
| `fixed` | Liste des colonnes fixes (non déplaçables) |
| `interaction` | Active les interactions (clic sur ligne, etc.) |
| `selectable` | Active la sélection de lignes |
| `_id_eq` | Filtre sur un ID spécifique |
| `*_eq` / `*_in` | Filtres dynamiques de contexte |

**Exemple** : `/embed/dataset/{id}/table?cols=nom,valeur&sort=valeur:-1&q=paris&departement_eq=75`

---

## Tableau éditable — `/embed/dataset/<id>/table-edit`

Tableau avec possibilité d'édition inline des cellules.

| Paramètre | Description |
|-----------|-------------|
| `cols` | Colonnes affichées (séparées par virgule) |
| `display` | Mode d'affichage |
| `q` | Recherche textuelle |
| `sort` | Tri |
| `interaction` | Interactions activées |
| `*_eq` / `*_in` | Filtres de contexte (restreignent les lignes éditables) |

**Exemple** : `/embed/dataset/{id}/table-edit?cols=nom,valeur&interaction=true`

---

## Carte — `/embed/dataset/<id>/map`

Carte géographique affichant les données géolocalisées du dataset.

| Paramètre | Description |
|-----------|-------------|
| `draft` | Mode brouillon |
| `q` | Recherche textuelle |
| `interaction` | Active les interactions (clic sur point, zoom, etc.) |
| `selectable` | Active la sélection de points |
| `cols` | Colonnes affichées dans le popup de clic |
| `_id_eq` | Filtre sur un ID spécifique |
| `*_eq` / `*_in` | Filtres dynamiques de contexte |

**Exemple** : `/embed/dataset/{id}/map?q=restaurant&interaction=true&selectable=true`

---

## Formulaire — `/embed/dataset/<id>/form`

Formulaire de saisie / édition d'une ligne du dataset.

| Paramètre | Description |
|-----------|-------------|
| `extension` | Extension de formulaire (si configurée dans DataFair) |
| `*_eq` | Filtres de contexte pour pré-remplir des champs |

**Exemple** : `/embed/dataset/{id}/form?departement_eq=75&type_eq=restaurant`

---

## Vignettes — `/embed/dataset/<id>/thumbnails`

Galerie de vignettes (images, documents, etc.) du dataset.

| Paramètre | Description |
|-----------|-------------|
| `draft` | Mode brouillon |
| `q` | Recherche textuelle |

---

## Téléchargement — `/embed/dataset/<id>/download`

Interface de téléchargement / export des données.

| Paramètre | Description |
|-----------|-------------|
| `select` | Champs à inclure dans l'export (séparés par virgule) |
| `header` | Nom du fichier exporté |
| `*_eq` / `*_in` | Filtres de contexte (restreignent les données exportables) |

---

## Configuration d'application — `/embed/application/<id>/config`

Formulaire de configuration d'une autre application DataFair (utilisé dans les dashboards ou apps composites).

| Paramètre | Description |
|-----------|-------------|
| `roDataset` | ID du dataset en lecture seule (pré-sélectionné) |

---

## Notes d'utilisation

- Les paramètres `*_eq` et `*_in` fonctionnent comme des **filtres de contexte** : ils restreignent les données affichées dans l'embed sans permettre à l'utilisateur de les modifier.
- Le paramètre `draft` permet de visualiser les données en mode brouillon (utile pendant la configuration de l'app parente).
- Le paramètre `q` permet de pré-remplir une recherche textuelle dans l'embed.
- L'**accessKey** doit être propagée aux embeds via l'attribut `:access-key` du composant `d-frame` pour maintenir les droits d'accès sur les données.
- Les filtres de contexte (`*_eq`, `*_in`) sont cumulatifs : plusieurs filtres peuvent être combinés pour restreindre les données.
