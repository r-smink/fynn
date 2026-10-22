import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TasksAdmin } from "@/components/tasks-admin";
import { isAdminRole } from "@/lib/roles";
import { userBrandScope, visibleOwnedWhere } from "@/lib/scope";

export default async function TasksPage() {
  const user = await requireUser();
  const scope = user ? await userBrandScope(user) : null;
  const isAdmin = isAdminRole(user!.role);
  const [tasks, agents, brands] = await Promise.all([
    db.task.findMany({
      where: await visibleOwnedWhere(user!),
      orderBy: { name: "asc" },
      include: {
        agent: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    db.agent.findMany({
      where: scope ? { brandId: scope } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    isAdmin
      ? db.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Geautomatiseerde taken</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Periodieke of handmatige opdrachten: content genereren, blogposts als draft op WordPress zetten en meer.
      </p>
      <TasksAdmin tasks={tasks} agents={agents} brands={brands} isAdmin={isAdmin} />
    </div>
  );
}
