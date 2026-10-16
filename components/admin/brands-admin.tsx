"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type BrandRow = {
  id: string; name: string; slug: string; description: string; logoUrl: string;
  websiteUrl: string; toneOfVoice: string; theme: string; isDefault: boolean;
  _count: { agents: number; sources: number; templates: number };
};

type Theme = {
  primary: string; secondary: string; gradient: string; headingFont: string; bodyFont: string;
};

const EMPTY = {
  name: "", slug: "", description: "", logoUrl: "", websiteUrl: "", toneOfVoice: "",
  isDefault: false,
  theme: { primary: "#8F39AC", secondary: "#379FD3", gradient: "linear-gradient(135deg,#8F39AC 0%,#379FD3 100%)", headingFont: "", bodyFont: "" } as Theme,
};

export function BrandsAdmin({ brands, canEdit }: { brands: BrandRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(EMPTY);

  function openNew() { setEditId(null); setF(EMPTY); setOpen(true); }

  function openEdit(b: BrandRow) {
    let theme = EMPTY.theme;
    try { theme = { ...EMPTY.theme, ...JSON.parse(b.theme || "{}") }; } catch { /* ignore */ }
    setEditId(b.id);
    setF({
      name: b.name, slug: b.slug, description: b.description, logoUrl: b.logoUrl,
      websiteUrl: b.websiteUrl, toneOfVoice: b.toneOfVoice, isDefault: b.isDefault, theme,
    });
    setOpen(true);
  }

  async function save() {
    await fetch(editId ? `/api/brands/${editId}` : "/api/brands", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Brand verwijderen?")) return;
    await fetch(`/api/brands/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {canEdit && <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nieuwe brand</Button>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {brands.map((b) => {
          let t: Theme | null = null;
          try { t = JSON.parse(b.theme || "{}"); } catch { /* ignore */ }
          return (
            <div key={b.id} className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ background: t?.gradient || t?.primary || "var(--primary)" }}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    {b.name}
                    {b.isDefault && <Badge variant="secondary">default</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{b.websiteUrl || b.slug}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              {t && (
                <div className="mt-3 flex gap-2">
                  {[t.primary, t.secondary].filter(Boolean).map((c) => (
                    <span key={c} className="h-5 w-5 rounded-full border" style={{ backgroundColor: c }} title={c} />
                  ))}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {b._count.agents} agents · {b._count.sources} bronnen · {b._count.templates} templates
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {!brands.length && <p className="text-sm text-muted-foreground">Nog geen brands.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Brand bewerken" : "Nieuwe brand"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Naam</Label>
                <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} />
              </div>
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Beschrijving</Label>
              <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Logo URL</Label>
                <Input value={f.logoUrl} onChange={(e) => setF({ ...f, logoUrl: e.target.value })} placeholder="/logo.png of https://…" />
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input value={f.websiteUrl} onChange={(e) => setF({ ...f, websiteUrl: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tone of voice</Label>
              <Textarea value={f.toneOfVoice} onChange={(e) => setF({ ...f, toneOfVoice: e.target.value })} rows={3}
                placeholder="Bijv. professioneel maar toegankelijk, 'jij' aanspreken, korte zinnen…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Primaire kleur</Label>
                <Input type="color" value={f.theme.primary} onChange={(e) => setF({ ...f, theme: { ...f.theme, primary: e.target.value } })} className="h-9 p-1" />
              </div>
              <div className="space-y-1">
                <Label>Secundaire kleur</Label>
                <Input type="color" value={f.theme.secondary} onChange={(e) => setF({ ...f, theme: { ...f.theme, secondary: e.target.value } })} className="h-9 p-1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Gradient (CSS)</Label>
              <Input value={f.theme.gradient} onChange={(e) => setF({ ...f, theme: { ...f.theme, gradient: e.target.value } })} />
              <div className="h-3 rounded" style={{ background: f.theme.gradient }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Koppen-font</Label>
                <Input value={f.theme.headingFont} onChange={(e) => setF({ ...f, theme: { ...f.theme, headingFont: e.target.value } })} placeholder="bijv. Poppins, sans-serif" />
              </div>
              <div className="space-y-1">
                <Label>Body-font</Label>
                <Input value={f.theme.bodyFont} onChange={(e) => setF({ ...f, theme: { ...f.theme, bodyFont: e.target.value } })} placeholder="bijv. Inter, sans-serif" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={f.isDefault} onCheckedChange={(v) => setF({ ...f, isDefault: v })} />
              <Label>Default brand (UI-thema + login)</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.name}>Opslaan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
