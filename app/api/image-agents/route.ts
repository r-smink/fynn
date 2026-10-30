import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { referenceSourceWhere, userBrandScope, visibleOwnedWhere } from "@/lib/scope";
import { allowedSourceIds, imageAgentSelect } from "@/lib/image-agent";

/** GET → zichtbare beeld-agents + de kennisbronnen die je eraan kunt koppelen. */
export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const [agents, sources] = await Promise.all([
    db.imageAgent.findMany({ where: await visibleOwnedWhere(user), select: imageAgentSelect, orderBy: { name: "asc" } }),
    db.knowledgeSource.findMany({
      where: await referenceSourceWhere(user),
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return Response.json({ agents, sources });
}

/** POST { name, emoji?, instructions?, sourceIds?, brandId? } — nieuwe beeld-agent. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  if (!data.name?.trim()) return Response.json({ error: "Geef de agent een naam" }, { status: 400 });
  const scope = await userBrandScope(user);
  const sourceIds = await allowedSourceIds(user, data.sourceIds);
  const agent = await db.imageAgent.create({
    data: {
      userId: user.id,
      // members aan een brand: automatisch aan die brand; admins mogen kiezen
      brandId: scope ?? (isAdminRole(user.role) && data.brandId ? data.brandId : null),
      name: data.name.trim().slice(0, 40),
      emoji: (data.emoji?.trim() || "🤖").slice(0, 8),
      instructions: (data.instructions ?? "").trim().slice(0, 4000),
      sources: { connect: sourceIds.map((id) => ({ id })) },
    },
    select: imageAgentSelect,
  });
  return Response.json({ agent }, { status: 201 });
}
