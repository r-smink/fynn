"use client";

import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Bot } from "lucide-react";

type Part = { type: string; state?: string; input?: unknown; text?: string; toolName?: string };

/** Wisselende zinnen zolang er nog niets concreets te melden is (à la Claude). */
const GENERIC_PHASES = [
  "Vraag analyseren",
  "Context verzamelen",
  "Feiten nagaan",
  "Verbanden leggen",
  "Informatie samenvatten",
  "Antwoord formuleren",
];

const FUSION_PHASES = [
  "Sidekick-modellen raadplegen",
  "Perspectieven vergelijken",
  "Inzichten combineren",
  "Antwoord samenstellen",
];

/** Leesbare omschrijving per tool, optioneel met de zoekterm/url uit de input. */
const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  web_search: (i) => `Websites doorzoeken${quote(i.query)}`,
  fetch_url: (i) => `Pagina lezen${quote(host(i.url))}`,
  search_knowledge: (i) => `Kennisbank doorzoeken${quote(i.query)}`,
  generate_image: () => "Afbeelding genereren",
  repo_search: (i) => `Code doorzoeken${quote(i.query)}`,
  repo_file: (i) => `Bestand openen${quote(i.path)}`,
  run_geo_scan: () => "GEO-scan starten",
  geo_scan_status: () => "Status GEO-scan ophalen",
  recent_geo_scans: () => "Recente GEO-scans ophalen",
  list_tenants: () => "Klanten ophalen",
  tenant_detail: () => "Klantgegevens ophalen",
  list_licenses: () => "Licenties ophalen",
  license_stats: () => "Licentiecijfers berekenen",
  revenue_stats: () => "Omzetcijfers berekenen",
  usage_overview: () => "Gebruik analyseren",
  support_tickets: () => "Supporttickets ophalen",
};

function quote(value: unknown) {
  return typeof value === "string" && value.trim() ? `: “${value.trim().slice(0, 60)}”` : "";
}

function host(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function toolName(part: Part) {
  return part.toolName ?? part.type.replace(/^tool-/, "");
}

/** Wat doet het model nu? null = er wordt al tekst gestreamd, indicator niet nodig. */
export function currentActivity(message: UIMessage | undefined, submitted: boolean): string | "generic" | null {
  if (submitted || !message || message.role !== "assistant") return "generic";
  const parts = message.parts as Part[];
  const last = parts[parts.length - 1];
  if (!last) return "generic";
  const isTool = last.type.startsWith("tool-") || last.type === "dynamic-tool";
  if (isTool) {
    if (last.state === "output-available" || last.state === "output-error") return "Resultaten verwerken";
    const label = TOOL_LABELS[toolName(last)];
    return label ? label((last.input ?? {}) as Record<string, unknown>) : `${toolName(last)} uitvoeren`;
  }
  if (last.type === "reasoning") {
    // Laatste regel van de redenering als live "waar is hij mee bezig"
    const line = (last.text ?? "").split("\n").map((l) => l.replace(/[*#_`>]/g, "").trim()).filter(Boolean).pop();
    return line ? `Nadenken: ${line.slice(0, 90).replace(/[.…:]+$/, "")}` : "Nadenken";
  }
  if (last.type === "step-start") return "generic";
  return null;
}

export function ThinkingIndicator({ activity, fusion }: { activity: string; fusion?: boolean }) {
  const phases = fusion ? FUSION_PHASES : GENERIC_PHASES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (activity !== "generic") return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % phases.length), 2400);
    return () => window.clearInterval(timer);
  }, [activity, phases.length]);

  const text = activity === "generic" ? phases[index % phases.length] : activity;

  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Bot className="h-4 w-4 animate-pulse" />
      </div>
      <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <span className="flex gap-0.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </span>
        <span key={text} className="truncate animate-in fade-in slide-in-from-bottom-1 duration-300">
          {text}…
        </span>
      </div>
    </div>
  );
}
