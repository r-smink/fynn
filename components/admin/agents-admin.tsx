"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type AgentRow = {
  id: string; name: string; description: string; icon: string; color: string;
  systemPrompt: string; brandId: string | null; defaultModel: string;
  temperature: number; enabledTools: string; isDefault: boolean; sortOrder: number;
  brand?: { name: string } | null;
  sources: { id: string }[];
};

type Props = {
  agents: AgentRow[];
  brands: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  toolGroups: { id: string; label: string }[];
  canEdit: boolean;
};

const EMPTY = {
  name: "", description: "", icon: "Bot", color: "", brandId: "",
  defaultModel: "", temperature: 0.7, systemPrompt: "",
  enabledTools: [] as string[], sourceIds: [] as string[], isDefault: false, sortOrder: 0,
};

export function AgentsAdmin({ agents, brands, sources, toolGroups, canEdit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(EMPTY);

  function openNew() {
    setEditId(null);
    setF(EMPTY);
    setOpen(true);
  }

  function openEdit(a: AgentRow) {
    setEditId(a.id);
    setF({
      name: a.name, description: a.description, icon: a.icon, color: a.color,
      brandId: a.brandId ?? "", defaultModel: a.defaultModel, temperature: a.temperature,
      systemPrompt: a.systemPrompt,
      enabledTools: JSON.parse(a.enabledTools || "[]"),
      sourceIds: a.sources.map((s) => s.id),
      isDefault: a.isDefault, sortOrder: a.sortOrder,
    });
    setOpen(true);
  }

  async function save() {
    const payload = { ...f, brandId: f.brandId || null };
    await fetch(editId ? `/api/agents/${editId}` : "/api/agents", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Agent verwijderen?")) return;
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function toggle(list: string[], v: string) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {canEdit && <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nieuwe agent</Button>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <div key={a.id} className="rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: a.color || "var(--primary)" }}
              >
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  {a.name}
                  {a.isDefault && <Badge variant="secondary">default</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {a.brand?.name ?? "globaal"} · {a.defaultModel || "geen model"}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {a.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1">
              {JSON.parse(a.enabledTools || "[]").map((t: string) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        ))}
        {!agents.length && <p className="text-sm text-muted-foreground">Nog geen agents.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Agent bewerken" : "Nieuwe agent"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Naam</Label>
                <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Kleur</Label>
                <Input type="color" value={f.color || "#8F39AC"} onChange={(e) => setF({ ...f, color: e.target.value })} className="h-9 p-1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Beschrijving</Label>
              <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Brand</Label>
                <Select value={f.brandId || "none"} onValueChange={(v) => setF({ ...f, brandId: v === "none" ? "" : (v ?? "") })}>
                  <SelectTrigger><SelectValue placeholder="Geen brand" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen brand (globaal)</SelectItem>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Standaardmodel</Label>
                <Input value={f.defaultModel} onChange={(e) => setF({ ...f, defaultModel: e.target.value })} placeholder="openai/gpt-5" list="models-dl" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Temperature: {f.temperature}</Label>
              <input type="range" min="0" max="1.5" step="0.1" value={f.temperature}
                onChange={(e) => setF({ ...f, temperature: Number(e.target.value) })} className="w-full" />
            </div>
            <div className="space-y-1">
              <Label>System prompt</Label>
              <Textarea value={f.systemPrompt} onChange={(e) => setF({ ...f, systemPrompt: e.target.value })}
                rows={8} placeholder="Instructies voor deze agent…" />
            </div>
            <div className="space-y-2">
              <Label>Tools</Label>
              {toolGroups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.enabledTools.includes(g.id)}
                    onChange={() => setF({ ...f, enabledTools: toggle(f.enabledTools, g.id) })}
                  />
                  {g.label}
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Kennisbronnen (leeg = alle bronnen van de brand)</Label>
              <div className="max-h-32 space-y-1 overflow-auto rounded border p-2">
                {sources.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={f.sourceIds.includes(s.id)}
                      onChange={() => setF({ ...f, sourceIds: toggle(f.sourceIds, s.id) })}
                    />
                    {s.name}
                  </label>
                ))}
                {!sources.length && <p className="text-xs text-muted-foreground">Nog geen bronnen — voeg toe via Kennisbank.</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={f.isDefault} onCheckedChange={(v) => setF({ ...f, isDefault: v })} />
              <Label>Standaard agent</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.name || !f.systemPrompt}>Opslaan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
