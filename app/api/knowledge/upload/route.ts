import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
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

  const dir = path.join(env.dataDir, "uploads");
  await fs.mkdir(dir, { recursive: true });
  const safe = `${crypto.randomBytes(4).toString("hex")}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
  const fp = path.join(dir, safe);
  await fs.writeFile(fp, Buffer.from(await file.arrayBuffer()));

  const source = await db.knowledgeSource.create({
    data: {
      name,
      type: "file",
      config: JSON.stringify({ localPath: fp }),
      brandId,
    },
  });

  const result = await syncSource(source.id);
  return Response.json({ source, ...result }, { status: result.error ? 502 : 201 });
}
