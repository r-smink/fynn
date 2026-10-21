import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);

  if (body?.defaultTheme !== undefined) {
    const defaultTheme = body.defaultTheme;
    if (defaultTheme !== "light" && defaultTheme !== "dark" && defaultTheme !== "system") {
      return NextResponse.json({ error: "Ongeldig standaardthema" }, { status: 400 });
    }
    await db.setting.upsert({
      where: { key: "theme.default" },
      create: { key: "theme.default", value: defaultTheme },
      update: { value: defaultTheme },
    });
  }

  if (body?.appName !== undefined) {
    const appName = String(body.appName).trim().slice(0, 40);
    if (!appName) return NextResponse.json({ error: "App-naam mag niet leeg zijn" }, { status: 400 });
    await db.setting.upsert({
      where: { key: "app.name" },
      create: { key: "app.name", value: appName },
      update: { value: appName },
    });
  }

  return NextResponse.json({ success: true });
}
