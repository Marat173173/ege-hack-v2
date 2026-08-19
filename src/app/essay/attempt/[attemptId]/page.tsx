import type { Metadata } from "next";
import { EssayReviewScreen } from "@/components/essay/EssayReviewScreen";

export const metadata: Metadata = { title: "Разбор сочинения · ЕГЭ-ХАК" };

export default function EssayAttemptPage({
  params,
}: {
  params: { attemptId: string };
}) {
  return <EssayReviewScreen attemptId={params.attemptId} />;
}
