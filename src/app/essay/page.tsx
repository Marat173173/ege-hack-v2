import type { Metadata } from "next";
import { EssayTextPicker } from "@/components/essay/EssayTextPicker";

export const metadata: Metadata = {
  title: "Сочинение · ЕГЭ-ХАК",
  description: "Тренажёр сочинения ЕГЭ по русскому — 12 исходных текстов и разбор по К1–К12.",
};

/** Server-обёртка для клиентского компонента. */
export default function EssayIndexPage() {
  return <EssayTextPicker />;
}
