"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database, FileText, FolderGit2, Globe, Link as LinkIcon,
  Plus, RefreshCw, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Source = {
  id: string; name: string; type: string; config: string; status: string;
  statusMsg: string; lastSyncAt: string | Date | null; chunkCount: number;
  brand?: { id: string; name: string } | null;
};

const TYPE_META: Record<string, { label: string; icon: typeof Globe }> = {
  file: { label: "Bestand", icon: FileText },
  url: { label: "Pagina (URL)", icon: LinkIcon },
  sitemap: { label: "Website (sitemap)", icon: Globe },
  git: { label: "Git-repo", icon: FolderGit2 },
  folder: { label: "Lokale map", icon: Database },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ready: "default", syncing: "secondary", pending: "outline", error: "destructive",
};

export function KnowledgeAdmin({
  sources, brands, canEdit,
}: { sources: Source[]; brands: { id: string; name: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: "", type: "url", brandId: "",
    url: "", maxPages: "60", localPath: "",
    repoUrl: "", branch: "", token: "", include: "", exclude: "",
  });

  async function save() {
    const config: Record<string, unknown> = {};
    if (f.type === "url") config.url = f.url;
    if (f.type === "sitemap") { config.url = f.url; config.maxPages = Number(f.maxPages) || 60; }
    if (f.type === "file" || f.type === "folder") {
      config.localPath = f.localPath;
      if (f.include) config.include = f.include.split(",").map((s) => s.trim());
      if (f.exclude) config.exclude = f.exclude.split(",").map((s) => s.trim());
    }
    if (f.type === "git") {
      Object.assign(config, {
        repoUrl: f.repoUrl,
        branch: f.branch || undefined,
        token: f.token || undefined,
        include: f.include ? f.include.split(",").map((s) => s.trim()) : undefined,
        exclude: f.exclude ? f.exclude.split(",").map((s) => s.trim()) : undefined,
      });
    }
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.name, type: f.type, brandId: f.brandId || null, config }),
    });
    const { source } = await res.json();
    setOpen(false);
    toast.success("Bron aangemaakt — sync gestart");
    fetch(`/api/knowledge/${source.id}/sync`, { method: "POST" }).finally(() => router.refresh());
    router.refresh();
  }

  async function sync(id: string) {
    setSyncing(id);
    const res = await fetch(`/api/knowledge/${id}/sync`, { method: "POST" });
    const data = await res.json();
    setSyncing(null);
    if (data.error) toast.error(`Sync mislukt: ${data.error}`);
    else toast.success(`${data.chunks} chunks geïndexeerd`);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Bron + alle chunks verwijderen?")) return;
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/knowledge/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) toast.error(data.error);
    else toast.success(`${file.name}: ${data.chunks} chunks geïndexeerd`);
    e.target.value = "";
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {canEdit && (
          <>
            <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nieuwe bron</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Upload bestand
            </Button>
            <input ref={fileRef} type="file" accept=".md,.txt,.html,.markdown,.csv,.json" className="hidden" onChange={upload} />
          </>
        )}
      </div>

      <div className="space-y-2">
        {sources.map((s) => {
          const meta = TYPE_META[s.type] ?? TYPE_META.url;
          const Icon = meta.icon;
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>{s.status}</Badge>
                  {s.brand && <Badge variant="outline">{s.brand.name}</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {meta.label} · {s.chunkCount} chunks
                  {s.lastSyncAt && ` · gesynced ${new Date(s.lastSyncAt).toLocaleString("nl-NL")}`}
                  {s.statusMsg && ` · ${s.statusMsg}`}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => sync(s.id)} disabled={syncing === s.id}>
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncing === s.id ? "animate-spin" : ""}`} /> Sync
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          );
        })}
        {!sources.length && <p className="text-sm text-muted-foreground">Nog geen bronnen.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Nieuwe kennisbron</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Naam</Label>
                <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v ?? "url" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_META).map(([k, m]) => (
                      <SelectItem key={k} value={k}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Select value={f.brandId || "none"} onValueChange={(v) => setF({ ...f, brandId: v === "none" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="Globaal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Globaal (alle brands)</SelectItem>
                  {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(f.type === "url" || f.type === "sitemap") && (
              <>
                <div className="space-y-1">
                  <Label>{f.type === "sitemap" ? "Site- of sitemap-URL" : "Pagina-URL"}</Label>
                  <Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })}
                    placeholder={f.type === "sitemap" ? "https://fyndable.ai" : "https://…"} />
                </div>
                {f.type === "sitemap" && (
                  <div className="space-y-1">
                    <Label>Max. pagina&apos;s</Label>
                    <Input value={f.maxPages} onChange={(e) => setF({ ...f, maxPages: e.target.value })} />
                  </div>
                )}
              </>
            )}

            {(f.type === "file" || f.type === "folder") && (
              <div className="space-y-1">
                <Label>Lokaal pad</Label>
                <Input value={f.localPath} onChange={(e) => setF({ ...f, localPath: e.target.value })}
                  placeholder={f.type === "file" ? "C:\\pad\\naar\\doc.md" : "C:\\pad\\naar\\map"} />
              </div>
            )}

            {f.type === "git" && (
              <>
                <div className="space-y-1">
                  <Label>Repo URL</Label>
                  <Input value={f.repoUrl} onChange={(e) => setF({ ...f, repoUrl: e.target.value })} placeholder="https://github.com/org/repo.git" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Input value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })} placeholder="main" />
                  </div>
                  <div className="space-y-1">
                    <Label>Token (private repo)</Label>
                    <Input type="password" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} placeholder="ghp_…" />
                  </div>
                </div>
              </>
            )}

            {(f.type === "git" || f.type === "folder") && (
              <div className="space-y-1">
                <Label>Include globs (komma-gescheiden, leeg = defaults)</Label>
                <Input value={f.include} onChange={(e) => setF({ ...f, include: e.target.value })}
                  placeholder="**/*.md, docs/**, src/**/*.ts" />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.name}>Toevoegen + syncen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
