"use client";

import { useState } from "react";
import { Bot, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AgentPicker, currentAgent, type AgentLite } from "@/components/chat/agent-picker";
import { ModelPicker } from "@/components/chat/model-picker";
import { TemplatePicker, type ChatTemplate } from "@/components/chat/template-picker";
import { cn } from "@/lib/utils";

/**
 * Mobiele balk (< md) met twee knoppen: agent kiezen, en model + template kiezen.
 * Beide openen een bottom-sheet zodat het invoerveld de volle breedte houdt.
 */
export function MobileChatControls({
  agents, agentId, onAgentChange, model, onModelChange, onTemplate, isAdmin, className,
}: {
  agents: AgentLite[];
  agentId: string | null;
  onAgentChange: (id: string) => void;
  model: string;
  onModelChange: (id: string) => void;
  onTemplate: (template: ChatTemplate) => void;
  isAdmin?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<"agent" | "options" | null>(null);
  const agent = currentAgent(agents, agentId);

  return (
    <div className={cn("flex items-center justify-between gap-2 md:hidden", className)}>
      <Button variant="ghost" size="sm" className="min-w-0 gap-1.5 px-2" onClick={() => setOpen("agent")}>
        <Bot className="h-4 w-4 shrink-0" style={agent?.color ? { color: agent.color } : undefined} />
        <span className="truncate">{agent?.name ?? "Agent"}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </Button>
      <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 px-2" onClick={() => setOpen("options")}>
        <SlidersHorizontal className="h-4 w-4" />
        <span className="text-xs">Model &amp; template</span>
      </Button>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="bottom" className="max-h-[80dvh] gap-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {open === "agent" ? (
            <>
              <SheetTitle>Kies een agent</SheetTitle>
              <AgentPicker
                inline
                agents={agents}
                value={agent?.id ?? null}
                onChange={(id) => { onAgentChange(id); setOpen(null); }}
              />
            </>
          ) : (
            <>
              <SheetTitle>Model &amp; template</SheetTitle>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Model</p>
                <ModelPicker value={model} onChange={onModelChange} isAdmin={isAdmin} triggerClassName="w-full max-w-none justify-between" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Template</p>
                <TemplatePicker
                  inline
                  agentId={agent?.id ?? null}
                  onSelect={(template) => { onTemplate(template); setOpen(null); }}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
