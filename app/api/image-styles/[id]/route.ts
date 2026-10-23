import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ownsOrShares } from "@/lib/scope";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const style = await db.imageStyle.findUnique({ where: { id } });
  if (!style || !(await ownsOrShares(style, user))) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }
  await db.imageStyle.delete({ where: { id } });
  return Response.json({ ok: true });
}
