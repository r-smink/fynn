"use client";

import { useEffect, useState } from "react";
import { Bot, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AgentLite = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isDefault: boolean;
  brand?: { name: string } | null;
};

export function AgentPicker({
  value, onChange,
}: { value: string | null; onChange: (id: string) => void }) {
  const [agents, setAgents] = useState<AgentLite[]>([]);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents ?? []));
  }, []);

  const current = agents.find((a) => a.id === value) ?? agents.find((a) => a.isDefault);

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
