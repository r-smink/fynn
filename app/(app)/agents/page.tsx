import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AgentsAdmin } from "@/components/admin/agents-admin";
import { TOOL_GROUPS, TOOL_GROUP_LABELS } from "@/lib/agents";

export default async function AgentsPage() {
  const admin = await requireAdmin();
  const [agents, brands, sources] = await Promise.all([
    db.agent.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { brand: true, sources: { select: { id: true } } },
    }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.knowledgeSource.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Agents</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Maak en beheer AI-agents met eigen prompt, model, tools en kennis.
        {!admin && " (alleen admins kunnen wijzigen)"}
      </p>
      <AgentsAdmin
        agents={agents}
        brands={brands}
        sources={sources}
        toolGroups={TOOL_GROUPS.map((g) => ({ id: g, label: TOOL_GROUP_LABELS[g] }))}
        canEdit={!!admin}
      />
    </div>
  );
}
