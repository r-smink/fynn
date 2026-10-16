import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewChat } from "@/components/new-chat";

export default async function ChatPage() {
  const user = await requireUser();
  const agents = await db.agent.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { brand: { select: { name: true } } },
  });
  return <NewChat agents={agents} isAdmin={user?.role === "admin"} />;
}
