import crypto from "crypto";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { putFile } from "@/lib/storage";
import { syncSource } from "@/lib/rag/ingest";

export const maxDuration = 300;

/** Upload a text/markdown/html file → creates a file-source and syncs it. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const brandId = (form.get("brandId") as string) || null;
  const name = (form.get("name") as string) || file?.name;
  if (!file || !name) return Response.json({ error: "file is vereist" }, { status: 400 });

  const safe = `${crypto.randomBytes(4).toString("hex")}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
  const storageKey = `uploads/${safe}`;
  await putFile(storageKey, new Uint8Array(await file.arrayBuffer()), file.type || "text/plain");

  const source = await db.knowledgeSource.create({
    data: {
      name,
      type: "file",
      config: JSON.stringify({ storageKey, filename: file.name }),
      brandId,
    },
  });

  const result = await syncSource(source.id);
  return Response.json({ source, ...result }, { status: result.error ? 502 : 201 });
}
