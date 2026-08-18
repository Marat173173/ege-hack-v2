import type { Metadata } from "next";
import { ExamResult } from "@/components/exam/ExamResult";

export const metadata: Metadata = { title: "Результат пробника · ЕГЭ-ХАК" };

export default function ExamResultPage({ params }: { params: { attemptId: string } }) {
  return <ExamResult attemptId={params.attemptId} />;
}
