import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Получить ID текущего пользователя или null (для API-роутов). */
export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}
