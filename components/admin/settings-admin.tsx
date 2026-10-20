"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DefaultTheme } from "@/lib/branding";
import { toast } from "sonner";

type Props = {
  modelCount: number; chunkCount: number; sourceCount: number;
  openRouterConfigured: boolean; portalConfigured: boolean;
  imageModel: string; imageModelIsDefault: boolean;
  embeddingModel: string; embeddingModelIsDefault: boolean;
  branding: { logoLight: string; logoDark: string; defaultTheme: DefaultTheme };
};

function Row({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      {ok ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-destructive" />}
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{hint}</span>
    </div>
  );
}

export function SettingsAdmin(p: Props) {
  const [syncing, setSyncing] = useState(false);
  const [defaultTheme, setDefaultTheme] = useState(p.branding.defaultTheme);
  const lightFileRef = useRef<HTMLInputElement>(null);
  const darkFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadLogo(variant: "light" | "dark", file?: File) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("variant", variant);
    const res = await fetch("/api/settings/logo", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Logo uploaden is mislukt");
      return;
    }
    toast.success("Logo opgeslagen");
    router.refresh();
  }

  async function restoreLogo(variant: "light" | "dark") {
    const res = await fetch(`/api/settings/logo?variant=${variant}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Logo herstellen is mislukt");
      return;
    }
    toast.success("Standaardlogo hersteld");
    router.refresh();
  }

  async function saveTheme(value: string | null) {
    if (value !== "light" && value !== "dark" && value !== "system") return;
    setDefaultTheme(value);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultTheme: value }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Standaardthema opslaan is mislukt");
      setDefaultTheme(p.branding.defaultTheme);
      return;
    }
    toast.success("Standaardthema opgeslagen");
    router.refresh();
  }

  async function syncModels() {
    setSyncing(true);
    const res = await fetch("/api/models", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (data.error) toast.error(data.error);
    else toast.success(`${data.count} modellen gesynced`);
    router.refresh();
  }

  return (
    <div className="grid max-w-2xl gap-4">
      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Configuratie</h2>
        <Row label="OpenRouter" ok={p.openRouterConfigured} hint="OPENROUTER_API_KEY · Vercel → Environment Variables" />
        <Row label="Fyndable portal API" ok={p.portalConfigured} hint="FYNDABLE_WP_USER + FYNDABLE_WP_APP_PASSWORD · Vercel → Environment Variables" />
        <Row label="Image model" ok hint={`${p.imageModel}${p.imageModelIsDefault ? " (standaard)" : ""}`} />
        <Row label="Embedding model" ok hint={`${p.embeddingModel}${p.embeddingModelIsDefault ? " (standaard)" : ""}`} />
        <p className="mt-2 text-xs text-muted-foreground">
          Secrets staan in de environment variables (Vercel) en gaan nooit naar de browser.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Branding &amp; thema</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            { variant: "light", label: "Licht logo", src: p.branding.logoLight, ref: lightFileRef, preview: "bg-white" },
            { variant: "dark", label: "Donker logo", src: p.branding.logoDark, ref: darkFileRef, preview: "bg-[#132A38]" },
          ] as const).map(({ variant, label, src, ref, preview }) => (
            <div key={variant} className="space-y-2">
              <p className="text-sm font-medium">{label}</p>
              <div className={`flex h-20 items-center justify-center rounded-md p-3 ${preview}`}>
                <Image src={src} alt={label} width={1024} height={176} unoptimized className="max-h-14 max-w-full object-contain" />
              </div>
              <Input
                ref={ref}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  void uploadLogo(variant, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => ref.current?.click()}>Upload</Button>
                <Button variant="ghost" size="sm" onClick={() => void restoreLogo(variant)}>Standaard herstellen</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 max-w-xs space-y-2">
          <label className="text-sm font-medium">Standaardthema</label>
          <Select value={defaultTheme} onValueChange={(value) => void saveTheme(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kies een thema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Licht</SelectItem>
              <SelectItem value="dark">Donker</SelectItem>
              <SelectItem value="system">Systeem</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">OpenRouter model-catalogus</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {p.modelCount} modellen in cache. Ververs om nieuwe modellen en prijzen op te halen.
        </p>
        <Button onClick={syncModels} disabled={syncing}>
          <RefreshCw className={`mr-1 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Ververs catalogus
        </Button>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Kennisbank</h2>
        <p className="text-sm text-muted-foreground">
          {p.sourceCount} bronnen · {p.chunkCount.toLocaleString("nl-NL")} chunks geïndexeerd
        </p>
      </Card>
    </div>
  );
}
