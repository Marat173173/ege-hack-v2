import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

/** GET /api/user/profile — получить профиль текущего пользователя. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });

  return NextResponse.json(profile);
}

/** PATCH /api/user/profile — обновить поля профиля. */
export async function PATCH(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json();

  // разрешённые поля (чтобы нельзя было подменить userId)
  const allowed = [
    "name", "avatarEmoji", "avatarHue", "targetScore",
    "examDate", "viewMode", "viewChosen", "sound", "notify",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return NextResponse.json(profile);
}
