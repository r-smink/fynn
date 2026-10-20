import crypto from "crypto";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile, putFile } from "@/lib/storage";
import { syncSource, TEXT_EXT } from "@/lib/rag/ingest";

export const maxDuration = 300;

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const IMAGE_TYPES: Record<string, { contentType: string; matches: (bytes: Uint8Array) => boolean }> = {
  ".png": {
    contentType: "image/png",
    matches: (bytes) => bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a,
  },
  ".jpg": {
    contentType: "image/jpeg",
    matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  ".jpeg": {
    contentType: "image/jpeg",
    matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  ".webp": {
    contentType: "image/webp",
    matches: (bytes) => bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  },
  ".gif": {
    contentType: "image/gif",
    matches: (bytes) => bytes.length >= 6
      && (String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a"
        || String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a"),
  },
};

function isTextFilename(filename: string): boolean {
  const lower = path.basename(filename).toLowerCase();
  return TEXT_EXT.has(path.extname(lower)) || lower.endsWith(".env.example");
}

function safeFilename(filename: string): string {
  return (path.basename(filename).replace(/[^a-z0-9._-]/gi, "_").replace(/^\.+/, "").slice(0, 180) || "bestand");
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Geen toegang" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Ongeldig uploadformulier" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Selecteer een bestand om te uploaden" }, { status: 400 });

  const sourceIdValue = form.get("sourceId");
  const nameValue = form.get("name");
  const brandIdValue = form.get("brandId");
  const syncValue = form.get("sync");
  if (
    (sourceIdValue !== null && typeof sourceIdValue !== "string")
    || (nameValue !== null && typeof nameValue !== "string")
    || (brandIdValue !== null && typeof brandIdValue !== "string")
    || (syncValue !== null && syncValue !== "0" && syncValue !== "1")
  ) {
    return Response.json({ error: "Ongeldige uploadgegevens" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Een bestand mag maximaal 4 MB zijn" }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  const imageType = IMAGE_TYPES[extension];
  if (!imageType && !isTextFilename(file.name)) {
    return Response.json({
      error: "Bestandstype niet toegestaan. Upload een tekstbestand of PNG-, JPEG-, WebP- of GIF-afbeelding.",
    }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (imageType && !imageType.matches(bytes)) {
    return Response.json({ error: "De afbeeldingsinhoud komt niet overeen met het bestandstype" }, { status: 400 });
  }
  const contentType = imageType?.contentType ?? "text/plain; charset=utf-8";

  const sourceId = typeof sourceIdValue === "string" ? sourceIdValue : "";
  let source = sourceId
    ? await db.knowledgeSource.findUnique({ where: { id: sourceId } })
    : null;
  if (sourceId && (!source || source.type !== "upload")) {
    return Response.json({ error: "Bestanden kunnen alleen aan een uploadbron worden toegevoegd" }, { status: 400 });
  }

  const createdSource = !source;
  if (!source) {
    const requestedName = typeof nameValue === "string" ? nameValue.trim() : "";
    const brandId = typeof brandIdValue === "string" ? brandIdValue || null : null;
    source = await db.knowledgeSource.create({
      data: {
        name: requestedName || file.name,
        type: "upload",
        config: "{}",
        brandId,
      },
    });
  }

  const storageKey = `knowledge/${source.id}/${crypto.randomBytes(4).toString("hex")}-${safeFilename(file.name)}`;
  let asset;
  try {
    await putFile(storageKey, bytes, contentType);
    asset = await db.knowledgeAsset.create({
      data: {
        sourceId: source.id,
        filename: file.name,
        storageKey,
        contentType,
        size: file.size,
      },
      select: {
        id: true,
        sourceId: true,
        filename: true,
        contentType: true,
        size: true,
        caption: true,
        createdAt: true,
      },
    });
  } catch (err) {
    await deleteFile(storageKey).catch(() => {});
    if (createdSource) {
      await db.knowledgeSource.delete({ where: { id: source.id } }).catch(() => {});
    }
    console.error("knowledge upload failed", err);
    return Response.json({
      error: `Het bestand kon niet worden opgeslagen: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }

  const syncResult = syncValue === "0" ? undefined : await syncSource(source.id);
  const updatedSource = await db.knowledgeSource.findUnique({ where: { id: source.id } });
  return Response.json(
    { source: updatedSource ?? source, asset, ...(syncResult ?? {}) },
    { status: syncResult?.error ? 502 : createdSource ? 201 : 200 },
  );
}
