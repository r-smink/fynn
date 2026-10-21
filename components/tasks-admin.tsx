"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, Pencil, Play, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelPicker } from "@/components/chat/model-picker";

type TaskRun = {
  id: string;
  status: string;
  output: string;
  resultUrl: string;
  error: string;
  createdAt: string | Date;
};

type Task = {
  id: string;
  name: string;
  agentId: string | null;
  agent?: { id: string; name: string } | null;
  model: string;
  prompt: string;
  schedule: string;
  action: string;
  actionConfig: string;
  enabled: boolean;
  lastRunAt: string | Date | null;
  runs: TaskRun[];
};

type Agent = { id: string; name: string };

const ACTIONS = [
  { value: "chat_run", label: "Tekst genereren (alleen opslaan)" },
  { value: "wordpress_post", label: "WordPress-blogpost" },
];

const empty = {
  name: "", agentId: "", model: "", prompt: "", schedule: "",
  action: "chat_run", wpStatus: "draft", enabled: true,
};

export function TasksAdmin({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState<string | null>(null);

  function openNew() { setEditId(null); setF(empty); setOpen(true); }
  function openEdit(t: Task) {
    const cfg = JSON.parse(t.actionConfig || "{}");
    setEditId(t.id);
    setF({
      name: t.name, agentId: t.agentId ?? "", model: t.model, prompt: t.prompt,
      schedule: t.schedule, action: t.action,
      wpStatus: cfg.status ?? "draft", enabled: t.enabled,
    });
    setOpen(true);
  }

  async function save() {
    await fetch(editId ? `/api/tasks/${editId}` : "/api/tasks", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, agentId: f.agentId || null, model: f.model, prompt: f.prompt,
        schedule: f.schedule, action: f.action, enabled: f.enabled,
        actionConfig: f.action === "wordpress_post" ? { status: f.wpStatus } : {},
      }),
    });
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Taak verwijderen?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function runNow(id: string) {
    setBusy(`run:${id}`);
    await fetch(`/api/tasks/${id}/run`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  async function publish(id: string) {
    setBusy(`pub:${id}`);
    await fetch(`/api/tasks/${id}/publish`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  async function toggleEnabled(t: Task) {
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !t.enabled }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nieuwe taak</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {tasks.map((t) => {
          const last = t.runs[0];
          return (
            <div key={t.id} className="rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 font-medium">{t.name}</span>
                <Switch checked={t.enabled} onCheckedChange={() => toggleEnabled(t)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="secondary">{ACTIONS.find((a) => a.value === t.action)?.label ?? t.action}</Badge>
                {t.schedule && <Badge variant="outline">cron: {t.schedule}</Badge>}
                {t.agent && <Badge variant="outline">{t.agent.name}</Badge>}
                {t.model && <Badge variant="outline">{t.model}</Badge>}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{t.prompt}</p>

              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => runNow(t.id)} disabled={busy === `run:${t.id}`}>
                  <Play className="mr-1 h-3.5 w-3.5" /> {busy === `run:${t.id}` ? "Bezig…" : "Nu uitvoeren"}
                </Button>
                {t.action === "wordpress_post" && JSON.parse(t.actionConfig || "{}").wpPostId && (
                  <Button size="sm" variant="outline" onClick={() => publish(t.id)} disabled={busy === `pub:${t.id}`}>
                    <Send className="mr-1 h-3.5 w-3.5" /> {busy === `pub:${t.id}` ? "Bezig…" : "Draft publiceren"}
                  </Button>
                )}
                {t.lastRunAt && (
                  <span className="text-xs text-muted-foreground">
                    Laatste run: {new Date(t.lastRunAt).toLocaleString("nl-NL")}
                  </span>
                )}
              </div>

              {last && (
                <div className="mt-3 rounded-lg bg-muted/50 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={last.status === "done" ? "secondary" : "destructive"}>{last.status}</Badge>
                    <span className="text-muted-foreground">{new Date(last.createdAt).toLocaleString("nl-NL")}</span>
                    {last.resultUrl && (
                      <a href={last.resultUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline">
                        openen <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {last.error && <p className="mt-1 text-destructive">{last.error}</p>}
                  {last.output && !last.error && (
                    <p className="mt-1 line-clamp-3 text-muted-foreground">{last.output}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!tasks.length && (
          <p className="text-sm text-muted-foreground">
            Nog geen taken. Maak een taak aan die periodiek content genereert of publiceert.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editId ? "Taak bewerken" : "Nieuwe taak"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Naam</Label>
                <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Agent</Label>
                <Select value={f.agentId || "default"} onValueChange={(v) => setF({ ...f, agentId: !v || v === "default" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standaard-agent</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Model (optioneel — overschrijft agent-default)</Label>
              <ModelPicker value={f.model} onChange={(v) => setF({ ...f, model: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Actie</Label>
                <Select value={f.action} onValueChange={(v) => setF({ ...f, action: v ?? "chat_run" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {f.action === "wordpress_post" && (
                <div className="space-y-1">
                  <Label>Post-status</Label>
                  <Select value={f.wpStatus} onValueChange={(v) => setF({ ...f, wpStatus: v ?? "draft" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (aanrader — jij reviewt)</SelectItem>
                      <SelectItem value="publish">Direct publiceren</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Cron-schema (leeg = alleen handmatig)</Label>
              <Input
                value={f.schedule}
                onChange={(e) => setF({ ...f, schedule: e.target.value })}
                placeholder="0 9 * * 1  →  elke maandag 09:00"
              />
              <p className="text-xs text-muted-foreground">
                Tijden in Amsterdam-tijd (CET/CEST). 5 velden: minuut uur dag-maand maand dag-week.
                Voorbeelden: <code>0 9 * * 1</code> (ma 09:00),
                <code> 0 8 * * *</code> (dagelijks 08:00), <code>0 9 1 * *</code> (1e van de maand).
              </p>
            </div>
            <div className="space-y-1">
              <Label>Prompt / opdracht</Label>
              <Textarea
                value={f.prompt}
                onChange={(e) => setF({ ...f, prompt: e.target.value })}
                rows={6}
                placeholder="Schrijf een blogpost over … voor fyndable.ai, gericht op …"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
              <Label>Actief</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.name.trim() || !f.prompt.trim()}>Opslaan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
