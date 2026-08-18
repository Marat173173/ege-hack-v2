import type { Metadata } from "next";
import { ExamRunner } from "@/components/exam/ExamRunner";

export const metadata: Metadata = { title: "Пробник ЕГЭ · ЕГЭ-ХАК" };

export default function ExamAttemptPage({ params }: { params: { attemptId: string } }) {
  return <ExamRunner attemptId={params.attemptId} />;
}
