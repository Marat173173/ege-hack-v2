import type { Metadata } from "next";
import { TutorChat } from "@/components/tutor/TutorChat";

export const metadata: Metadata = {
  title: "ИИ-репетитор · ЕГЭ-ХАК",
  description: "Задавай вопросы по русскому языку — репетитор объясняет правила и разбирает задания ЕГЭ.",
};

export default function TutorPage() {
  return <TutorChat />;
}
