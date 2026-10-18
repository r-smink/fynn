import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { db } from "@/lib/db";
import { ChatWindow } from "@/components/chat/chat-window";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");

  const convo = await db.conversation.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo) notFound();

  const initialMessages: UIMessage[] = convo.messages.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: JSON.parse(m.parts),
    metadata: { model: m.model, ...JSON.parse(m.usage || "{}") },
  }));

  return (
    <ChatWindow
      conversationId={convo.id}
      initialMessages={initialMessages}
      initialModel={convo.model}
      agentId={convo.agentId}
      brandId={convo.brandId}
      isAdmin={isAdminRole(user.role)}
    />
  );
}
