# Accessibilité RGAA des applications DataFair

Les applications DataFair sont majoritairement embarquées dans des portails du secteur public, soumis au RGAA 4.1. Une application non conforme rend non conforme **toutes** les visualisations qui l'utilisent : une seule brique `app-charts` porte plusieurs dizaines de visualisations sur un portail donné.

Ce document liste les défauts constatés sur le parc et les corrections attendues. Les références de code pointent vers les dépôts `data-fair`, `capture` et `portals`.

## Le document embarqué est une page web à part entière

Une visualisation est servie par le proxy à `/data-fair/app/<id>` et affichée dans une iframe du portail. C'est un **document autonome** : il n'hérite ni de la langue, ni du `<main>`, ni des titres de la page porteuse. Tous les critères RGAA de niveau page s'y appliquent séparément.

Conséquence pratique : la page du portail peut être parfaitement structurée et l'iframe rester un trou noir. C'est le cas par défaut d'une visualisation qui rend dans un `<canvas>` : son arbre d'accessibilité est **vide**, un lecteur d'écran ne restitue rien.

## Structure du document — critères 9.2, 12.6

`<body><div id="app"></div></body>` place tout le contenu rendu hors de toute zone de regroupement. `axe-core` remonte `region` et `landmark-one-main`.

```html
<body><div  id="app" style="height:100vh"></div></body>   <!-- avant -->
<body><main id="app" style="height:100vh"></main></body>  <!-- après -->
```

Sans risque : le montage se fait sur un sélecteur d'identifiant (`app.mount('#app')`), indifférent à la balise. `<main>` a le même `display:block` que `<div>` en feuille de style UA — aucun changement visuel. Aucune imbrication possible avec le `<main>` du portail, l'iframe étant un document distinct.

## Langue — critères 8.3, 8.4

Ne pas déclarer `lang` sur `<html>`. Le proxy DataFair filtre l'attribut déclaré puis le repose depuis la locale de la requête (`data-fair/api/src/applications/proxy.ts`). Une valeur codée en dur est au mieux inopérante, au pire fausse.

Le validateur W3C émettra un avertissement « Consider adding a lang attribute » : c'est attendu, il porte sur la source et non sur le document servi.

## Titre du document — critères 8.5, 8.6

Le `<title>` statique est identique pour toutes les visualisations d'une même brique — un lecteur d'écran annonce donc le même titre sur des dizaines de pages différentes.

Le titre du document servi sera posé par le proxy depuis le titre de la visualisation, comme il le fait pour `lang`. Rien à faire côté application, aucun appel à `document.title` à ajouter.

## Validité du code source — critère 8.2

Un seul `<title>` dans `<head>` et une seule `<meta name="description">` par document. Les dupliquer avec un attribut `lang` pour porter l'i18n est invalide en HTML et produit deux erreurs de validation W3C :

- `A document must not include more than one meta element with its name attribute set to the value description`
- `Element title not allowed as child of element head in this context`

Sur une migration ou une reprise, supprimer les doublons. L'i18n du catalogue passera par registry, qui porte `title` et `description` en objets `{ en, fr }`.

`<meta charset>` doit rester dans les **1024 premiers octets** du document : un bloc de commentaire placé avant suffit à le repousser et à provoquer une erreur.

## Rendu graphique — le gros morceau

C'est ici que se concentre l'essentiel des non-conformités. La difficulté dépend entièrement de la technologie de rendu.

| Rendu | Ce qui est possible | Critères en jeu |
|---|---|---|
| **`<canvas>`** (chart.js, maplibre, pixi) | rien à corriger sur place, le DOM est vide → il faut **fournir un équivalent explicite** | 1.1, 1.6, 4.8, 4.9, 7.1, 7.2, 7.3, 10.4, 10.13, 12.11, 3.2 |
| **`<svg>`** (d3, apexcharts) | accessible **sur place** : `role`, `aria-label`, `<title>` par élément, éléments focusables | 1.1, 3.1, 7.3 |
| **HTML/DOM** | structurellement sain, reste les contrôles Vuetify | 10.7, 11.1, 3.2 |

Un rendu SVG satisfait gratuitement le critère 10.4, son texte suivant le zoom et les préférences utilisateur. C'est un argument de fond au moment de choisir une bibliothèque de graphiques.

### Alternative textuelle — critères 1.1, 1.6, 4.8, 4.9

Un `<canvas role="img">` sans `aria-label`, sans `aria-labelledby` et sans contenu de remplacement n'apparaît pas dans l'arbre d'accessibilité. Le contenu de remplacement d'un canvas — ce qu'on met entre `<canvas>` et `</canvas>` — est ce que restituent les technologies d'assistance : un `<p></p>` vide ne restitue rien.

Ce qu'il faut fournir :

1. un nom accessible reprenant le titre du graphique ;
2. un **tableau de données équivalent**, visible ou dépliable, sous la visualisation. Un lien vers le jeu de données brut ne constitue pas une description du graphique.

### Accès clavier — critères 7.1, 7.3, 10.13, 12.11

Un canvas sans `tabindex` ne reçoit jamais le focus : la tabulation traverse l'iframe sans s'y arrêter, et tout ce qui dépend du survol devient inatteignable — infobulles de valeurs, bascule des séries par clic sur la légende.

Attendu :

- graphique focusable (`tabindex="0"`) avec indicateur de focus visible ;
- parcours des points de données au clavier ;
- légende activable au clavier ;
- infobulles masquables par Échap, persistantes au survol, déclenchables au focus. Les infobulles dessinées dans le canvas ne satisfont aucune de ces trois conditions.

Cas des cartes : maplibre pose déjà `role="region"`, `aria-label="Map"` et `tabindex="0"` sur son canvas — elles sont donc partiellement accessibles d'origine. Deux correctifs restent : passer le libellé en français via l'option `locale` de maplibre, et fournir la liste des entités en alternative textuelle.

### Agrandissement du texte — critère 10.4

Le texte dessiné dans un canvas est rasterisé : titres, légende et libellés d'axes ne réagissent pas à un agrandissement du texte seul à 200 %. Vérification : appliquer `font-size:200%` sur `<html>` et comparer l'empreinte du canvas avant/après — si elle est identique, le critère est non conforme.

Correction : indexer la taille des polices du graphique sur la taille de police du document, ou produire un rendu SVG.

### Couleurs — critères 3.1, 3.2, 3.3

- **3.1** — une série distinguée uniquement par la couleur n'est pas conforme. Doubler le codage : trames, hachures, motifs de points, styles de trait différenciés, étiquettes de données.
- **3.3** — ratio de 3:1 minimum entre séries adjacentes et entre chaque série et le fond. Deux bleus proches d'une même charte descendent facilement à 1,2:1.
- **3.2** — le texte dessiné dans un canvas échappe à toute vérification automatique du DOM. Il doit être contrôlé visuellement, à 4,5:1 minimum sur le fond.

Les palettes proposées par défaut dans le schéma de configuration doivent respecter ces seuils : c'est le seul endroit où l'application peut protéger l'utilisateur qui configure sa visualisation.

## Contrôles d'interface — critères 10.7, 11.1

- **10.7** — la prise de focus doit être visible sur **tous** les composants interactifs. Les composants Vuetify avec `outline-style:none`, sans ombre portée et dont le voile de survol reste à opacité 0 en état focus n'affichent aucun indicateur. Vérifier par captures d'écran comparées avec et sans focus, en parcourant réellement à la tabulation — lire le style calculé après un `.focus()` programmatique ne déclenche pas toujours `:focus-visible`.
- **11.1** — tout champ de saisie doit avoir une étiquette associée : `<label for>`, `aria-label` ou `aria-labelledby`. Un `placeholder` ne suffit pas.

## Structuration du contenu — critère 9.1

Pas de titre vide (`<h3></h3>` rendu par un composant dont le contenu est conditionnel), pas de saut de niveau. Un document embarqué qui affiche plusieurs blocs de contenu doit les structurer par une hiérarchie de titres.

## Constats relevés sur le parc

Défauts mesurés sur des applications en production, avec le raisonnement qui permet de les reconnaître ailleurs.

### `role="img"` sur un canvas interactif est contradictoire

`role="img"` transforme l'élément en **feuille** de l'arbre d'accessibilité : tout ce qu'il contient devient invisible pour les technologies d'assistance. C'est le bon rôle pour un graphique statique accompagné d'une alternative — c'est le mauvais rôle pour un graphique dont on attend qu'il expose des points de données navigables.

Constat type : `<canvas role="img">` sans nom accessible, contenant un `<p></p>` vide. Le rôle annonce une image, il n'y a pas d'alternative, et le contenu de remplacement est vide. Trois défauts d'un coup.

Choisir : soit `role="img"` + `aria-label` + alternative textuelle complète hors du canvas, soit un composant réellement navigable, et alors pas de `role="img"`.

### Un tableau de bord, c'est N documents autonomes

Une application de type tableau de bord embarque ses propres sous-applications dans des iframes. Chaque sous-document est une page web à part entière : il lui faut sa langue, sa zone de regroupement, sa structuration de titres. Corriger la coque ne corrige rien à l'intérieur.

Défauts constatés sur ce profil :

- coque déclarant `lang="en"` pour du contenu français, et sous-documents sans attribut `lang` du tout ;
- titres vides `<h3></h3>` rendus par un composant dont le contenu est conditionnel ;
- sauts de niveau de titre entre les blocs.

À l'inverse, un bon point à généraliser : les iframes imbriquées portaient un `title` explicite et distinct — « Centrales prod hydro - Atelier cartographique », « Centrales prod hydro - Treemap ». C'est le critère **2.1 / 2.2**, et c'est une responsabilité de l'application dès qu'elle intègre des vues via `<d-frame>`. Le titre doit décrire la vue, pas la technologie.

### Icônes décoratives : ne pas cumuler les signaux

Constat récurrent sur les composants d'icônes : un SVG portant à la fois `role="img"` et `aria-hidden="true"`. Les deux se contredisent — `aria-hidden` l'emporte, donc le résultat est correct, mais l'intention est illisible et la moindre refonte peut inverser le comportement.

Plus gênant, le cas voisin : un SVG dans un `.v-btn__content` **sans aucun statut** — ni `aria-hidden="true"`, ni `role`/`aria-label`, ni `focusable="false"`. Ni décoratif, ni porteur d'information : indécidable.

Règle : une icône décorative porte `aria-hidden="true"` et `focusable="false"`, sans `role`. Une icône porteuse d'information porte `role="img"` et un `aria-label`, sans `aria-hidden`.

### Composants ARIA sur mesure : la structure requise fait partie du contrat

Défauts relevés sur une sous-application cartographique : champ de type combobox sans nom accessible (`aria-input-field-name`), composant ARIA dont la structure d'enfants requise est absente (`aria-required-children`), bouton sans nom accessible (`button-name`).

Un rôle ARIA impose un contrat complet : nom, état, valeur, et enfants requis. Poser `role="combobox"` sans les éléments attendus produit un composant moins accessible qu'un `<select>` natif. Préférer les composants natifs ou ceux de `@data-fair/lib-vuetify`, dont le contrat est déjà tenu.

### Cartes maplibre : partiellement accessibles d'origine

maplibre pose `role="region"`, `aria-label="Map"` et `tabindex="0"` sur son canvas. Deux conséquences :

- le canvas **est** atteignable au clavier, contrairement à un canvas de graphique — ne pas ajouter de `tabindex` en double ;
- le libellé est en anglais sur une application francophone. Le corriger via l'option `locale` de maplibre, pas en écrasant l'attribut après coup.

Reste à fournir : la liste des entités affichées, en alternative textuelle.

### Ce qui passe mais mérite un regard

- **Reflow 320 px (10.11)** : les graphiques se recalculent, il n'y a pas de défilement bidirectionnel — le critère est conforme. Mais à cette largeur les libellés d'axes deviennent très denses. Conforme n'est pas lisible : prévoir une réduction du nombre de graduations sous un seuil de largeur.
- **Espacement du texte (10.12)** : aucune perte de contenu, donc conforme. Mais le texte d'un canvas ignore purement et simplement les réglages d'espacement imposés par l'utilisateur — il n'en bénéficie pas. Un rendu SVG, si.

### Mesurer le contraste d'un canvas

Le canvas d'une application est same-origin : ses pixels sont lisibles. Pour objectiver un contraste que le DOM ne révèle pas, extraire les couleurs dominantes et calculer les ratios :

```js
const ctx = canvas.getContext('2d')
const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
// regrouper les couleurs opaques, trier par fréquence, puis calculer le ratio WCAG
// entre chaque teinte significative et le fond
```

À interpréter avec prudence : les gris très clairs sont la grille et les bordures, pas du texte. Les gris intermédiaires sont des candidats « texte » à confirmer visuellement à la pipette. Ne pas conclure à une non-conformité sur la seule analyse de pixels.

## Vérifier

`axe-core` est le moteur d'accessibilité de Lighthouse et porte des étiquettes RGAA natives (`RGAAv4`, `RGAA-1.1.1`…) exploitables directement.

Points d'attention pour un audit fiable :

- exécuter `axe-core` **dans l'iframe**, pas seulement sur la page porteuse — sinon la visualisation n'est jamais analysée (`frame-tested` en résultat incomplet) ;
- descendre dans les iframes imbriquées : un tableau de bord embarque ses propres sous-applications ;
- l'arbre d'accessibilité est le juge de paix. S'il est vide pour l'iframe de visualisation, aucun réglage de couleur ou de contraste ne compte.

Ce que `axe-core` ne voit pas et qui doit être testé à la main : tout ce qui est dessiné dans un canvas, la visibilité réelle du focus, le comportement des infobulles, et l'agrandissement du texte seul.

## Checklist

- [ ] pas d'attribut `lang` sur `<html>`
- [ ] `<meta charset>` en premier dans `<head>`
- [ ] un seul `<title>`, une seule `<meta name="description">`
- [ ] `<main id="app">` et non `<div id="app">`
- [ ] nom accessible sur chaque canvas ou svg porteur d'information
- [ ] tableau de données équivalent accessible depuis la visualisation
- [ ] visualisation atteignable et opérable au clavier, focus visible
- [ ] infobulles masquables par Échap et déclenchables au focus
- [ ] texte du graphique agrandissable à 200 %
- [ ] séries distinguables autrement que par la couleur, ratios ≥ 3:1
- [ ] palettes par défaut du schéma de config conformes
- [ ] champs de saisie étiquetés
- [ ] `axe-core` exécuté dans l'iframe : zéro violation
