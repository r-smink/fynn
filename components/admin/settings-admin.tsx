"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type Props = {
  modelCount: number; chunkCount: number; sourceCount: number;
  openRouterConfigured: boolean; portalConfigured: boolean;
  imageModel: string; embeddingModel: string;
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
  const router = useRouter();

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
        <Row label="OpenRouter" ok={p.openRouterConfigured} hint="OPENROUTER_API_KEY in .env" />
        <Row label="Fyndable portal API" ok={p.portalConfigured} hint="FYNDABLE_WP_USER + FYNDABLE_WP_APP_PASSWORD (WP Application Password)" />
        <Row label="Image model" ok={!!p.imageModel} hint={p.imageModel} />
        <Row label="Embedding model" ok={!!p.embeddingModel} hint={p.embeddingModel} />
        <p className="mt-2 text-xs text-muted-foreground">
          Secrets worden server-side uit .env gelezen — nooit naar de client.
        </p>
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
