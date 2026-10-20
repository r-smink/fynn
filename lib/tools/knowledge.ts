import { tool } from "ai";
import { z } from "zod";
import { searchKnowledge } from "@/lib/rag/search";

export function knowledgeTools(sourceIds?: string[]) {
  return {
    search_knowledge: tool({
      description:
        "Zoek in de kennisbank (documentatie, CVI/huisstijl, brand voice, product-info, code). " +
        "Gebruik dit ALTIJD als de vraag over Fyndable, een brand, of interne documentatie gaat. " +
        "Afbeeldingen uit galerij-bronnen komen terug met imageUrl en assetId; ze worden automatisch in de chat getoond. Gebruik assetId als referentie in generate_image.",
      inputSchema: z.object({
        query: z.string().describe("zoekopdracht in natuurlijke taal"),
        topK: z.number().int().min(1).max(20).default(8),
      }),
      execute: async ({ query, topK }) => {
        const hits = await searchKnowledge(query, { sourceIds, topK });
        if (!hits.length) return { results: [], note: "Geen relevante kennis gevonden." };
        return {
          results: hits.map((h) => ({
            source: h.sourceName,
            path: h.path,
            relevance: Math.round(h.score * 100) / 100,
            content: h.text.slice(0, 1800),
            ...(h.meta.kind === "image" && typeof h.meta.assetId === "string"
              ? { assetId: h.meta.assetId, imageUrl: `/api/knowledge/assets/${h.meta.assetId}` }
              : {}),
          })),
        };
      },
    }),
  };
}
