"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Copy, RefreshCw, Send, Square, User, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModelPicker } from "@/components/chat/model-picker";
import { AgentPicker, useAgents } from "@/components/chat/agent-picker";
import { MobileChatControls } from "@/components/chat/mobile-chat-controls";
import { TemplatePicker, type ChatTemplate } from "@/components/chat/template-picker";
import { MessageParts } from "@/components/chat/message-part";
import { cn } from "@/lib/utils";

type Props = {
  conversationId: string;
  initialMessages: UIMessage[];
  initialModel: string;
  agentId: string | null;
  brandId: string | null;
  isAdmin: boolean;
};

export function ChatWindow({
  conversationId, initialMessages, initialModel, agentId: initialAgentId, brandId, isAdmin,
}: Props) {
  const [input, setInput] = useState("");
  const [model, setModel] = useState(initialModel);
  const [agentId, setAgentId] = useState<string | null>(initialAgentId);
  const agents = useAgents();
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentFirst = useRef(false);

  const { messages, sendMessage, status, regenerate, stop, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  // Startschermberichten worden automatisch verstuurd; templates blijven eerst bewerkbaar.
  useEffect(() => {
    if (sentFirst.current) return;
    const first = sessionStorage.getItem(`fynn:first:${conversationId}`);
    if (first) {
      sentFirst.current = true;
      sessionStorage.removeItem(`fynn:first:${conversationId}`);
      sendMessage({ text: first }, { body: { conversationId, model, agentId } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const draftKey = `fynn:draft:${conversationId}`;
    const draft = sessionStorage.getItem(draftKey);
    if (!draft) return;
    const timer = window.setTimeout(() => setInput(draft), 0);
    sessionStorage.removeItem(draftKey);
    return () => window.clearTimeout(timer);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage({ text }, { body: { conversationId, model, agentId } });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function textOf(m: UIMessage): string {
    return m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  }

  async function exportMessage(m: UIMessage) {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: textOf(m), brandId, title: "FYNN export" }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fynn-export-${m.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function changeModel(id: string) {
    setModel(id);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: id }),
    });
  }

  async function changeAgent(id: string) {
    setAgentId(id);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: id }),
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* header — desktop: pickers inline; mobiel: compacte knoppen met bottom-sheets zodat de chat breed blijft */}
      <div className="hidden flex-wrap items-center gap-2 border-b px-4 py-2 md:flex">
        <AgentPicker value={agentId} onChange={changeAgent} agents={agents} />
        <ModelPicker value={model} onChange={changeModel} isAdmin={isAdmin} />
      </div>
      <MobileChatControls
        className="border-b px-2 py-1"
        agents={agents}
        agentId={agentId}
        onAgentChange={(id) => void changeAgent(id)}
        model={model}
        onModelChange={(id) => void changeModel(id)}
        onTemplate={(template: ChatTemplate) => setInput(template.prompt)}
        isAdmin={isAdmin}
      />

      {/* messages */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-3xl space-y-5 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6">
          {messages.map((m, idx) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
              {m.role !== "user" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "min-w-0 max-w-[85%] rounded-2xl px-4 py-3",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm">{textOf(m)}</p>
                ) : (
                  <MessageParts parts={m.parts as never} />
                )}
                {m.role === "assistant" && status !== "streaming" && (
                  <div className="mt-2 flex items-center gap-1 opacity-60">
                    <button
                      onClick={() => navigator.clipboard.writeText(textOf(m))}
                      className="rounded p-1 hover:bg-accent" title="Kopieer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {idx === messages.length - 1 && (
                      <button
                        onClick={() => regenerate({ body: { conversationId, model, agentId } })}
                        className="rounded p-1 hover:bg-accent" title="Opnieuw genereren"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => exportMessage(m)}
                      className="rounded p-1 hover:bg-accent" title="Exporteer als branded HTML"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </button>
                    {(m.metadata as { model?: string } | undefined)?.model && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {(m.metadata as { model: string }).model}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {status === "submitted" && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                Aan het denken…
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error.message || "Er ging iets mis"}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* composer */}
      <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Typ een bericht… (Enter = verstuur, Shift+Enter = nieuwe regel)"
            className="min-h-[52px] flex-1 resize-none"
            rows={2}
          />
          <div className="hidden md:block">
            <TemplatePicker agentId={agentId} onSelect={(template: ChatTemplate) => setInput(template.prompt)} />
          </div>
          {busy ? (
            <Button size="icon" variant="outline" onClick={() => stop()} title="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={submit} disabled={!input.trim()} title="Verstuur">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
