import { convertToModelMessages, generateText, type UIMessage } from "ai";
import type { FusionTemplate } from "@/generated/prisma/client";
import { chatModel, openrouter } from "@/lib/openrouter";
import { logUsage } from "@/lib/usage";

export const EFFORT_LEVELS = ["minimal", "low", "medium", "high", "xhigh"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export const FUSION_PREFIX = "fusion:";
export const fusionModelId = (id: string) => `${FUSION_PREFIX}${id}`;
export const isFusionModel = (model: string) => model.startsWith(FUSION_PREFIX);
export const fusionIdFromModel = (model: string) => model.slice(FUSION_PREFIX.length);

const SIDEKICK_SYSTEM = `Je bent een sidekick-model in een multi-model team. Het hoofdmodel schrijft het uiteindelijke antwoord voor de gebruiker; jij levert alleen achtergrondinput.
Geef compact (max. 250 woorden): relevante feiten, invalshoeken die het hoofdmodel niet mag missen, en eventuele valkuilen. Schrijf GEEN kant-en-klaar eindantwoord en herhaal de vraag niet.`;

/**
 * Laat de sidekick-modellen input leveren voor het hoofdmodel. Sidekick-fouten
 * blokkeren het gesprek niet — ze leveren dan gewoon geen input.
 * Geeft de samengevoegde inzichten terug om aan de system prompt toe te voegen.
 */
export async function runSidekicks(opts: {
  fusion: FusionTemplate;
  uiMessages: UIMessage[];
  userId: string;
  conversationId: string;
}): Promise<string> {
  const sidekicks = [opts.fusion.sidekick1, opts.fusion.sidekick2].filter((s) => s.trim());
  if (!sidekicks.length) return "";

  const messages = await convertToModelMessages(opts.uiMessages);
  const results = await Promise.allSettled(
    sidekicks.map(async (model) => {
      const res = await generateText({ model: chatModel(model), system: SIDEKICK_SYSTEM, messages });
      await logUsage({
        userId: opts.userId,
        conversationId: opts.conversationId,
        model,
        promptTokens: res.usage?.inputTokens ?? 0,
        completionTokens: res.usage?.outputTokens ?? 0,
      });
      return { model, text: res.text.trim() };
    })
  );

  const notes = results
    .map((r) => (r.status === "fulfilled" && r.value.text ? r.value : null))
    .filter((r): r is { model: string; text: string } => r !== null);
  if (!notes.length) return "";

  const block = notes.map((n) => `### ${n.model}\n${n.text}`).join("\n\n");
  return `\n\n## Samenwerkende modellen\nJe werkt samen met ondersteunende modellen die de vraag al hebben geanalyseerd. Verwerk hun inzichten in één coherent, natuurlijk antwoord — de modellen completeren elkaar, ze strijden niet om het beste antwoord. Noem hun input niet expliciet tenzij de gebruiker ernaar vraagt.\n\n${block}`;
}

/** Lead-model met optionele OpenRouter reasoning-effort. */
export function fusionLeadModel(fusion: FusionTemplate) {
  const effort = fusion.leadEffort as EffortLevel | "";
  return openrouter().chat(
    fusion.leadModel,
    effort ? { reasoning: { effort } } : {}
  );
}
