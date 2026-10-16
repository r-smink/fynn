"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tpl = {
  id: string; title: string; category: string; prompt: string;
  brand?: { name: string } | null;
};

const CATS = ["linkedin", "blog", "nieuwsbrief", "advertentie", "landingspagina", "social", "custom"];

export function TemplatesAdmin({
  templates, brands, canEdit,
}: { templates: Tpl[]; brands: { id: string; name: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ title: "", category: "custom", prompt: "", brandId: "" });

  function openNew() { setEditId(null); setF({ title: "", category: "custom", prompt: "", brandId: "" }); setOpen(true); }
  function openEdit(t: Tpl) {
    setEditId(t.id);
    setF({ title: t.title, category: t.category, prompt: t.prompt, brandId: "" });
    setOpen(true);
  }

  async function save() {
    await fetch(editId ? `/api/templates/${editId}` : "/api/templates", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Template verwijderen?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function use(t: Tpl) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { conversation } = await res.json();
    sessionStorage.setItem(`fynn:first:${conversation.id}`, t.prompt);
    router.push(`/chat/${conversation.id}`);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {canEdit && <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nieuwe template</Button>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{t.title}</span>
              <Button variant="ghost" size="icon" onClick={() => use(t)} title="Gebruik in nieuw gesprek">
                <Play className="h-4 w-4" />
              </Button>
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
            <div className="mt-1 flex gap-1">
              <Badge variant="secondary">{t.category}</Badge>
              {t.brand && <Badge variant="outline">{t.brand.name}</Badge>}
            </div>
            <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{t.prompt}</p>
          </div>
        ))}
        {!templates.length && <p className="text-sm text-muted-foreground">Nog geen templates.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Template bewerken" : "Nieuwe template"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Titel</Label>
                <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Categorie</Label>
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v ?? "custom" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Select value={f.brandId || "none"} onValueChange={(v) => setF({ ...f, brandId: v === "none" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="Globaal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Globaal</SelectItem>
                  {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Prompt</Label>
              <Textarea value={f.prompt} onChange={(e) => setF({ ...f, prompt: e.target.value })} rows={8} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.title || !f.prompt}>Opslaan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
