/**
 * Спецификация ЕГЭ 2026: сопоставление номера задания в варианте
 * с подтемами кодификатора, из которых оно тянется.
 *
 * ВНИМАНИЕ: русский теперь работает в режиме «Полный ЕГЭ»:
 *   - 26 задач 1-й части + сочинение
 *   - Единый таймер 210 минут (3ч 30мин)
 *   - Балл: 30 первичных за тесты + 25 за сочинение = 55 первичных → 100 тестовых
 *
 * Обществознание и математика — пока только 1-я часть (hasEssayPhase=false),
 * их 2-е части будут добавлены отдельными архивами по мере готовности.
 */

export interface ExamTaskSpec {
  taskNumber: number;
  primaryScore: number;
  subtopics: string[];
  description: string;
}

export interface ExamSpec {
  subjectKey: string;
  displayName: string;
  /** Общее время на весь экзамен в минутах (при hasEssayPhase — на тесты И сочинение вместе). */
  durationMinutes: number;
  /** Максимум первичных баллов только 1-й части (тестов). */
  maxPrimaryScorePart1: number;
  /** Максимум первичных баллов всего экзамена (тесты + сочинение/2-я часть). */
  maxPrimaryScoreTotal: number;
  /** Есть ли фаза сочинения после тестов (только у русского пока). */
  hasEssayPhase: boolean;
  /** Максимум баллов за сочинение (только если hasEssayPhase). */
  maxEssayScore?: number;
  tasks: ExamTaskSpec[];
}

// ═══════════════════════════════════════════════════════════════
// РУССКИЙ ЯЗЫК — ПОЛНЫЙ ЕГЭ (26 тестов + сочинение)
// ═══════════════════════════════════════════════════════════════

const RUSSIAN_SPEC: ExamSpec = {
  subjectKey: "russian",
  displayName: "Русский язык",
  durationMinutes: 210, // 3ч 30 мин — как настоящий ЕГЭ
  maxPrimaryScorePart1: 30,
  maxPrimaryScoreTotal: 55, // 30 тестов + 25 сочинение
  hasEssayPhase: true,
  maxEssayScore: 25,
  tasks: [
    { taskNumber: 1, primaryScore: 1, subtopics: ["1.1", "1.2"], description: "Стилистический анализ текста" },
    { taskNumber: 2, primaryScore: 1, subtopics: ["1.3", "1.4"], description: "Средства связи предложений" },
    { taskNumber: 3, primaryScore: 1, subtopics: ["1.5", "2.1"], description: "Лексическое значение слова" },
    { taskNumber: 4, primaryScore: 1, subtopics: ["3.3.4", "3.3.5"], description: "Орфоэпические нормы (ударения)" },
    { taskNumber: 5, primaryScore: 1, subtopics: ["3.3.1", "3.3.2", "3.3.3"], description: "Лексические нормы: пароним" },
    { taskNumber: 6, primaryScore: 1, subtopics: ["3.3.1", "3.3.6"], description: "Лексические ошибки" },
    { taskNumber: 7, primaryScore: 1, subtopics: ["3.5.1", "3.5.2", "3.5.3", "3.5.4", "3.5.5", "3.5.6"], description: "Морфологические нормы" },
    { taskNumber: 8, primaryScore: 3, subtopics: ["3.6.1", "3.6.2", "3.6.3", "3.6.4", "3.6.5", "3.6.6", "3.6.7"], description: "Синтаксические нормы" },
    { taskNumber: 9, primaryScore: 1, subtopics: ["3.7.2"], description: "Правописание корней" },
    { taskNumber: 10, primaryScore: 1, subtopics: ["3.7.3", "3.7.4"], description: "Правописание приставок" },
    { taskNumber: 11, primaryScore: 1, subtopics: ["3.7.5"], description: "Правописание суффиксов" },
    { taskNumber: 12, primaryScore: 1, subtopics: ["3.7.5", "3.7.6"], description: "Правописание личных окончаний глаголов" },
    { taskNumber: 13, primaryScore: 1, subtopics: ["3.7.8"], description: "Правописание НЕ с частями речи" },
    { taskNumber: 14, primaryScore: 1, subtopics: ["3.7.7"], description: "Слитное/раздельное написание" },
    { taskNumber: 15, primaryScore: 1, subtopics: ["3.7.6"], description: "Правописание Н и НН" },
    { taskNumber: 16, primaryScore: 2, subtopics: ["3.8.1", "3.8.2"], description: "Пунктуация в сложносочинённом" },
    { taskNumber: 17, primaryScore: 1, subtopics: ["3.8.3", "3.8.4"], description: "Обособленные определения и обстоятельства" },
    { taskNumber: 18, primaryScore: 1, subtopics: ["3.8.5"], description: "Вводные слова и обращения" },
    { taskNumber: 19, primaryScore: 1, subtopics: ["3.8.6"], description: "Пунктуация в СПП" },
    { taskNumber: 20, primaryScore: 1, subtopics: ["3.8.7", "3.8.8"], description: "Пунктуация в сложном предложении с разными видами связи" },
    { taskNumber: 21, primaryScore: 1, subtopics: ["3.8.9"], description: "Пунктуационный анализ" },
    { taskNumber: 22, primaryScore: 1, subtopics: ["1.1", "1.2"], description: "Смысловой анализ текста" },
    { taskNumber: 23, primaryScore: 1, subtopics: ["1.3", "1.4"], description: "Функционально-смысловые типы речи" },
    { taskNumber: 24, primaryScore: 1, subtopics: ["3.3.6", "2.2"], description: "Лексический анализ" },
    { taskNumber: 25, primaryScore: 1, subtopics: ["1.4", "1.5"], description: "Средства связи предложений" },
    { taskNumber: 26, primaryScore: 3, subtopics: ["2.1", "2.2", "2.3", "2.4"], description: "Средства выразительности" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// ОБЩЕСТВОЗНАНИЕ — 20 заданий 1-й части (2-я часть — в разработке)
// ═══════════════════════════════════════════════════════════════

const SOCIAL_SPEC: ExamSpec = {
  subjectKey: "social-multi",
  displayName: "Обществознание",
  durationMinutes: 90,
  maxPrimaryScorePart1: 28,
  maxPrimaryScoreTotal: 58,
  hasEssayPhase: false, // 2-я часть будет добавлена позже
  tasks: [
    { taskNumber: 1, primaryScore: 2, subtopics: ["social-1.1", "social-1.2", "social-1.3"], description: "Понятия философии, человек" },
    { taskNumber: 2, primaryScore: 2, subtopics: ["social-1.4", "social-1.5", "social-1.6"], description: "Общество как система" },
    { taskNumber: 3, primaryScore: 2, subtopics: ["social-1.7", "social-1.8", "social-1.9"], description: "Духовная культура" },
    { taskNumber: 4, primaryScore: 2, subtopics: ["social-1.10", "social-1.11", "social-1.12", "social-1.13", "social-1.14", "social-1.15"], description: "Наука, образование, религия, искусство" },
    { taskNumber: 5, primaryScore: 2, subtopics: ["social-2.1", "social-2.2", "social-2.3"], description: "Экономика как наука, факторы производства" },
    { taskNumber: 6, primaryScore: 2, subtopics: ["social-2.4", "social-2.5", "social-2.6"], description: "Рынок, спрос и предложение" },
    { taskNumber: 7, primaryScore: 2, subtopics: ["social-2.7", "social-2.8", "social-2.9"], description: "Финансы, банки, деньги" },
    { taskNumber: 8, primaryScore: 2, subtopics: ["social-2.10", "social-2.11", "social-2.12", "social-2.13", "social-2.14", "social-2.15", "social-2.16", "social-2.17", "social-2.18"], description: "Государство в экономике, налоги, труд, ВВП" },
    { taskNumber: 9, primaryScore: 2, subtopics: ["social-3.1", "social-3.2", "social-3.3"], description: "Социальная стратификация и мобильность" },
    { taskNumber: 10, primaryScore: 2, subtopics: ["social-3.4", "social-3.5", "social-3.6"], description: "Социальные группы, семья, молодёжь" },
    { taskNumber: 11, primaryScore: 2, subtopics: ["social-3.7", "social-3.8", "social-3.9", "social-3.10"], description: "Социальные конфликты, нормы, отклонения" },
    { taskNumber: 12, primaryScore: 2, subtopics: ["social-4.1", "social-4.2", "social-4.3"], description: "Политика, власть, политическая система" },
    { taskNumber: 13, primaryScore: 2, subtopics: ["social-4.4", "social-4.5", "social-4.6"], description: "Государство, формы правления" },
    { taskNumber: 14, primaryScore: 2, subtopics: ["social-4.7", "social-4.8", "social-4.9"], description: "Партии, выборы, гражданское общество" },
    { taskNumber: 15, primaryScore: 2, subtopics: ["social-4.10", "social-4.11", "social-4.12"], description: "СМИ, политический процесс, лидерство" },
    { taskNumber: 16, primaryScore: 1, subtopics: ["social-5.1", "social-5.2", "social-5.3", "social-5.4"], description: "Право в системе социальных норм" },
    { taskNumber: 17, primaryScore: 1, subtopics: ["social-5.5", "social-5.6", "social-5.7", "social-5.8"], description: "Конституция РФ, права человека" },
    { taskNumber: 18, primaryScore: 1, subtopics: ["social-5.9", "social-5.10", "social-5.11", "social-5.12"], description: "Гражданское право, семейное право" },
    { taskNumber: 19, primaryScore: 1, subtopics: ["social-5.13", "social-5.14", "social-5.15", "social-5.16"], description: "Трудовое право, административное право" },
    { taskNumber: 20, primaryScore: 1, subtopics: ["social-5.17", "social-5.18", "social-5.19", "social-5.20"], description: "Уголовное право, международное право" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// МАТЕМАТИКА ПРОФИЛЬ — 12 заданий 1-й части (2-я часть — в разработке)
// ═══════════════════════════════════════════════════════════════

const MATH_SPEC: ExamSpec = {
  subjectKey: "math-multi",
  displayName: "Математика (профиль)",
  durationMinutes: 100,
  maxPrimaryScorePart1: 12,
  maxPrimaryScoreTotal: 32,
  hasEssayPhase: false,
  tasks: [
    { taskNumber: 1, primaryScore: 1, subtopics: ["math-7.4"], description: "Планиметрия (треугольник)" },
    { taskNumber: 2, primaryScore: 1, subtopics: ["math-6.2"], description: "Теория вероятностей — простые события" },
    { taskNumber: 3, primaryScore: 1, subtopics: ["math-7.3"], description: "Стереометрия" },
    { taskNumber: 4, primaryScore: 1, subtopics: ["math-6.2"], description: "Теория вероятностей — сложные события" },
    { taskNumber: 5, primaryScore: 1, subtopics: ["math-2.1", "math-2.4"], description: "Простейшее уравнение" },
    { taskNumber: 6, primaryScore: 1, subtopics: ["math-7.1", "math-7.2"], description: "Планиметрия (окружность, углы)" },
    { taskNumber: 7, primaryScore: 1, subtopics: ["math-3.1", "math-3.2", "math-3.3"], description: "Исследование функции по графику" },
    { taskNumber: 8, primaryScore: 1, subtopics: ["math-1.4", "math-1.7"], description: "Прикладная задача, проценты" },
    { taskNumber: 9, primaryScore: 1, subtopics: ["math-1.7", "math-1.8"], description: "Текстовая задача" },
    { taskNumber: 10, primaryScore: 1, subtopics: ["math-4.1", "math-4.2"], description: "Наибольшее/наименьшее значение функции" },
    { taskNumber: 11, primaryScore: 1, subtopics: ["math-3.7", "math-3.8"], description: "Свойства функций и их графиков" },
    { taskNumber: 12, primaryScore: 1, subtopics: ["math-2.5", "math-2.9"], description: "Тригонометрическое уравнение" },
  ],
};

export const EXAM_SPECS: Record<string, ExamSpec> = {
  russian: RUSSIAN_SPEC,
  "social-multi": SOCIAL_SPEC,
  "math-multi": MATH_SPEC,
};

export function getExamSpec(subjectKey: string): ExamSpec | null {
  return EXAM_SPECS[subjectKey] ?? null;
}
