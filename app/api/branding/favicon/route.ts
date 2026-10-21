import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFile } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

/** Serveert het geüploade favicon (Setting `app.favicon`), anders /icon.png. */
export async function GET(request: Request) {
  const setting = await db.setting.findUnique({ where: { key: "app.favicon" } }).catch(() => null);
  if (!setting) {
    return NextResponse.redirect(new URL("/icon.png", request.url), 307);
  }

  const data = await getFile(setting.value);
  if (!data) {
    return NextResponse.redirect(new URL("/icon.png", request.url), 307);
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
