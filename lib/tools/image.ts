import { tool } from "ai";
import { z } from "zod";
import { createImage } from "@/lib/images";

export function imageTools(sourceIds?: string[]) {
  return {
    generate_image: tool({
      description:
        "Genereer een afbeelding/visual voor marketingmateriaal. " +
        "Beschrijf de gewenste afbeelding in het Engels voor het beste resultaat. " +
        "Het resultaat verschijnt inline in de chat en wordt opgeslagen. " +
        "Galerij-afbeeldingen met editPolicy 'locked' (bijv. een mascotte of logo) mogen NIET aangepast worden: " +
        "beschrijf in je prompt alleen de scène eromheen, nooit een herontwerp van het beeld zelf.",
      inputSchema: z.object({
        prompt: z.string().describe("Engelse beschrijving van de afbeelding"),
        filename: z.string().optional().describe("optionele bestandsnaam zonder extensie"),
        referenceAssetIds: z.array(z.string()).max(4).optional()
          .describe("assetId's van galerij-afbeeldingen (uit search_knowledge) als stijl-/merkreferentie"),
      }),
      execute: async ({ prompt, filename, referenceAssetIds }) => {
        try {
          const { url, filename: name, references } = await createImage({
            prompt, filename, referenceAssetIds, sourceIds,
          });
          return { url, filename: name, references };
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e), references: 0 };
        }
      },
    }),
  };
}
