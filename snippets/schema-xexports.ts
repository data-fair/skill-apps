// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Génération de types TypeScript (x-exports)
// ─────────────────────────────────────────────────────────────────────────────

// Le schéma source (src/config/schema.json) peut générer automatiquement
// les types TypeScript utilisés dans le code de l'app.

export default {
  // Obligatoire pour activer la génération de types
  'x-exports': ['types', 'resolvedSchemaJson'],

  type: 'object',
  // ... le reste du schéma
  properties: {
    datasets: { /* ... */ },
    chart: { /* ... */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline de build
// ─────────────────────────────────────────────────────────────────────────────

// 1. Schéma source → édité à la main
//    src/config/schema.json

// 2. Génération des types (dans package.json)
//    "build-types": "df-build-types && ncp src/config/.type/resolved-schema.json public/config-schema.json"

// 3. Fichiers générés dans src/config/.type/
//    • index.d.ts        → types TypeScript (importés dans le code)
//    • index.js          → runtime types (si besoin)
//    • resolved-schema.json → schéma résolu (copié vers public/config-schema.json)

// 4. Utilisation dans le code
//    import type { _JlResolved } from '@/config/.type/index.js'
//    export type AnyConfig = _JlResolved

// ─────────────────────────────────────────────────────────────────────────────
// Bonnes pratiques
// ─────────────────────────────────────────────────────────────────────────────

// • Toujours inclure "resolvedSchemaJson" dans x-exports (génère le fichier
//   que DataFair va fetcher à runtime)
// • Ne jamais modifier manuellement les fichiers dans src/config/.type/
// • Relancer "npm run build-types" après chaque modification de schema.json
// • Comitter le schéma source ET le resolved-schema.json généré
