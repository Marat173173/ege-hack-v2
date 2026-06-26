/**
 * @deprecated Совместимостный реэкспорт. Данные предметов переехали в реестр:
 *   - типы:        ./types
 *   - декларации:  ./registry
 *   - сборка:      ./build-subject
 *   - готовое API:  ./catalog  (SUBJECTS, CARDS, ALL_KEYS, LIVE_KEYS, accentForKey)
 *
 * Добавление предмета = добавить SubjectDef в ./registry. Этот файл оставлен,
 * чтобы старые импорты не падали; новый код импортирует из ./catalog или ./types.
 */
export * from "./types";
export { SUBJECTS, CARDS, ALL_KEYS, LIVE_KEYS, accentForKey, DEFS } from "./catalog";
