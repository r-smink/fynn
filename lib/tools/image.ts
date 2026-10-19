import { tool, generateImage } from "ai";
import { z } from "zod";
import crypto from "crypto";
import { openrouter } from "@/lib/openrouter";
import { env } from "@/lib/env";
import { getFile, putFile } from "@/lib/storage";
import { db } from "@/lib/db";

export function imageTools(sourceIds?: string[]) {
  return {
    generate_image: tool({
      description:
        "Genereer een afbeelding/visual voor marketingmateriaal. " +
        "Beschrijf de gewenste afbeelding in het Engels voor het beste resultaat. " +
        "Het resultaat verschijnt inline in de chat en wordt opgeslagen.",
      inputSchema: z.object({
        prompt: z.string().describe("Engelse beschrijving van de afbeelding"),
        filename: z.string().optional().describe("optionele bestandsnaam zonder extensie"),
        referenceAssetIds: z.array(z.string()).max(4).optional()
          .describe("assetId's van galerij-afbeeldingen (uit search_knowledge) als stijl-/merkreferentie"),
      }),
      execute: async ({ prompt, filename, referenceAssetIds }) => {
        let referenceCount = 0;
        try {
          const references = referenceAssetIds?.length
            ? await db.knowledgeAsset.findMany({
              where: {
                id: { in: referenceAssetIds },
                contentType: { startsWith: "image/" },
                ...(sourceIds?.length ? { sourceId: { in: sourceIds } } : {}),
              },
              select: { storageKey: true },
            })
            : [];
          const referenceBytes: Uint8Array[] = [];
          for (const reference of references) {
            const bytes = await getFile(reference.storageKey);
            if (bytes) referenceBytes.push(bytes);
          }
          referenceCount = referenceBytes.length;

          const { image } = await generateImage({
            model: openrouter().imageModel(env.imageModel),
            prompt: referenceBytes.length ? { text: prompt, images: referenceBytes } : prompt,
          });
          const name = `${(filename || "img").replace(/[^a-z0-9-_]/gi, "-").toLowerCase()}-${crypto.randomBytes(4).toString("hex")}.png`;
          await putFile(`images/${name}`, image.uint8Array, "image/png");
          return { url: `/api/files/images/${name}`, filename: name, references: referenceCount };
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e), references: referenceCount };
        }
      },
    }),
  };
}
