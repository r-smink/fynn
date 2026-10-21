import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { putFile } from "@/lib/storage";

const IMAGE_TYPES: Record<string, { extension: string; signature: (bytes: Uint8Array) => boolean }> = {
  "image/png": {
    extension: "png",
    signature: (bytes) => bytes.length >= 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a,
  },
  "image/jpeg": {
    extension: "jpg",
    signature: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/webp": {
    extension: "webp",
    signature: (bytes) => bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  },
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const VARIANTS = ["light", "dark", "app-icon"] as const;
type Variant = (typeof VARIANTS)[number];

function validVariant(value: FormDataEntryValue | null): value is Variant {
  return VARIANTS.includes(value as Variant);
}

const settingKey = (variant: Variant) => (variant === "app-icon" ? "app.icon" : `logo.${variant}`);

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ongeldig formulier" }, { status: 400 });

  const file = form.get("file");
  const variant = form.get("variant");
  if (!(file instanceof File) || !validVariant(variant)) {
    return NextResponse.json({ error: "Bestand of logovariant ontbreekt" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Het logo mag maximaal 2 MB zijn" }, { status: 400 });
  }

  const imageType = IMAGE_TYPES[file.type];
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType || !imageType.signature(bytes)) {
    return NextResponse.json({ error: "Gebruik een PNG-, JPEG- of WebP-afbeelding" }, { status: 400 });
  }

  const key = `branding/logo-${variant}-${Date.now()}.${imageType.extension}`;
  try {
    await putFile(key, bytes, file.type);
  } catch (err) {
    return NextResponse.json({
      error: `Logo kon niet worden opgeslagen: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }
  const sk = settingKey(variant);
  await db.setting.upsert({
    where: { key: sk },
    create: { key: sk, value: key },
    update: { value: key },
  });

  return NextResponse.json({
    success: true,
    url: variant === "app-icon"
      ? `/api/branding/app-icon?v=${encodeURIComponent(key)}`
      : `/api/branding/logo/${variant}?v=${encodeURIComponent(key)}`,
  });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const variant = new URL(request.url).searchParams.get("variant");
  if (!validVariant(variant)) {
    return NextResponse.json({ error: "Ongeldige logovariant" }, { status: 400 });
  }

  await db.setting.deleteMany({ where: { key: settingKey(variant) } });
  return NextResponse.json({ success: true });
}
