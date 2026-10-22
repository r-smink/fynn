import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { TOOL_GROUPS } from "@/lib/agents";
import { userBrandScope } from "@/lib/scope";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const scope = await userBrandScope(user);
  const agents = await db.agent.findMany({
    where: scope ? { brandId: scope } : {},
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      brand: true,
      sources: { select: { id: true, name: true } },
      templates: { select: { id: true, title: true, category: true } },
    },
  });
  return Response.json({ agents, toolGroups: TOOL_GROUPS });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();

  const agent = await db.agent.create({
    data: {
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: data.description ?? "",
      icon: data.icon ?? "Bot",
      color: data.color ?? "",
      systemPrompt: data.systemPrompt ?? "",
      brandId: data.brandId || null,
      defaultModel: data.defaultModel ?? "",
      temperature: data.temperature ?? 0.7,
      enabledTools: JSON.stringify(data.enabledTools ?? []),
      isDefault: data.isDefault ?? false,
      sortOrder: data.sortOrder ?? 0,
      ...(data.sourceIds?.length
        ? { sources: { connect: data.sourceIds.map((id: string) => ({ id })) } }
        : {}),
      ...(data.templateIds?.length
        ? { templates: { connect: data.templateIds.map((id: string) => ({ id })) } }
        : {}),
    },
  });
  return Response.json({ agent }, { status: 201 });
}
