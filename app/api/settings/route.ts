import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const defaultTheme = body?.defaultTheme;
  if (defaultTheme !== "light" && defaultTheme !== "dark" && defaultTheme !== "system") {
    return NextResponse.json({ error: "Ongeldig standaardthema" }, { status: 400 });
  }

  await db.setting.upsert({
    where: { key: "theme.default" },
    create: { key: "theme.default", value: defaultTheme },
    update: { value: defaultTheme },
  });

  return NextResponse.json({ success: true });
}
