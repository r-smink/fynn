import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewChat } from "@/components/new-chat";
import { isAdminRole } from "@/lib/roles";
import { userBrandScope } from "@/lib/scope";

export default async function ChatPage() {
  const user = await requireUser();
  const scope = user ? await userBrandScope(user) : null;
  const agents = await db.agent.findMany({
    where: scope ? { brandId: scope } : {},
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { brand: { select: { name: true } } },
  });
  return <NewChat agents={agents} isAdmin={isAdminRole(user?.role)} />;
}
