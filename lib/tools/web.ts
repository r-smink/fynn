import { tool, generateText } from "ai";
import { z } from "zod";
import { openrouter } from "@/lib/openrouter";
import { htmlToText } from "@/lib/rag/html";

export function webTools() {
  return {
    web_search: tool({
      description:
        "Zoek actuele informatie op het web (via OpenRouter :online). " +
        "Gebruik voor recente data, concurrenten, trends.",
      inputSchema: z.object({
        query: z.string(),
        model: z.string().default("openai/gpt-4o-mini").describe("model om de zoekopdracht mee uit te voeren"),
      }),
      execute: async ({ query, model }) => {
        const res = await generateText({
          model: openrouter().chat(`${model}:online`),
          prompt: `Beantwoord deze zoekopdracht met actuele webinformatie. Geef bronvermelding.\n\n${query}`,
        });
        return { answer: res.text.slice(0, 6000) };
      },
    }),
    fetch_url: tool({
      description: "Haal een webpagina op en lees de tekst (eigen sites, concurrenten, bronnen).",
      inputSchema: z.object({ url: z.string().url() }),
      execute: async ({ url }) => {
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; FYNN/1.0)" },
            redirect: "follow",
          });
          if (!res.ok) return { error: `HTTP ${res.status}` };
          const text = htmlToText(await res.text());
          return { url, content: text.slice(0, 12000) };
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),
  };
}
