import { generateText, hasToolCall, stepCountIs, tool, type ImagePart, type TextPart } from "ai";
import { z } from "zod";
import type { Brand } from "@/generated/prisma/client";
import { brandBlock } from "@/lib/agents";
import { chatModel } from "@/lib/openrouter";
import { env } from "@/lib/env";
import { knowledgeTools } from "@/lib/tools/knowledge";
import { db } from "@/lib/db";
import { referenceSourceWhere } from "@/lib/scope";

export const imageAgentSelect = {
  id: true, name: true, emoji: true, instructions: true, brandId: true, userId: true,
  sources: { select: { id: true, name: true } },
} as const;

/** Alleen kennisbronnen waar de gebruiker zelf bij mag, mogen aan een beeld-agent gekoppeld worden. */
export async function allowedSourceIds(user: { id: string; role: string }, ids: unknown): Promise<string[]> {
  if (!Array.isArray(ids) || !ids.length) return [];
  const sources = await db.knowledgeSource.findMany({
    where: { AND: [{ id: { in: ids.filter((id): id is string => typeof id === "string") } }, await referenceSourceWhere(user)] },
    select: { id: true },
  });
  return sources.map((s) => s.id);
}

export type ImageBrief = {
  prompt: string;
  referenceAssetIds: string[];
  notes: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
};

const mediaTypeOf = (name: string) =>
  /\.jpe?g$/i.test(name) ? "image/jpeg" : /\.webp$/i.test(name) ? "image/webp" : "image/png";

/**
 * Laat een beeld-agent de opdracht uitwerken vóór de generatie: hij bekijkt de meegestuurde beelden,
 * doorzoekt de kennisbank (beperkt tot `sourceIds`) en levert een Engelse beeldprompt plus
 * de kennisbank-afbeeldingen die als merk-referentie mee moeten.
 */
export async function planImage(opts: {
  agent: { name: string; instructions: string; brand?: Brand | null };
  prompt: string;
  sourceIds: string[];
  /** Meegestuurde beelden (uploads/doorprompt-basis + gekozen kennisbank-referenties). */
  images: { bytes: Uint8Array; name: string; role: string }[];
  /** Hoeveel kennisbank-referenties de agent nog mag toevoegen. */
  room: number;
  abortSignal?: AbortSignal;
}): Promise<ImageBrief> {
  const model = env.imageAgentModel;
  const system = [
    `Je bent ${opts.agent.name}, een beeld-agent in de beeldstudio van FYNN. Je bereidt een opdracht voor een beeldgeneratiemodel voor.`,
    opts.agent.brand ? brandBlock(opts.agent.brand) : "",
    opts.agent.instructions ? `\n## Instructies\n${opts.agent.instructions}` : "",
    "",
    "## Werkwijze",
    "1. Bekijk de meegestuurde afbeeldingen en de opdracht van de gebruiker.",
    "2. Zoek met search_knowledge naar relevante huisstijl, brand-info, personages/mascottes, producten en beeldmateriaal.",
    `3. Roep tot slot ALTIJD create_image_brief aan met een gedetailleerde Engelse prompt. Je mag maximaal ${opts.room} assetId's uit de zoekresultaten als referentie meegeven${opts.room ? "" : " (nu dus geen)"}.`,
    "- De meegestuurde afbeeldingen gaan automatisch mee naar het beeldmodel; verwijs ernaar als 'the input image(s)'.",
    "- Afbeeldingen met editPolicy 'locked' mogen niet herontworpen worden: beschrijf alleen de scène eromheen.",
    "- Verwerk kleuren, stijl en tone uit de kennisbank concreet in de prompt (bijv. hex-kleuren, sfeer, compositie).",
  ].join("\n");

  const content: (TextPart | ImagePart)[] = [{ type: "text", text: `Opdracht: ${opts.prompt}` }];
  opts.images.forEach((img, i) => {
    content.push({ type: "text", text: `Afbeelding ${i + 1} ("${img.name}"): ${img.role}` });
    content.push({ type: "image", image: img.bytes, mediaType: mediaTypeOf(img.name) });
  });

  const tools = {
    ...knowledgeTools(opts.sourceIds),
    // Zonder execute → de loop stopt zodra de agent zijn brief aflevert
    create_image_brief: tool({
      description: "Lever de uiteindelijke opdracht voor het beeldmodel af.",
      inputSchema: z.object({
        prompt: z.string().describe("gedetailleerde Engelse beeldprompt"),
        referenceAssetIds: z.array(z.string()).default([])
          .describe("assetId's van kennisbank-afbeeldingen (uit search_knowledge) die als referentie mee moeten"),
        notes: z.string().default("").describe("één korte Nederlandse zin: wat je uit de kennisbank hebt gebruikt"),
      }),
    }),
  };

  const result = await generateText({
    model: chatModel(model),
    system,
    messages: [{ role: "user", content }],
    tools,
    stopWhen: [hasToolCall("create_image_brief"), stepCountIs(6)],
    abortSignal: opts.abortSignal,
  });

  const call = result.steps.flatMap((s) => s.toolCalls).find((c) => c.toolName === "create_image_brief");
  const brief = call?.input as { prompt?: string; referenceAssetIds?: string[]; notes?: string } | undefined;
  return {
    // Geen brief afgeleverd → val terug op de eigen tekst van de agent, anders op de originele prompt
    prompt: brief?.prompt?.trim() || result.text.trim() || opts.prompt,
    referenceAssetIds: (brief?.referenceAssetIds ?? []).slice(0, opts.room),
    notes: brief?.notes ?? "",
    model,
    usage: result.totalUsage,
  };
}
