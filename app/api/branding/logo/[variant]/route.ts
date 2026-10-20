import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { defaultLogo } from "@/lib/branding";
import { getFile } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  if (variant !== "light" && variant !== "dark") {
    return NextResponse.json({ error: "Ongeldige logovariant" }, { status: 400 });
  }

  const setting = await db.setting.findUnique({ where: { key: `logo.${variant}` } }).catch(() => null);
  if (!setting) {
    return NextResponse.redirect(new URL(defaultLogo(variant), request.url), 307);
  }

  const data = await getFile(setting.value);
  if (!data) {
    return NextResponse.redirect(new URL(defaultLogo(variant), request.url), 307);
  }

  const extension = setting.value.split(".").pop()?.toLowerCase() ?? "";
  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
