import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { findVisibleFolder } from "@/lib/image-library";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { name } — map hernoemen. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await findVisibleFolder(user, id))) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  const name = ((await req.json()) as { name?: string }).name?.trim().slice(0, 60);
  if (!name) return Response.json({ error: "Naam is vereist" }, { status: 400 });
  const folder = await db.imageFolder.update({ where: { id }, data: { name } });
  return Response.json({ folder });
}

/** Map verwijderen: afbeeldingen en submappen schuiven één niveau omhoog, er gaat niets verloren. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const folder = await findVisibleFolder(user, id);
  if (!folder) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  await db.$transaction([
    db.imageGeneration.updateMany({ where: { folderId: id }, data: { folderId: folder.parentId } }),
    db.imageFolder.updateMany({ where: { parentId: id }, data: { parentId: folder.parentId } }),
    db.imageFolder.delete({ where: { id } }),
  ]);
  return Response.json({ ok: true, parentId: folder.parentId });
}
