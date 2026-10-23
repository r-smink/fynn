import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const image = await db.imageGeneration.findFirst({ where: { id, userId: user.id } });
  if (!image) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  await db.imageGeneration.delete({ where: { id } });
  await deleteFile(`images/${image.url.split("/").pop()}`).catch(() => {});
  return Response.json({ ok: true });
}
