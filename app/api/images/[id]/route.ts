import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";
import { findVisibleFolder, findVisibleImage } from "@/lib/image-library";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { folderId: string | null } — afbeelding naar een andere map verplaatsen. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const image = await findVisibleImage(user, id);
  if (!image) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const { folderId } = (await req.json()) as { folderId?: string | null };
  const folder = folderId ? await findVisibleFolder(user, folderId) : null;
  if (folderId && !folder) return Response.json({ error: "Map niet gevonden" }, { status: 404 });

  const updated = await db.imageGeneration.update({
    where: { id },
    // Een beeld in een brand-map hoort bij die brand; terug naar de root houdt de huidige brand
    data: { folderId: folder?.id ?? null, ...(folder ? { brandId: folder.brandId } : {}) },
  });
  return Response.json({ image: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const image = await findVisibleImage(user, id);
  if (!image) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  await db.imageGeneration.delete({ where: { id } });
  await deleteFile(`images/${image.url.split("/").pop()}`).catch(() => {});
  return Response.json({ ok: true });
}
