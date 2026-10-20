"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Waypoints, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelPicker } from "@/components/chat/model-picker";

type Fusion = {
  id: string;
  name: string;
  description: string;
  leadModel: string;
  leadEffort: string;
  sidekick1: string;
  sidekick2: string;
};

const EFFORTS = [
  { value: "default", label: "Model-default" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra high" },
];

const empty = { name: "", description: "", leadModel: "", leadEffort: "", sidekick1: "", sidekick2: "" };

function ModelField({
  label, value, onChange, optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <ModelPicker value={value} onChange={onChange} includeFusions={false} />
        {optional && value && (
          <Button variant="ghost" size="icon" onClick={() => onChange("")} title="Geen">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function FusionsAdmin({ fusions }: { fusions: Fusion[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);

  function openNew() { setEditId(null); setF(empty); setOpen(true); }
  function openEdit(t: Fusion) {
    setEditId(t.id);
    setF({
      name: t.name, description: t.description, leadModel: t.leadModel,
      leadEffort: t.leadEffort, sidekick1: t.sidekick1, sidekick2: t.sidekick2,
    });
    setOpen(true);
  }

  async function save() {
    await fetch(editId ? `/api/fusions/${editId}` : "/api/fusions", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Fusion-template verwijderen?")) return;
    await fetch(`/api/fusions/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nieuwe fusion</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fusions.map((t) => (
          <div key={t.id} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Waypoints className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{t.name}</span>
              <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="secondary">Lead: {t.leadModel}</Badge>
              {t.leadEffort && <Badge variant="outline">effort: {t.leadEffort}</Badge>}
              {t.sidekick1 && <Badge variant="outline">+ {t.sidekick1}</Badge>}
              {t.sidekick2 && <Badge variant="outline">+ {t.sidekick2}</Badge>}
            </div>
            {t.description && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
            )}
          </div>
        ))}
        {!fusions.length && (
          <p className="text-sm text-muted-foreground">
            Nog geen fusion-templates. Maak er een om meerdere modellen kostenefficiënt te laten samenwerken.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editId ? "Fusion bewerken" : "Nieuwe fusion"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Naam</Label>
                <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Beschrijving</Label>
                <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
              </div>
            </div>
            <ModelField
              label="Lead-model (schrijft het antwoord)"
              value={f.leadModel}
              onChange={(v) => setF({ ...f, leadModel: v })}
            />
            <div className="space-y-1">
              <Label>Lead effort (redeneerniveau)</Label>
              <Select
                value={f.leadEffort || "default"}
                onValueChange={(v) => setF({ ...f, leadEffort: !v || v === "default" ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EFFORTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ModelField
              label="Sidekick 1 (optioneel)"
              value={f.sidekick1}
              onChange={(v) => setF({ ...f, sidekick1: v })}
              optional
            />
            <ModelField
              label="Sidekick 2 (optioneel)"
              value={f.sidekick2}
              onChange={(v) => setF({ ...f, sidekick2: v })}
              optional
            />
            <p className="text-xs text-muted-foreground">
              Sidekicks analyseren je vraag en leveren input aan het lead-model; het lead-model schrijft
              één coherent antwoord. Kies goedkope sidekicks voor kostenefficiënte uitvoering.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.name.trim() || !f.leadModel}>Opslaan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
