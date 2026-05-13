import { createReactiveSearchParams, useStringSearchParam, useBooleanSearchParam, useNumberSearchParam } from '@data-fair/lib-vue/reactive-search-params.js'

// Dans main.ts
app.use(createReactiveSearchParams())

// Dans un composant
const searchQuery = useStringSearchParam('q')           // computed get/set
const isStacked = useBooleanSearchParam('stacked')      // true/false dans l'URL
const page = useNumberSearchParam('page')               // number ou null

// Utilisation
// Modifier la ref met à jour l'URL
// Changer l'URL (back/forward) met à jour la ref
