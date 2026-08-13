# Мультипредметность — как подключить

Этот архив добавляет к текущему проекту 7 новых предметов ЕГЭ:
обществознание, история, математика (профиль/база), физика, литература, английский.

Русский язык остаётся как есть — legacy-совместимость через API.

---

## Что в архиве

**Новые файлы (просто скопировать):**
- `src/data/build-fipi-floors.ts` — универсальный билдер + 7 предустановленных функций
- `src/data/subjects-multi.ts` — 7 готовых `SubjectDef` для добавления в REGISTRY

**Заменяемые файлы (перезаписать):**
- `src/app/api/knowledge/floor/route.ts` — понимает 3 формата ID
- `src/app/api/tasks/floor/route.ts` — то же самое
- `scripts/generate-materials.ts` — с параметром `SUBJECT=xxx`
- `scripts/generate-tasks.ts` — с параметром `SUBJECT=xxx`
- `scripts/index-knowledge.ts` — с параметром `SUBJECT=xxx`

---

## Шаг 1. Подключить новые subject в REGISTRY

Открой `src/data/registry.ts` в редакторе. Найди строку вида:

```typescript
export const REGISTRY: SubjectDef[] = [
  { key: "russian", ... },
];
```

Наверху файла добавь импорт:

```typescript
import { SUBJECTS_MULTI } from "./subjects-multi";
```

Затем расширь массив REGISTRY:

```typescript
export const REGISTRY: SubjectDef[] = [
  { key: "russian", ... },  // существующий русский — не трогать
  ...SUBJECTS_MULTI,        // ← добавить эту строку
];
```

Все 7 новых предметов будут в статусе **"soon"** — на UI они появятся как «Скоро».
Пользователь их видит, но зайти не может. Это правильно, пока по ним нет контента.

## Шаг 2. Запушь и задеплой

```bash
git add .
git commit -m "feat: мультипредметность — 7 новых subject с 507 подтемами (soon)"
git pull --rebase origin main
git push
```

Дождись зелёного деплоя. UI покажет 8 карточек предметов вместо 1.

---

## Шаг 3. Пилотный запуск — обществознание

**Правильный порядок работы** — сначала обкатать один предмет, оценить качество, потом остальные.

Начинай с обществознания: оно чисто текстовое, без формул, Claude справляется отлично.

В Console карточки **ege-hack-v2** на Railway:

```bash
SUBJECT=social npm run rag:generate
```

Займёт ~15 минут, ~30 ₽ через Polza. Сгенерирует 75×4 = 300 материалов.

Потом:

```bash
SUBJECT=social npm run rag:index
```

~1 минуту (эмбеддинги считаются батчами). Материалы попадают в БД.

Потом задания:

```bash
SUBJECT=social npm run rag:tasks
```

~2 часа, ~40 ₽. 75×40 = 3000 заданий.

## Шаг 4. Проверить качество

Открой сайт. В `src/data/subjects-multi.ts` временно поменяй `status: "soon"` → `"live"` только для обществознания. Запушь.

Зайди на карточку «Обществознание» → любой этаж → «Детальный урок» → проверь материалы.
Открой «Тренировать» → пройди 5 заданий → оцени качество вопросов и разборов.

Если ок — переходишь к остальным предметам. Если плохо — пиши мне, разбираемся с промптами.

---

## Шаг 5. Остальные 6 предметов

По той же схеме, но с другим SUBJECT:

```bash
# История
SUBJECT=history npm run rag:generate
SUBJECT=history npm run rag:index
SUBJECT=history npm run rag:tasks

# Математика профиль
SUBJECT=math npm run rag:generate
SUBJECT=math npm run rag:index
SUBJECT=math npm run rag:tasks

# Математика база
SUBJECT=math-base npm run rag:generate
SUBJECT=math-base npm run rag:index
SUBJECT=math-base npm run rag:tasks

# Физика
SUBJECT=physics npm run rag:generate
SUBJECT=physics npm run rag:index
SUBJECT=physics npm run rag:tasks

# Литература
SUBJECT=literature npm run rag:generate
SUBJECT=literature npm run rag:index
SUBJECT=literature npm run rag:tasks

# Английский
SUBJECT=english npm run rag:generate
SUBJECT=english npm run rag:index
SUBJECT=english npm run rag:tasks
```

**Итого на 6 предметов: ~12 часов и ~250 ₽.**

По каждому — после генерации меняешь `status: "soon"` → `"live"` в subjects-multi.ts и пушишь.

---

## Что осталось после генерации

- ChatBot репетитора сейчас всегда ищет в базе `subject="russian"`. Нужно расширить `/api/tutor/ask` под мультипредметность (передавать subject с фронта). Небольшая правка на 20 строк.
- UI переключения предметов может потребовать доработки — коллега там сильно правил, надо смотреть по факту.

Пиши, когда обществознание будет готово — сделаем следующие шаги.
