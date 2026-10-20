import { generateText } from "ai";
import { env } from "@/lib/env";
import { chatModel } from "@/lib/openrouter";

export async function describeImage(
  bytes: Uint8Array,
  mediaType: string,
  filename: string,
): Promise<string> {
  const { text } = await generateText({
    model: chatModel(env.visionModel),
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Beschrijf deze afbeelding in het Nederlands voor een doorzoekbare merk- en beeldbank (3-6 zinnen). Noem: het type (logo, foto, illustratie, screenshot, icoon, banner), wat er te zien is, de dominante kleuren (met hex-codes als je ze kunt inschatten), alle zichtbare tekst letterlijk, de stijl en waarvoor de afbeelding bruikbaar is. Bestandsnaam: ${filename}`,
        },
        { type: "image", image: bytes, mediaType },
      ],
    }],
  });
  const description = text.trim();
  if (!description) throw new Error("Het vision-model gaf geen beschrijving terug");
  return description;
}
