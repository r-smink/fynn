import { tool, generateImage } from "ai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { openrouter } from "@/lib/openrouter";
import { env, imagesDir } from "@/lib/env";

export function imageTools() {
  return {
    generate_image: tool({
      description:
        "Genereer een afbeelding/visual voor marketingmateriaal. " +
        "Beschrijf de gewenste afbeelding in het Engels voor het beste resultaat. " +
        "Het resultaat verschijnt inline in de chat en wordt opgeslagen.",
      inputSchema: z.object({
        prompt: z.string().describe("Engelse beschrijving van de afbeelding"),
        filename: z.string().optional().describe("optionele bestandsnaam zonder extensie"),
      }),
      execute: async ({ prompt, filename }) => {
        try {
          const { image } = await generateImage({
            model: openrouter().imageModel(env.imageModel),
            prompt,
          });
          const dir = imagesDir();
          await fs.mkdir(dir, { recursive: true });
          const name = `${(filename || "img").replace(/[^a-z0-9-_]/gi, "-").toLowerCase()}-${crypto.randomBytes(4).toString("hex")}.png`;
          await fs.writeFile(path.join(dir, name), image.uint8Array);
          return { url: `/api/files/images/${name}`, filename: name };
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),
  };
}
