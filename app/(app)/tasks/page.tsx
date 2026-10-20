import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TasksAdmin } from "@/components/tasks-admin";

export default async function TasksPage() {
  const user = await requireUser();
  const [tasks, agents] = await Promise.all([
    db.task.findMany({
      where: { userId: user!.id },
      orderBy: { name: "asc" },
      include: {
        agent: { select: { id: true, name: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    db.agent.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Geautomatiseerde taken</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Periodieke of handmatige opdrachten: content genereren, blogposts als draft op WordPress zetten en meer.
      </p>
      <TasksAdmin tasks={tasks} agents={agents} />
    </div>
  );
}
