import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export function openrouter() {
  return createOpenRouter({
    apiKey: env.openRouterKey,
    headers: {
      "HTTP-Referer": "https://fynn.fyndable.ai",
      "X-Title": "FYNN",
    },
  });
}

export function chatModel(modelId: string) {
  return openrouter().chat(modelId);
}

type OpenRouterModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string };
};

/** Sync the model catalog from OpenRouter /api/v1/models (public endpoint). */
export async function syncModelCatalog(): Promise<number> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
  const json = (await res.json()) as { data?: OpenRouterModel[] };
  const models = json.data ?? [];

  for (const m of models) {
    const provider = m.id.split("/")[0] ?? "";
    await db.modelEntry.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        name: m.name ?? m.id,
        provider,
        contextLength: m.context_length ?? 0,
        promptPrice: Number(m.pricing?.prompt ?? 0) * 1_000_000,
        completionPrice: Number(m.pricing?.completion ?? 0) * 1_000_000,
        modality: m.architecture?.modality ?? "",
        description: (m.description ?? "").slice(0, 500),
      },
      update: {
        name: m.name ?? m.id,
        provider,
        contextLength: m.context_length ?? 0,
        promptPrice: Number(m.pricing?.prompt ?? 0) * 1_000_000,
        completionPrice: Number(m.pricing?.completion ?? 0) * 1_000_000,
        modality: m.architecture?.modality ?? "",
        description: (m.description ?? "").slice(0, 500),
      },
    });
  }
  return models.length;
}

/** Estimated USD cost for a model+usage pair. */
export async function estimateCost(modelId: string, promptTokens: number, completionTokens: number) {
  const m = await db.modelEntry.findUnique({ where: { id: modelId } });
  if (!m) return 0;
  return (promptTokens * m.promptPrice + completionTokens * m.completionPrice) / 1_000_000;
}
