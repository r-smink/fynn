import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ownsOrShares } from "@/lib/scope";
import { allowedSourceIds, imageAgentSelect } from "@/lib/image-agent";

type Ctx = { params: Promise<{ id: string }> };

async function findOwned(id: string, user: { id: string; role: string }) {
  const agent = await db.imageAgent.findUnique({ where: { id } });
  return agent && (await ownsOrShares(agent, user)) ? agent : null;
}

/** PATCH { name?, emoji?, instructions?, sourceIds? } */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await findOwned(id, user))) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  const data = await req.json();
  if (data.name !== undefined && !data.name?.trim()) {
    return Response.json({ error: "Geef de agent een naam" }, { status: 400 });
  }
  const agent = await db.imageAgent.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim().slice(0, 40) } : {}),
      ...(data.emoji !== undefined ? { emoji: (data.emoji?.trim() || "🤖").slice(0, 8) } : {}),
      ...(data.instructions !== undefined ? { instructions: String(data.instructions).trim().slice(0, 4000) } : {}),
      ...(data.sourceIds !== undefined
        ? { sources: { set: (await allowedSourceIds(user, data.sourceIds)).map((sid) => ({ id: sid })) } }
        : {}),
    },
    select: imageAgentSelect,
  });
  return Response.json({ agent });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await findOwned(id, user))) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  await db.imageAgent.delete({ where: { id } });
  return Response.json({ ok: true });
}
