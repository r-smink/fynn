import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFile } from "@/lib/storage";

type Ctx = { params: Promise<{ assetId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Log in om dit bestand te bekijken" }, { status: 401 });

  const { assetId } = await ctx.params;
  const asset = await db.knowledgeAsset.findUnique({ where: { id: assetId } });
  if (!asset) return Response.json({ error: "Bestand niet gevonden" }, { status: 404 });

  const bytes = await getFile(asset.storageKey);
  if (!bytes) return Response.json({ error: "Bestand ontbreekt in opslag" }, { status: 404 });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": asset.contentType.startsWith("image/")
        ? asset.contentType
        : "text/plain; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
