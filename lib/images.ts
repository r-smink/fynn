import { generateImage } from "ai";
import crypto from "crypto";
import { openrouter } from "@/lib/openrouter";
import { env } from "@/lib/env";
import { getFile, putFile } from "@/lib/storage";
import { db } from "@/lib/db";
import { EDIT_POLICIES, isEditPolicy } from "@/lib/image-styles";

export { EDIT_POLICIES, isEditPolicy, type EditPolicy } from "@/lib/image-styles";

/**
 * Genereer een afbeelding, optioneel met kennisbank-referenties. Het bewerkingsniveau van elke
 * referentie wordt als harde instructie aan de prompt toegevoegd en opgeslagen onder images/.
 */
export async function createImage(opts: {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  filename?: string;
  referenceAssetIds?: string[];
  /** Beperk referenties tot deze kennisbronnen (agent-scope). */
  sourceIds?: string[];
  /** Losse invoerbeelden (uploads of een beeld uit de beeldbank), vóór de kennisbank-referenties. */
  inputImages?: { bytes: Uint8Array; name: string; instruction: string }[];
  abortSignal?: AbortSignal;
}) {
  const references = opts.referenceAssetIds?.length
    ? await db.knowledgeAsset.findMany({
      where: {
        id: { in: opts.referenceAssetIds },
        contentType: { startsWith: "image/" },
        ...(opts.sourceIds?.length ? { sourceId: { in: opts.sourceIds } } : {}),
      },
      select: { storageKey: true, filename: true, editPolicy: true },
    })
    : [];

  const images: Uint8Array[] = [];
  const rules: string[] = [];
  for (const input of opts.inputImages ?? []) {
    images.push(input.bytes);
    rules.push(`Input image ${images.length} ("${input.name}") ${input.instruction}`);
  }
  for (const reference of references) {
    const bytes = await getFile(reference.storageKey);
    if (!bytes) continue;
    images.push(bytes);
    const policy = isEditPolicy(reference.editPolicy) ? reference.editPolicy : "free";
    rules.push(`Reference image ${images.length} ("${reference.filename}") ${EDIT_POLICIES[policy].instruction}`);
  }

  const text = rules.length ? `${opts.prompt}\n\n${rules.join("\n")}` : opts.prompt;
  const model = opts.model || env.imageModel;
  const { image, usage } = await generateImage({
    model: openrouter().imageModel(model),
    prompt: images.length ? { text, images } : text,
    abortSignal: opts.abortSignal,
    ...(opts.aspectRatio ? { aspectRatio: opts.aspectRatio as `${number}:${number}` } : {}),
  });
  const name = `${(opts.filename || "img").replace(/[^a-z0-9-_]/gi, "-").toLowerCase()}-${crypto.randomBytes(4).toString("hex")}.png`;
  await putFile(`images/${name}`, image.uint8Array, "image/png");
  return {
    url: `/api/files/images/${name}`,
    filename: name,
    model,
    references: images.length - (opts.inputImages?.length ?? 0),
    protectedReferences: references.filter((r) => r.editPolicy !== "free").length,
    usage,
  };
}
