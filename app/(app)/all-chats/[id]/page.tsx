import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Bot, User } from "lucide-react";
import { requireSuperadmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { MessageParts } from "@/components/chat/message-part";

type Part = { type: string; text?: string };

export default async function ReadOnlyChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireSuperadmin();
  if (!admin) redirect("/chat");
  const { id } = await params;

  const convo = await db.conversation.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      agent: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!convo) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2 text-sm">
        <Link href={`/all-chats?user=${convo.user.id}`} className="rounded p-1 hover:bg-accent" title="Terug">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-medium">{convo.title || "Nieuw gesprek"}</span>
        <span className="text-muted-foreground">
          {convo.user.name || convo.user.email}
          {convo.agent && ` · ${convo.agent.name}`}
          {convo.model && ` · ${convo.model}`}
        </span>
        <span className="ml-auto rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Alleen lezen</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {convo.messages.map((m) => {
            const parts = JSON.parse(m.parts) as Part[];
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={cn("flex gap-3", isUser && "justify-end")}>
                {!isUser && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={cn(
                    "min-w-0 max-w-[85%] rounded-2xl px-4 py-3",
                    isUser ? "bg-primary text-primary-foreground" : "bg-muted/50",
                  )}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-sm">
                      {parts.filter((p) => p.type === "text").map((p) => p.text).join("\n")}
                    </p>
                  ) : (
                    <MessageParts parts={parts} />
                  )}
                  <div className="mt-1 text-[11px] opacity-60">
                    {new Date(m.createdAt).toLocaleString("nl-NL")}
                    {m.model && ` · ${m.model}`}
                  </div>
                </div>
                {isUser && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
          {convo.messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Nog geen berichten.</p>
          )}
        </div>
      </div>
    </div>
  );
}
