import type { Metadata } from "next";
import { ExamSubjectPicker } from "@/components/exam/ExamSubjectPicker";

export const metadata: Metadata = {
  title: "Симулятор ЕГЭ · ЕГЭ-ХАК",
  description: "Пройди пробник по кодификатору ФИПИ 2026 — балл первой части и прогноз итогового.",
};

/**
 * Страница выбора предмета для пробника.
 * Client-компонент внутри — ему нужен доступ к сессии и переходам.
 */
export default function ExamPage() {
  return <ExamSubjectPicker />;
}
