"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelPicker } from "@/components/chat/model-picker";
import { TemplatePicker, type ChatTemplate } from "@/components/chat/template-picker";
import { MobileChatControls } from "@/components/chat/mobile-chat-controls";

type Agent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isDefault: boolean;
  defaultModel: string;
  brand?: { name: string } | null;
};

export function NewChat({ agents, isAdmin }: { agents: Agent[]; isAdmin: boolean }) {
  const [input, setInput] = useState("");
  const [agentId, setAgentId] = useState<string | null>(agents.find((a) => a.isDefault)?.id ?? agents[0]?.id ?? null);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const agent = agents.find((a) => a.id === agentId);
  const effectiveModel = model || agent?.defaultModel || "";

  async function start() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, model: effectiveModel }),
    });
    const { conversation } = await res.json();
    sessionStorage.setItem(`fynn:first:${conversation.id}`, text);
    router.push(`/chat/${conversation.id}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      start();
    }
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="mb-2 text-2xl font-bold md:text-3xl">Waarmee kan ik helpen?</h1>
      <p className="mb-6 text-muted-foreground md:mb-8">Kies een agent en start een gesprek.</p>

      {/* desktop: agent-kaarten; mobiel: agentkeuze zit achter de knop in MobileChatControls */}
      {agents.length > 0 && (
        <div className="mb-6 hidden grid-cols-2 gap-3 md:grid">
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => setAgentId(a.id)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                agentId === a.id ? "border-primary bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: a.color || "var(--primary)" }}
              >
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium">
                  {a.name}
                  {a.brand && <span className="text-xs text-muted-foreground">{a.brand.name}</span>}
                </div>
                {a.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <MobileChatControls
        className="mb-2"
        agents={agents}
        agentId={agentId}
        onAgentChange={setAgentId}
        model={effectiveModel}
        onModelChange={setModel}
        onTemplate={(template: ChatTemplate) => setInput(template.prompt)}
        isAdmin={isAdmin}
      />

      <div className="flex items-end gap-2 rounded-xl border p-3 shadow-sm">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Typ je eerste bericht…"
          className="min-h-[52px] flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
          rows={2}
          autoFocus
        />
        <div className="hidden items-end gap-2 md:flex">
          <ModelPicker value={effectiveModel} onChange={setModel} isAdmin={isAdmin} />
          <TemplatePicker agentId={agentId} onSelect={(template: ChatTemplate) => setInput(template.prompt)} />
        </div>
        <Button size="icon" onClick={start} disabled={!input.trim() || busy} title="Start gesprek">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
    </div>
  );
}
