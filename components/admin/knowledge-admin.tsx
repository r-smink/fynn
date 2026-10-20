"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database, FileText, FolderGit2, Globe, Image as ImageIcon, Link as LinkIcon, Type,
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

type Asset = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  caption: string;
  createdAt: string | Date;
};

const UPLOAD_ACCEPT = ".md,.markdown,.mdx,.txt,.html,.htm,.json,.xml,.yml,.yaml,.toml,.csv,.css,.ts,.tsx,.js,.jsx,.php,.py,.sql,.sh,.ps1,.svg,.env.example,.png,.jpg,.jpeg,.webp,.gif";
const CREATE_TYPES = ["upload", "url", "sitemap", "git", "google-fonts"];

const TYPE_META: Record<string, { label: string; icon: typeof Globe }> = {
  file: { label: "Bestand", icon: FileText },
  upload: { label: "Upload (bestanden & afbeeldingen)", icon: ImageIcon },
  url: { label: "Pagina (URL)", icon: LinkIcon },
  sitemap: { label: "Website (sitemap)", icon: Globe },
  git: { label: "Git-repo", icon: FolderGit2 },
  folder: { label: "Lokale map", icon: Database },
  "google-fonts": { label: "Google Fonts", icon: Type },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ready: "default", syncing: "secondary", pending: "outline", error: "destructive",
};

function emptyForm() {
  return {
    name: "", type: "upload", brandId: "",
    url: "", maxPages: "60",
    repoUrl: "", branch: "", token: "", include: "", exclude: "",
  };
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeAdmin({
  sources, brands, canEdit,
}: { sources: Source[]; brands: { id: string; name: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const assetsFileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState(emptyForm);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [filesSource, setFilesSource] = useState<Source | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  async function uploadFilesSequentially(
    files: File[],
    options: { sourceId?: string; name?: string; brandId?: string } = {},
  ): Promise<{ sourceId: string | null; uploaded: number; error?: string }> {
    let sourceId = options.sourceId ?? "";
    let uploaded = 0;
    let error: string | undefined;
    setUploadProgress({ done: 0, total: files.length });

    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("sync", "0");
        if (sourceId) {
          fd.append("sourceId", sourceId);
        } else {
          if (options.name) fd.append("name", options.name);
          if (options.brandId) fd.append("brandId", options.brandId);
        }
        const res = await fetch("/api/knowledge/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || "Upload mislukt");
        sourceId = data.source?.id ?? sourceId;
        uploaded++;
        setUploadProgress({ done: uploaded, total: files.length });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    if (sourceId && uploaded) {
      try {
        const res = await fetch(`/api/knowledge/${sourceId}/sync`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || "Synchroniseren mislukt");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        error = error ? `${error}; synchroniseren mislukt: ${message}` : `Synchroniseren mislukt: ${message}`;
      }
    }
    setUploadProgress(null);
    return { sourceId: sourceId || null, uploaded, ...(error ? { error } : {}) };
  }

  async function save() {
    if (f.type === "upload") {
      if (!createFiles.length) {
        toast.error("Selecteer ten minste één bestand.");
        return;
      }
      const total = createFiles.length;
      const result = await uploadFilesSequentially(createFiles, {
        name: f.name.trim() || createFiles[0].name,
        brandId: f.brandId,
      });
      if (result.uploaded) {
        setOpen(false);
        setCreateFiles([]);
        setF(emptyForm());
        router.refresh();
      }
      if (result.error) toast.error(`${result.uploaded}/${total} geüpload: ${result.error}`);
      else toast.success(`${result.uploaded}/${total} bestanden geüpload en gesynchroniseerd`);
      return;
    }

    const config: Record<string, unknown> = {};
    if (f.type === "url" || f.type === "google-fonts") config.url = f.url;
    if (f.type === "sitemap") { config.url = f.url; config.maxPages = Number(f.maxPages) || 60; }
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      toast.error(data.error || "De bron kon niet worden aangemaakt");
      return;
    }
    const { source } = data;
    setOpen(false);
    toast.success("Bron aangemaakt — sync gestart");
    fetch(`/api/knowledge/${source.id}/sync`, { method: "POST" }).finally(() => router.refresh());
    router.refresh();
  }

  async function sync(id: string) {
    setSyncing(id);
    try {
      const res = await fetch(`/api/knowledge/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) toast.error(`Sync mislukt: ${data.error ?? "onbekende fout"}`);
      else toast.success(`${data.chunks} chunks geïndexeerd`);
      router.refresh();
    } finally {
      setSyncing(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bron + alle chunks verwijderen?")) return;
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const name = `${files[0].name}${files.length > 1 ? ` (+${files.length - 1})` : ""}`;
    const result = await uploadFilesSequentially(files, { name });
    e.target.value = "";
    if (result.error) toast.error(`${result.uploaded}/${files.length} geüpload: ${result.error}`);
    else toast.success(`${result.uploaded} bestanden geüpload en gesynchroniseerd`);
    if (result.sourceId) router.refresh();
  }

  async function loadAssets(sourceId: string) {
    setLoadingAssets(true);
    try {
      const res = await fetch(`/api/knowledge/${sourceId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bestanden konden niet worden geladen");
      setAssets(data.source.assets ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingAssets(false);
    }
  }

  function showAssets(source: Source) {
    setAssets([]);
    setFilesSource(source);
    void loadAssets(source.id);
  }

  async function addAssets(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const source = filesSource;
    if (!selected.length || !source) return;
    const result = await uploadFilesSequentially(selected, { sourceId: source.id });
    e.target.value = "";
    if (result.error) toast.error(`${result.uploaded}/${selected.length} geüpload: ${result.error}`);
    else toast.success(`${result.uploaded} bestanden toegevoegd en gesynchroniseerd`);
    await loadAssets(source.id);
    router.refresh();
  }

  async function deleteAsset(asset: Asset) {
    const source = filesSource;
    if (!source || !confirm(`Bestand "${asset.filename}" verwijderen?`)) return;
    const res = await fetch(`/api/knowledge/${source.id}/assets/${asset.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (data.ok && data.syncError) {
      toast.warning(`Bestand verwijderd, maar synchroniseren is mislukt: ${data.syncError}`);
    } else if (!res.ok || data.error) {
      toast.error(data.error || "Het bestand kon niet worden verwijderd");
    } else {
      toast.success("Bestand verwijderd");
    }
    await loadAssets(source.id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {canEdit && (
          <>
            <Button onClick={() => { setF(emptyForm()); setCreateFiles([]); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Nieuwe bron
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Upload bestanden
            </Button>
            <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT} multiple className="hidden" onChange={upload} />
            <input ref={assetsFileRef} type="file" accept={UPLOAD_ACCEPT} multiple className="hidden" onChange={addAssets} />
          </>
        )}
      </div>
      {uploadProgress && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          {uploadProgress.done}/{uploadProgress.total} geüpload
        </p>
      )}

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
                  {s.type === "upload" && (
                    <Button variant="outline" size="sm" onClick={() => showAssets(s)}>
                      <FileText className="mr-1 h-3.5 w-3.5" /> Bestanden
                    </Button>
                  )}
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

      <Dialog open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setCreateFiles([]);
          setF(emptyForm());
        }
      }}>
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
                    {CREATE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{TYPE_META[type].label}</SelectItem>
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

            {(f.type === "url" || f.type === "sitemap" || f.type === "google-fonts") && (
              <>
                <div className="space-y-1">
                  <Label>{f.type === "sitemap" ? "Site- of sitemap-URL" : f.type === "google-fonts" ? "Google Fonts-link of familienaam" : "Pagina-URL"}</Label>
                  <Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })}
                    placeholder={f.type === "sitemap" ? "https://fyndable.ai" : f.type === "google-fonts" ? "Outfit of https://fonts.google.com/specimen/Outfit" : "https://…"} />
                </div>
                {f.type === "sitemap" && (
                  <div className="space-y-1">
                    <Label>Max. pagina&apos;s</Label>
                    <Input value={f.maxPages} onChange={(e) => setF({ ...f, maxPages: e.target.value })} />
                  </div>
                )}
              </>
            )}

            {f.type === "upload" && (
              <div className="space-y-1">
                <Label>Bestanden</Label>
                <Input
                  ref={createFileRef}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  multiple
                  onChange={(e) => setCreateFiles(Array.from(e.target.files ?? []))}
                />
                {createFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">{createFiles.length} bestanden geselecteerd</p>
                )}
                {uploadProgress && (
                  <p role="status" className="text-xs text-muted-foreground">
                    {uploadProgress.done}/{uploadProgress.total} geüpload
                  </p>
                )}
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

            {f.type === "git" && (
              <div className="space-y-1">
                <Label>Include globs (komma-gescheiden, leeg = defaults)</Label>
                <Input value={f.include} onChange={(e) => setF({ ...f, include: e.target.value })}
                  placeholder="**/*.md, docs/**, src/**/*.ts" />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button
                onClick={save}
                disabled={uploadProgress !== null || (f.type === "upload" ? !createFiles.length : !f.name)}
              >
                {f.type === "upload" ? "Bestanden uploaden" : "Toevoegen + syncen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!filesSource} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setFilesSource(null);
          setAssets([]);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bestanden{filesSource ? ` — ${filesSource.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{assets.length} bestanden</p>
            <Button
              variant="outline"
              onClick={() => assetsFileRef.current?.click()}
              disabled={uploadProgress !== null}
            >
              <Upload className="mr-1 h-4 w-4" /> Bestanden toevoegen
            </Button>
          </div>
          {uploadProgress && (
            <p role="status" className="mb-3 text-sm text-muted-foreground">
              {uploadProgress.done}/{uploadProgress.total} geüpload
            </p>
          )}
          {loadingAssets ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Bestanden laden…</p>
          ) : assets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Deze bron bevat nog geen bestanden.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assets.filter((asset) => asset.contentType.startsWith("image/")).map((asset) => (
                  <div key={asset.id} className="relative min-w-0 rounded-lg border p-2">
                    <a
                      href={`/api/knowledge/assets/${asset.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/knowledge/assets/${asset.id}`}
                        alt={asset.filename}
                        className="h-40 w-full rounded object-contain"
                      />
                      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground" title={asset.caption || asset.filename}>
                        {asset.caption || asset.filename}
                      </p>
                    </a>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs" title={asset.filename}>{asset.filename}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAsset(asset)}
                        aria-label={`${asset.filename} verwijderen`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {assets.filter((asset) => !asset.contentType.startsWith("image/")).map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm" title={asset.filename}>{asset.filename}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(asset.size)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAsset(asset)}
                      aria-label={`${asset.filename} verwijderen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
