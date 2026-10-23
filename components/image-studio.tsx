"use client";

import { useState } from "react";
import {
  Check, Download, ImagePlus, Loader2, Plus, RotateCcw, Sparkles, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  createdAt: string;
};

type ReferenceAsset = {
  id: string;
  filename: string;
  caption: string;
  editPolicy: string;
  source: { name: string };
};

/** Alleen modellen die afbeeldingen kunnen maken (output-modality bevat image). */
const isImageModel = (m: Model) => (m.modality.split("->")[1] ?? "").includes("image");

export function ImageStudio({
  customStyles: initialCustomStyles, initialImages, defaultModel, isAdmin,
}: {
  customStyles: ImageStylePreset[];
  initialImages: GeneratedImage[];
  defaultModel: string;
  isAdmin: boolean;
}) {
  const [customStyles, setCustomStyles] = useState(initialCustomStyles);
  const [images, setImages] = useState(initialImages);
  const [prompt, setPrompt] = useState("");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [model, setModel] = useState(defaultModel);
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [pending, setPending] = useState(0);

  const [styleOpen, setStyleOpen] = useState(false);
  const [styleForm, setStyleForm] = useState({ name: "", emoji: "🎨", prompt: "" });
  const [refOpen, setRefOpen] = useState(false);
  const [refAssets, setRefAssets] = useState<ReferenceAsset[] | null>(null);
  const [preview, setPreview] = useState<GeneratedImage | null>(null);

  const allStyles = [...BUILTIN_IMAGE_STYLES, ...customStyles];
  const activeStyle = allStyles.find((s) => s.id === styleId);

  async function generate() {
    const text = prompt.trim();
    if (!text) return;
    setPending((n) => n + 1);
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text, styleId, model, aspectRatio,
          referenceAssetIds: references.map((r) => r.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Genereren mislukt");
      setImages((list) => [{ ...data.image, createdAt: String(data.image.createdAt) }, ...list]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Genereren mislukt");
    } finally {
      setPending((n) => n - 1);
    }
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
    setImages((list) => list.filter((i) => i.id !== image.id));
    setPreview(null);
  }

  function reuse(image: GeneratedImage) {
    setPrompt(image.prompt);
    setStyleId(allStyles.find((s) => s.name === image.style)?.id ?? null);
    if (image.aspectRatio) setAspectRatio(image.aspectRatio);
    setPreview(null);
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
          <Button className="ml-auto" onClick={generate} disabled={!prompt.trim()}>
            {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Genereer
          </Button>
        </div>
        {activeStyle && (
          <p className="text-xs text-muted-foreground">
            Stijl: {activeStyle.emoji} {activeStyle.name}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Jouw afbeeldingen</h2>
        {!images.length && !pending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nog geen afbeeldingen gemaakt.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: pending }).map((_, i) => (
              <div key={`pending-${i}`} className="flex aspect-square items-center justify-center rounded-lg border bg-muted/40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ))}
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => setPreview(image)}
                className="group relative overflow-hidden rounded-lg border text-left"
                title={image.prompt}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.prompt} className="aspect-square w-full object-cover transition group-hover:scale-105" />
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
              <div className="flex flex-wrap gap-2">
                <a href={preview.url} download className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Download className="mr-1 h-4 w-4" /> Download
                </a>
                <Button variant="outline" size="sm" onClick={() => reuse(preview)}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Prompt hergebruiken
                </Button>
                <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => deleteImage(preview)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Verwijderen
                </Button>
              </div>
            </>
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
