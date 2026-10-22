import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const convo = await db.conversation.findFirst({
    where: { id, userId: user.id },
    include: {
      agent: { include: { brand: true } },
      brand: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!convo) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  return Response.json({
    conversation: {
      ...convo,
      messages: convo.messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: JSON.parse(m.parts),
        metadata: { model: m.model, ...JSON.parse(m.usage || "{}") },
      })),
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const convo = await db.conversation.findFirst({ where: { id, userId: user.id } });
  if (!convo) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const { title, pinned, archived, model, agentId } = (await req.json()) as {
    title?: string; pinned?: boolean; archived?: boolean; model?: string; agentId?: string;
  };
  const updated = await db.conversation.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(pinned !== undefined && { pinned }),
      ...(archived !== undefined && { archived }),
      ...(model !== undefined && { model }),
      ...(agentId !== undefined && { agentId }),
    },
  });
  return Response.json({ conversation: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db.conversation.deleteMany({ where: { id, userId: user.id } });
  return Response.json({ ok: true });
}
