import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

// Dans main.ts, après la création de la session
useLocaleDayjs(session)

// Synchronise la locale dayjs avec celle de la session DataFair
// Les formats de date s'adaptent automatiquement (fr, en, etc.)
