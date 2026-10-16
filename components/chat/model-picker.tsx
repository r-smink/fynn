"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Model = {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  promptPrice: number;
  completionPrice: number;
  modality: string;
};

export function ModelPicker({
  value, onChange, isAdmin,
}: { value: string; onChange: (id: string) => void; isAdmin?: boolean }) {
  const [models, setModels] = useState<Model[]>([]);
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const res = await fetch("/api/models");
    if (res.ok) setModels((await res.json()).models);
  }
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  async function sync() {
    setSyncing(true);
    await fetch("/api/models", { method: "POST" });
    await load();
    setSyncing(false);
  }

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return models.filter((m) =>
      !s || m.id.toLowerCase().includes(s) || m.name.toLowerCase().includes(s) || m.provider.includes(s)
    );
  }, [models, q]);

  const grouped = useMemo(() => {
    const g = new Map<string, Model[]>();
    for (const m of filtered) {
      const arr = g.get(m.provider) ?? [];
      arr.push(m);
      g.set(m.provider, arr);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const current = models.find((m) => m.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="max-w-[280px] gap-1">
            <span className="truncate">{current?.name || value || "Kies model"}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-[380px] p-0">
        <div className="flex items-center gap-1 border-b p-2">
          <Input
            placeholder="Zoek model…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8"
          />
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={sync} disabled={syncing} title="Catalogus verversen">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {grouped.map(([provider, items]) => (
            <div key={provider}>
              <div className="sticky top-0 bg-popover px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                {provider}
              </div>
              {items.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChange(m.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="flex items-center gap-2 truncate">
                    {value === m.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    <span className={value === m.id ? "" : "pl-5"}>{m.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {m.contextLength ? `${Math.round(m.contextLength / 1000)}k` : ""}
                    {m.modality.includes("image") ? " · img" : ""}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {!filtered.length && (
            <p className="p-4 text-sm text-muted-foreground">
              {models.length ? "Geen resultaat" : "Catalogus leeg — ververs via Instellingen"}
            </p>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
