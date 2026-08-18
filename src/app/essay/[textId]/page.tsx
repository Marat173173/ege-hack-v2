import type { Metadata } from "next";
import { EssayComposer } from "@/components/essay/EssayComposer";

export const metadata: Metadata = { title: "Сочинение · ЕГЭ-ХАК" };

export default function EssayComposePage({
  params,
}: {
  params: { textId: string };
}) {
  return <EssayComposer textId={params.textId} />;
}
