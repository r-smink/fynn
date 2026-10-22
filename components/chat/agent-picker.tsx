"use client";

import { useEffect, useState } from "react";
import { Bot, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AgentLite = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isDefault: boolean;
  brand?: { name: string } | null;
};

export function useAgents() {
  const [agents, setAgents] = useState<AgentLite[]>([]);
  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents ?? []));
  }, []);
  return agents;
}

export function currentAgent(agents: AgentLite[], value: string | null) {
  return agents.find((a) => a.id === value) ?? agents.find((a) => a.isDefault);
}

export function AgentPicker({
  value, onChange, inline, agents: given,
}: {
  value: string | null;
  onChange: (id: string) => void;
  /** Toon de lijst direct (bijv. in een mobiele sheet) i.p.v. als dropdown. */
  inline?: boolean;
  agents?: AgentLite[];
}) {
  const fetched = useAgents();
  const agents = given ?? fetched;
  const current = currentAgent(agents, value);

  if (inline) {
    return (
      <div className="flex flex-col gap-1">
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              a.id === current?.id ? "border-primary bg-accent" : "hover:bg-accent/50"
            )}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: a.color || "var(--primary)" }}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {a.name}
                {a.brand && <span className="text-xs font-normal text-muted-foreground">{a.brand.name}</span>}
                {a.id === current?.id && <Check className="ml-auto h-4 w-4 text-primary" />}
              </div>
              {a.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1 px-2">
            <Bot className="h-4 w-4" style={current?.color ? { color: current.color } : undefined} />
            <span>{current?.name ?? "Agent"}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-72">
        {agents.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => onChange(a.id)} className="gap-2">
            <Bot className="h-4 w-4 shrink-0" style={a.color ? { color: a.color } : undefined} />
            <div className="flex-1">
              <div className="flex items-center gap-1 text-sm font-medium">
                {a.name}
                {a.id === value && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
              {a.description && (
                <div className="truncate text-xs text-muted-foreground">{a.description}</div>
              )}
            </div>
            {a.brand && <span className="text-xs text-muted-foreground">{a.brand.name}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
