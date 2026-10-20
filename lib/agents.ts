import type { ToolSet } from "ai";
import type { Agent, Brand, KnowledgeSource } from "@/generated/prisma/client";
import { platformTools } from "@/lib/tools/platform";
import { knowledgeTools } from "@/lib/tools/knowledge";
import { webTools } from "@/lib/tools/web";
import { imageTools } from "@/lib/tools/image";
import { repoTools } from "@/lib/tools/repo";

export const TOOL_GROUPS = ["knowledge", "platform", "web", "image", "repo"] as const;
export type ToolGroup = (typeof TOOL_GROUPS)[number];

export const TOOL_GROUP_LABELS: Record<ToolGroup, string> = {
  knowledge: "Kennisbank (RAG)",
  platform: "Fyndable platform-data",
  web: "Web search + URL lezen",
  image: "Image generation",
  repo: "Git-repo zoeken",
};

type AgentWithBrand = Agent & { brand?: Brand | null; sources?: KnowledgeSource[] };

export function parseEnabledTools(agent: Agent): ToolGroup[] {
  try {
    const arr = JSON.parse(agent.enabledTools || "[]") as string[];
    return arr.filter((t): t is ToolGroup => (TOOL_GROUPS as readonly string[]).includes(t));
  } catch {
    return [];
  }
}

/** Brand context block injected into the system prompt. */
function brandBlock(brand: Brand | null | undefined): string {
  if (!brand) return "";
  let theme = "";
  try {
    const t = JSON.parse(brand.theme || "{}") as Record<string, string>;
    const bits = [
      t.primary && `primaire kleur ${t.primary}`,
      t.secondary && `secundaire kleur ${t.secondary}`,
      t.gradient && `huisstijl-gradient ${t.gradient}`,
      t.headingFont && `koppen-font ${t.headingFont}`,
      t.bodyFont && `body-font ${t.bodyFont}`,
    ].filter(Boolean);
    if (bits.length) theme = `\nHuisstijl/CVI: ${bits.join(", ")}.`;
  } catch { /* ignore */ }
  return `\n\n## Brand: ${brand.name}
${brand.description ? `${brand.description}\n` : ""}${brand.websiteUrl ? `Website: ${brand.websiteUrl}\n` : ""}${brand.toneOfVoice ? `Tone of voice: ${brand.toneOfVoice}\n` : ""}${theme}`;
}

/** Compose the full system prompt for an agent. */
export function buildSystemPrompt(agent: AgentWithBrand, appName = "FYNN"): string {
  return [
    `Je bent ${agent.name}, een AI-agent op het ${appName}-platform.`,
    agent.brand ? brandBlock(agent.brand) : "",
    "",
    "## Instructies",
    agent.systemPrompt,
    "",
    "## Richtlijnen",
    "- Antwoord in de taal van de gebruiker (standaard Nederlands).",
    "- Gebruik beschikbare tools wanneer dat het antwoord beter of actueler maakt; noem welke bron/tool je gebruikte.",
    "- Weet je iets niet zeker, zeg dat eerlijk in plaats van te gokken.",
    "- Bij marketingmateriaal: lever publicatie-klaar werk, houd je aan de brand-voice en CVI van de gekoppelde brand, en gebruik markdown-opmaak.",
  ].join("\n");
}

/** Source-ids the agent may search (explicit picks > brand sources > all). */
export async function knowledgeSourceIdsFor(agent: AgentWithBrand, allBrandSources?: KnowledgeSource[]): Promise<string[] | undefined> {
  if (agent.sources?.length) return agent.sources.map((s) => s.id);
  if (allBrandSources?.length) return allBrandSources.map((s) => s.id);
  return undefined; // no restriction → search everything
}

/** Merge enabled tool groups into one ToolSet. */
export function buildTools(agent: AgentWithBrand, knowledgeSourceIds?: string[]): ToolSet {
  const groups = new Set(parseEnabledTools(agent));
  const tools: ToolSet = {};
  if (groups.has("knowledge")) Object.assign(tools, knowledgeTools(knowledgeSourceIds));
  if (groups.has("platform")) Object.assign(tools, platformTools());
  if (groups.has("web")) Object.assign(tools, webTools());
  if (groups.has("image")) Object.assign(tools, imageTools(knowledgeSourceIds));
  if (groups.has("repo")) Object.assign(tools, repoTools());
  return tools;
}

export const FALLBACK_MODEL = "openai/gpt-4o-mini";
