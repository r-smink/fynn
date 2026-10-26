import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { putFile } from "@/lib/storage";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_BYTES = 10 * 1024 * 1024;

/** POST multipart { file } → losse afbeelding om in de beeldstudio te bewerken of als referentie te gebruiken. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "Geen bestand" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return Response.json({ error: "Alleen PNG, JPG of WebP" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Maximaal 10 MB per afbeelding" }, { status: 400 });

  const name = `upload-${crypto.randomBytes(12).toString("hex")}.${ext}`;
  await putFile(`images/${name}`, new Uint8Array(await file.arrayBuffer()), file.type);
  return Response.json({ name, url: `/api/files/images/${name}`, filename: file.name }, { status: 201 });
}
