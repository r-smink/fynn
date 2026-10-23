import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { syncSource } from "@/lib/rag/ingest";
import { isEditPolicy } from "@/lib/images";

type Ctx = { params: Promise<{ id: string; assetId: string }> };

export const maxDuration = 300;

/** PATCH { editPolicy } — hoeveel de AI deze afbeelding mag aanpassen. */
export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Geen toegang" }, { status: 403 });

  const { id, assetId } = await ctx.params;
  const { editPolicy } = (await req.json()) as { editPolicy?: unknown };
  if (!isEditPolicy(editPolicy)) return Response.json({ error: "Ongeldig bewerkingsniveau" }, { status: 400 });
  const { count } = await db.knowledgeAsset.updateMany({ where: { id: assetId, sourceId: id }, data: { editPolicy } });
  if (!count) return Response.json({ error: "Bestand niet gevonden in deze bron" }, { status: 404 });
  return Response.json({ ok: true, editPolicy });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Geen toegang" }, { status: 403 });

  const { id, assetId } = await ctx.params;
  const asset = await db.knowledgeAsset.findFirst({ where: { id: assetId, sourceId: id } });
  if (!asset) return Response.json({ error: "Bestand niet gevonden in deze bron" }, { status: 404 });

  await deleteFile(asset.storageKey);
  await db.knowledgeAsset.delete({ where: { id: asset.id } });
  const remainingAssets = await db.knowledgeAsset.count({ where: { sourceId: id } });

  if (remainingAssets) {
    const result = await syncSource(id);
    return Response.json({
      ok: true,
      remainingAssets,
      chunks: result.chunks,
      syncError: result.error,
    });
  }

  await db.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { sourceId: id } });
    await tx.knowledgeSource.update({
      where: { id },
      data: { status: "ready", statusMsg: "", chunkCount: 0 },
    });
  });

  return Response.json({ ok: true, remainingAssets: 0, chunks: 0 });
}
