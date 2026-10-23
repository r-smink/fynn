"use client";

import { useRef, useState } from "react";
import {
  Check, ChevronRight, Download, Folder, FolderPlus, ImagePlus, Loader2, Pencil, Plus,
  RotateCcw, Sparkles, Square, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelPicker, type Model } from "@/components/chat/model-picker";
import {
  ASPECT_RATIOS, BUILTIN_IMAGE_STYLES, EDIT_POLICIES, isEditPolicy, type ImageStylePreset,
} from "@/lib/image-styles";
import { cn } from "@/lib/utils";

type GeneratedImage = {
  id: string;
  prompt: string;
  style: string;
  model: string;
  aspectRatio: string;
  url: string;
  folderId: string | null;
  createdAt: string;
};

type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  brandId: string | null;
  brand: { name: string } | null;
  _count: { images: number; children: number };
};

export type LibraryState = {
  folderId: string | null;
  path: { id: string; name: string }[];
  folders: FolderItem[];
  images: GeneratedImage[];
};

type ReferenceAsset = {
  id: string;
  filename: string;
  caption: string;
  editPolicy: string;
  source: { name: string };
};

type PendingJob = { id: number; folderId: string | null; controller: AbortController };

/** Alleen modellen die afbeeldingen kunnen maken (output-modality bevat image). */
const isImageModel = (m: Model) => (m.modality.split("->")[1] ?? "").includes("image");

const ROOT = "__root__";

export function ImageStudio({
  customStyles: initialCustomStyles, initialLibrary, defaultModel, isAdmin, brands,
}: {
  customStyles: ImageStylePreset[];
  initialLibrary: LibraryState;
  defaultModel: string;
  isAdmin: boolean;
  brands: { id: string; name: string }[];
}) {
  const [customStyles, setCustomStyles] = useState(initialCustomStyles);
  const [library, setLibrary] = useState(initialLibrary);
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [model, setModel] = useState(defaultModel);
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [jobs, setJobs] = useState<PendingJob[]>([]);
  const jobSeq = useRef(0);
  // Actuele map voor async callbacks (resultaat alleen tonen als je nog in dezelfde map zit)
  const currentFolder = useRef(initialLibrary.folderId);

  const [styleOpen, setStyleOpen] = useState(false);
  const [styleForm, setStyleForm] = useState({ name: "", emoji: "🎨", prompt: "" });
  const [refOpen, setRefOpen] = useState(false);
  const [refAssets, setRefAssets] = useState<ReferenceAsset[] | null>(null);
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  const [allFolders, setAllFolders] = useState<{ id: string; label: string }[] | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ id?: string; name: string; brandId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const allStyles = [...BUILTIN_IMAGE_STYLES, ...customStyles];
  const activeStyle = allStyles.find((s) => s.id === styleId);
  const visibleJobs = jobs.filter((j) => j.folderId === library.folderId);

  async function openFolder(folderId: string | null) {
    setLoadingFolder(true);
    try {
      const res = await fetch(`/api/images${folderId ? `?folderId=${folderId}` : ""}`);
      if (!res.ok) throw new Error((await res.json()).error || "Map laden mislukt");
      const view = (await res.json()) as LibraryState;
      currentFolder.current = view.folderId;
      setLibrary(view);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Map laden mislukt");
    } finally {
      setLoadingFolder(false);
    }
  }

  async function generate() {
    const text = prompt.trim();
    if (!text) return;
    const job: PendingJob = { id: ++jobSeq.current, folderId: library.folderId, controller: new AbortController() };
    setJobs((list) => [...list, job]);
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: job.controller.signal,
        body: JSON.stringify({
          prompt: text, styleId, model, aspectRatio, folderId: job.folderId,
          referenceAssetIds: references.map((r) => r.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Genereren mislukt");
      if (currentFolder.current === job.folderId) {
        setLibrary((view) => ({ ...view, images: [{ ...data.image, createdAt: String(data.image.createdAt) }, ...view.images] }));
      } else {
        toast.success("Afbeelding klaar", { description: "Opgeslagen in de map waar je hem startte." });
      }
    } catch (e) {
      if (job.controller.signal.aborted) toast("Genereren gestopt");
      else toast.error(e instanceof Error ? e.message : "Genereren mislukt");
    } finally {
      setJobs((list) => list.filter((j) => j.id !== job.id));
    }
  }

  function stopJobs(target?: PendingJob) {
    for (const job of target ? [target] : jobs) job.controller.abort();
  }

  async function openReferences() {
    setRefOpen(true);
    if (refAssets) return;
    const res = await fetch("/api/images/references");
    setRefAssets(res.ok ? (await res.json()).assets : []);
  }

  function toggleReference(asset: ReferenceAsset) {
    if (references.some((r) => r.id === asset.id)) {
      setReferences(references.filter((r) => r.id !== asset.id));
    } else if (references.length >= 4) {
      toast.error("Maximaal 4 referenties");
    } else {
      setReferences([...references, asset]);
    }
  }

  async function saveStyle() {
    const res = await fetch("/api/image-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(styleForm),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Opslaan mislukt");
    const { id, name, emoji, prompt: stylePrompt } = data.style;
    setCustomStyles((list) => [...list, { id, name, emoji, prompt: stylePrompt }]);
    setStyleId(id);
    setStyleOpen(false);
    setStyleForm({ name: "", emoji: "🎨", prompt: "" });
  }

  async function deleteStyle(style: ImageStylePreset) {
    if (!confirm(`Stijl "${style.name}" verwijderen?`)) return;
    const res = await fetch(`/api/image-styles/${style.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Verwijderen mislukt");
    setCustomStyles((list) => list.filter((s) => s.id !== style.id));
    if (styleId === style.id) setStyleId(null);
  }

  async function deleteImage(image: GeneratedImage) {
    if (!confirm("Afbeelding verwijderen?")) return;
    const res = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Verwijderen mislukt");
    setLibrary((view) => ({ ...view, images: view.images.filter((i) => i.id !== image.id) }));
    setPreview(null);
  }

  async function moveImage(imageId: string, folderId: string | null) {
    const res = await fetch(`/api/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    if (!res.ok) return toast.error("Verplaatsen mislukt");
    if (folderId === library.folderId) return;
    setLibrary((view) => ({
      ...view,
      images: view.images.filter((i) => i.id !== imageId),
      folders: view.folders.map((f) =>
        f.id === folderId ? { ...f, _count: { ...f._count, images: f._count.images + 1 } } : f,
      ),
    }));
    setPreview(null);
    toast.success("Afbeelding verplaatst");
  }

  async function loadAllFolders() {
    if (allFolders) return;
    const res = await fetch("/api/image-folders");
    if (!res.ok) return;
    const { folders } = (await res.json()) as { folders: { id: string; name: string; parentId: string | null }[] };
    const byId = new Map(folders.map((f) => [f.id, f]));
    const label = (f: { name: string; parentId: string | null }): string => {
      const parent = f.parentId ? byId.get(f.parentId) : undefined;
      return parent ? `${label(parent)} / ${f.name}` : f.name;
    };
    setAllFolders(folders.map((f) => ({ id: f.id, label: label(f) })).sort((a, b) => a.label.localeCompare(b.label)));
  }

  async function saveFolder() {
    if (!folderDialog?.name.trim()) return;
    const editing = folderDialog.id;
    const res = await fetch(editing ? `/api/image-folders/${editing}` : "/api/image-folders", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: folderDialog.name,
        parentId: library.folderId,
        brandId: folderDialog.brandId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Opslaan mislukt");
    setFolderDialog(null);
    setAllFolders(null);
    await openFolder(library.folderId);
  }

  async function deleteFolder(folder: FolderItem) {
    if (!confirm(`Map "${folder.name}" verwijderen? De afbeeldingen en submappen gaan één niveau omhoog.`)) return;
    const res = await fetch(`/api/image-folders/${folder.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Verwijderen mislukt");
    setAllFolders(null);
    await openFolder(library.folderId);
  }

  function reuse(image: GeneratedImage) {
    setPrompt(image.prompt);
    setStyleId(allStyles.find((s) => s.name === image.style)?.id ?? null);
    if (image.aspectRatio) setAspectRatio(image.aspectRatio);
    setPreview(null);
  }

  function dropProps(folderId: string | null) {
    const key = folderId ?? ROOT;
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes("application/x-fynn-image")) return;
        e.preventDefault();
        setDropTarget(key);
      },
      onDragLeave: () => setDropTarget((t) => (t === key ? null : t)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDropTarget(null);
        const imageId = e.dataTransfer.getData("application/x-fynn-image");
        if (imageId) void moveImage(imageId, folderId);
      },
    };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Stijl</h2>
          <Button variant="ghost" size="sm" onClick={() => setStyleOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Eigen stijl
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          <StyleTile emoji="✨" name="Geen stijl" active={!styleId} onClick={() => setStyleId(null)} />
          {allStyles.map((s) => (
            <StyleTile
              key={s.id}
              emoji={s.emoji}
              name={s.name}
              title={s.prompt}
              active={styleId === s.id}
              onClick={() => setStyleId(s.id)}
              onDelete={s.id.startsWith("builtin:") ? undefined : () => deleteStyle(s)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-3 sm:p-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              generate();
            }
          }}
          placeholder="Beschrijf je afbeelding… bijv. Fynn de robot zwaait vanaf een bureau in een zonnig kantoor"
          className="min-h-24 resize-none border-0 p-1 shadow-none focus-visible:ring-0"
        />

        {references.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {references.map((r) => (
              <div key={r.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/knowledge/assets/${r.id}`}
                  alt={r.filename}
                  className="h-16 w-16 rounded-md border object-cover"
                />
                <PolicyBadge policy={r.editPolicy} className="absolute bottom-0.5 left-0.5" />
                <button
                  onClick={() => toggleReference(r)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground p-0.5 text-background"
                  aria-label={`${r.filename} verwijderen`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openReferences}>
            <ImagePlus className="mr-1 h-4 w-4" /> Referentie
          </Button>
          <div className="flex flex-wrap rounded-md border p-0.5">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r}
                onClick={() => setAspectRatio(r)}
                className={cn(
                  "rounded px-2 py-1 text-xs text-muted-foreground",
                  aspectRatio === r && "bg-accent font-medium text-accent-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <ModelPicker
            value={model}
            onChange={setModel}
            isAdmin={isAdmin}
            includeFusions={false}
            filter={isImageModel}
            triggerClassName="max-w-[220px]"
          />
          <div className="ml-auto flex gap-2">
            {jobs.length > 0 && (
              <Button variant="outline" onClick={() => stopJobs()} title="Stop alle lopende generaties">
                <Square className="mr-1 h-4 w-4" /> Stop{jobs.length > 1 ? ` (${jobs.length})` : ""}
              </Button>
            )}
            <Button onClick={generate} disabled={!prompt.trim()}>
              {jobs.length ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              Genereer
            </Button>
          </div>
        </div>
        {(activeStyle || library.path.length > 0) && (
          <p className="text-xs text-muted-foreground">
            {activeStyle && <>Stijl: {activeStyle.emoji} {activeStyle.name}</>}
            {activeStyle && library.path.length > 0 && " · "}
            {library.path.length > 0 && <>Opslaan in: {library.path.map((p) => p.name).join(" / ")}</>}
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Mappen">
            <button
              onClick={() => openFolder(null)}
              className={cn(
                "rounded px-1.5 py-0.5 font-semibold hover:bg-accent",
                dropTarget === ROOT && "bg-primary/15 ring-1 ring-primary",
              )}
              {...dropProps(null)}
            >
              Beeldbank
            </button>
            {library.path.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <button
                  onClick={() => openFolder(p.id)}
                  className={cn(
                    "rounded px-1.5 py-0.5 hover:bg-accent",
                    i === library.path.length - 1 && "font-semibold",
                    dropTarget === p.id && "bg-primary/15 ring-1 ring-primary",
                  )}
                  {...(i < library.path.length - 1 ? dropProps(p.id) : {})}
                >
                  {p.name}
                </button>
              </span>
            ))}
            {loadingFolder && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </nav>
          <Button variant="outline" size="sm" onClick={() => setFolderDialog({ name: "", brandId: "" })}>
            <FolderPlus className="mr-1 h-4 w-4" /> Nieuwe map
          </Button>
        </div>

        {library.folders.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {library.folders.map((folder) => (
              <div
                key={folder.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border p-2 hover:bg-accent",
                  dropTarget === folder.id && "border-primary bg-primary/10 ring-1 ring-primary",
                )}
                {...dropProps(folder.id)}
              >
                <button onClick={() => openFolder(folder.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <Folder className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{folder.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {folder._count.images} beeld{folder._count.images === 1 ? "" : "en"}
                      {folder._count.children > 0 && ` · ${folder._count.children} map${folder._count.children === 1 ? "" : "pen"}`}
                      {folder.brand && ` · ${folder.brand.name}`}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7" title="Hernoemen"
                    onClick={() => setFolderDialog({ id: folder.id, name: folder.name, brandId: folder.brandId ?? "" })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Verwijderen" onClick={() => deleteFolder(folder)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!library.images.length && !visibleJobs.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {library.folderId ? "Deze map is nog leeg. Genereer hier een beeld of sleep er een naartoe." : "Nog geen losse afbeeldingen."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleJobs.map((job) => (
              <div key={job.id} className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border bg-muted/40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <Button variant="outline" size="sm" onClick={() => stopJobs(job)}>
                  <Square className="mr-1 h-3.5 w-3.5" /> Stop
                </Button>
              </div>
            ))}
            {library.images.map((image) => (
              <button
                key={image.id}
                onClick={() => { setPreview(image); void loadAllFolders(); }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-fynn-image", image.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="group relative overflow-hidden rounded-lg border text-left"
                title={image.prompt}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.prompt}
                  draggable={false}
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                />
                {image.style && (
                  <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px]">{image.style}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="line-clamp-2 pr-6 text-base">{preview?.prompt}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.prompt} className="max-h-[60vh] w-full rounded-lg object-contain" />
              <p className="text-xs text-muted-foreground">
                {[preview.style, preview.aspectRatio, preview.model].filter(Boolean).join(" · ")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a href={preview.url} download className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Download className="mr-1 h-4 w-4" /> Download
                </a>
                <Button variant="outline" size="sm" onClick={() => reuse(preview)}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Prompt hergebruiken
                </Button>
                <Select
                  value={preview.folderId ?? ROOT}
                  onValueChange={(v) => v && void moveImage(preview.id, v === ROOT ? null : v)}
                >
                  <SelectTrigger size="sm" className="w-auto min-w-40 text-xs">
                    <SelectValue>
                      {(v: string) => (v === ROOT
                        ? "Map: Beeldbank"
                        : `Map: ${allFolders?.find((f) => f.id === v)?.label ?? library.path.at(-1)?.name ?? "…"}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT}>Beeldbank (geen map)</SelectItem>
                    {allFolders?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => deleteImage(preview)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Verwijderen
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!folderDialog} onOpenChange={(o) => !o && setFolderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{folderDialog?.id ? "Map hernoemen" : "Nieuwe map"}</DialogTitle>
          </DialogHeader>
          {folderDialog && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Naam</Label>
                <Input
                  autoFocus
                  value={folderDialog.name}
                  onChange={(e) => setFolderDialog({ ...folderDialog, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && saveFolder()}
                  placeholder="bijv. LinkedIn Q4"
                />
              </div>
              {!folderDialog.id && !library.folderId && isAdmin && brands.length > 0 && (
                <div className="space-y-1">
                  <Label>Brand</Label>
                  <Select
                    value={folderDialog.brandId || "none"}
                    onValueChange={(v) => setFolderDialog({ ...folderDialog, brandId: !v || v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) => (v === "none" ? "Geen brand (alleen jij)" : brands.find((b) => b.id === v)?.name ?? v)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen brand (alleen jij)</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Leden van de brand zien deze map en alles erin.</p>
                </div>
              )}
              {!folderDialog.id && library.folderId && (
                <p className="text-xs text-muted-foreground">
                  Submap van {library.path.at(-1)?.name}; hoort bij dezelfde brand.
                </p>
              )}
              <Button onClick={saveFolder} disabled={!folderDialog.name.trim()} className="w-full">
                Opslaan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={styleOpen} onOpenChange={setStyleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eigen stijl</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-16 space-y-1">
                <Label>Icoon</Label>
                <Input value={styleForm.emoji} onChange={(e) => setStyleForm({ ...styleForm, emoji: e.target.value })} />
              </div>
              <div className="flex-1 space-y-1">
                <Label>Naam</Label>
                <Input
                  value={styleForm.name}
                  onChange={(e) => setStyleForm({ ...styleForm, name: e.target.value })}
                  placeholder="bijv. Fyndable huisstijl"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Stijlomschrijving</Label>
              <Textarea
                value={styleForm.prompt}
                onChange={(e) => setStyleForm({ ...styleForm, prompt: e.target.value })}
                placeholder="bijv. soft gradient background in purple and teal, friendly 3D characters, clean modern look"
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">Wordt aan elke prompt toegevoegd. Engels werkt het best.</p>
            </div>
            <Button onClick={saveStyle} disabled={!styleForm.name.trim() || !styleForm.prompt.trim()} className="w-full">
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={refOpen} onOpenChange={setRefOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Referenties uit de kennisbank ({references.length}/4)</DialogTitle>
          </DialogHeader>
          {!refAssets ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Laden…</p>
          ) : !refAssets.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nog geen afbeeldingen in de kennisbank. Voeg ze toe via een upload-bron.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {refAssets.map((asset) => {
                const selected = references.some((r) => r.id === asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleReference(asset)}
                    className={cn(
                      "relative rounded-lg border p-1.5 text-left",
                      selected && "border-primary ring-2 ring-primary",
                    )}
                    title={asset.caption || asset.filename}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/knowledge/assets/${asset.id}`}
                      alt={asset.filename}
                      className="aspect-square w-full rounded object-contain"
                    />
                    <span className="mt-1 block truncate text-xs">{asset.filename}</span>
                    <PolicyBadge policy={asset.editPolicy} className="absolute top-2 left-2" />
                    {selected && (
                      <Check className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <Button onClick={() => setRefOpen(false)}>Klaar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StyleTile({
  emoji, name, title, active, onClick, onDelete,
}: {
  emoji: string;
  name: string;
  title?: string;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        title={title}
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-lg border p-2 text-center transition hover:bg-accent",
          active && "border-primary bg-accent ring-1 ring-primary",
        )}
      >
        <span className="text-2xl leading-none">{emoji}</span>
        <span className="line-clamp-1 text-xs">{name}</span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground p-0.5 text-background opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`${name} verwijderen`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function PolicyBadge({ policy, className }: { policy: string; className?: string }) {
  if (!isEditPolicy(policy) || policy === "free") return null;
  return (
    <Badge variant={policy === "locked" ? "destructive" : "secondary"} className={cn("px-1 py-0 text-[10px]", className)}>
      {EDIT_POLICIES[policy].label}
    </Badge>
  );
}
