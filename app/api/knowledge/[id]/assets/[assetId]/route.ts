import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { syncSource } from "@/lib/rag/ingest";

type Ctx = { params: Promise<{ id: string; assetId: string }> };

export const maxDuration = 300;

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
