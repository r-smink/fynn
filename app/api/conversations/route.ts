import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: {
      agent: { select: { id: true, name: true, icon: true, color: true } },
      _count: { select: { messages: true } },
    },
  });
  return Response.json({ conversations });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, model, brandId } = (await req.json()) as {
    agentId?: string;
    model?: string;
    brandId?: string;
  };

  const agent = agentId
    ? await db.agent.findUnique({ where: { id: agentId } })
    : await db.agent.findFirst({ where: { isDefault: true } });

  const convo = await db.conversation.create({
    data: {
      userId: user.id,
      agentId: agent?.id ?? null,
      brandId: brandId ?? agent?.brandId ?? null,
      model: model ?? agent?.defaultModel ?? "",
    },
  });
  return Response.json({ conversation: convo }, { status: 201 });
}
