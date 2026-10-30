import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createImage } from "@/lib/images";
import {
  ASPECT_RATIOS, BUILTIN_IMAGE_STYLES, INPUT_IMAGE_MODES, isInputImageMode, STUDIO_UPLOAD_NAME,
} from "@/lib/image-styles";
import { getFile } from "@/lib/storage";
import { logUsage } from "@/lib/usage";
import { referenceSourceWhere, userBrandScope, visibleOwnedWhere } from "@/lib/scope";
import { findVisibleFolder, findVisibleImage, libraryView } from "@/lib/image-library";
import { planImage } from "@/lib/image-agent";

export const maxDuration = 300;

/** GET ?folderId= → inhoud van een map in de beeldbank (zonder folderId: de root). */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const folderId = new URL(req.url).searchParams.get("folderId");
  const view = await libraryView(user, folderId || null);
  if (!view) return Response.json({ error: "Map niet gevonden" }, { status: 404 });
  return Response.json(view);
}

/**
 * POST { prompt, styleId?, model?, aspectRatio?, referenceAssetIds?, uploads?, parentId?, folderId?, agentId? } → nieuwe afbeelding.
 * `uploads` = eigen afbeeldingen (via /api/images/uploads) om te bewerken of als referentie;
 * `parentId` = doorprompten op een beeld uit de beeldbank (wordt de te bewerken basis + geschiedenis);
 * `agentId` = beeld-agent die eerst de beelden bekijkt + de kennisbank doorzoekt en de prompt uitwerkt.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    prompt?: string;
    styleId?: string;
    model?: string;
    aspectRatio?: string;
    referenceAssetIds?: string[];
    uploads?: { name: string; mode?: string }[];
    parentId?: string | null;
    folderId?: string | null;
    agentId?: string | null;
  };
  const prompt = body.prompt?.trim();
  if (!prompt) return Response.json({ error: "Beschrijf wat je wilt zien" }, { status: 400 });

  const parent = body.parentId ? await findVisibleImage(user, body.parentId) : null;
  if (body.parentId && !parent) return Response.json({ error: "Afbeelding niet gevonden" }, { status: 404 });

  const inputImages: { bytes: Uint8Array; name: string; instruction: string }[] = [];
  // Zelfde beelden, maar met bestandsnaam en rol voor de beeld-agent
  const agentImages: { bytes: Uint8Array; name: string; role: string }[] = [];
  if (parent) {
    const file = parent.url.split("/").pop()!;
    const bytes = await getFile(`images/${file}`);
    if (!bytes) return Response.json({ error: "Originele afbeelding niet meer beschikbaar" }, { status: 404 });
    inputImages.push({ bytes, name: "previous version", instruction: INPUT_IMAGE_MODES.edit.instruction });
    agentImages.push({ bytes, name: file, role: `vorige versie, te bewerken (eerdere prompt: ${parent.prompt})` });
  }
  for (const upload of body.uploads ?? []) {
    if (inputImages.length >= 4) break;
    if (!STUDIO_UPLOAD_NAME.test(upload.name)) return Response.json({ error: "Ongeldige upload" }, { status: 400 });
    const bytes = await getFile(`images/${upload.name}`);
    if (!bytes) return Response.json({ error: "Upload niet gevonden, upload opnieuw" }, { status: 404 });
    const mode = isInputImageMode(upload.mode) ? upload.mode : "reference";
    inputImages.push({ bytes, name: "uploaded image", instruction: INPUT_IMAGE_MODES[mode].instruction });
    agentImages.push({ bytes, name: upload.name, role: `eigen upload, ${INPUT_IMAGE_MODES[mode].label.toLowerCase()}` });
  }

  const style = body.styleId
    ? BUILTIN_IMAGE_STYLES.find((s) => s.id === body.styleId) ??
      (await db.imageStyle.findFirst({ where: { id: body.styleId, ...(await visibleOwnedWhere(user)) } }))
    : null;
  const aspectRatio = ASPECT_RATIOS.includes(body.aspectRatio as never) ? body.aspectRatio : undefined;

  // Doorprompten zonder expliciete map → nieuwe versie komt naast het origineel
  const folderId = body.folderId === undefined ? parent?.folderId : body.folderId;
  const folder = folderId ? await findVisibleFolder(user, folderId) : null;
  if (folderId && !folder) return Response.json({ error: "Map niet gevonden" }, { status: 404 });

  // Referenties alleen uit kennisbronnen waar deze gebruiker bij mag
  const sources = await db.knowledgeSource.findMany({ where: await referenceSourceWhere(user), select: { id: true } });
  const sourceIds = sources.map((s) => s.id);
  // Lege bronlijst = geen filter in createImage, dus dan ook geen referenties toestaan
  let referenceAssetIds = sources.length ? (body.referenceAssetIds ?? []).slice(0, 4 - inputImages.length) : [];

  const agent = body.agentId
    ? await db.imageAgent.findFirst({
      where: { id: body.agentId, ...(await visibleOwnedWhere(user)) },
      include: { brand: true, sources: { select: { id: true } } },
    })
    : null;
  if (body.agentId && !agent) return Response.json({ error: "Beeld-agent niet gevonden" }, { status: 404 });

  try {
    let finalPrompt = prompt;
    let agentNotes = "";
    if (agent && sources.length) {
      // Gekozen kennisbank-referenties mag de agent ook zien
      const picked = referenceAssetIds.length
        ? await db.knowledgeAsset.findMany({
          where: { id: { in: referenceAssetIds }, sourceId: { in: sourceIds }, contentType: { startsWith: "image/" } },
          select: { storageKey: true, filename: true, editPolicy: true },
        })
        : [];
      const images = [...agentImages];
      for (const asset of picked) {
        const bytes = await getFile(asset.storageKey);
        if (bytes) images.push({ bytes, name: asset.filename, role: `kennisbank-referentie (editPolicy: ${asset.editPolicy})` });
      }
      // Agent zoekt alleen in zijn eigen bronnen (leeg = alles waar de gebruiker bij mag)
      const agentSources = agent.sources.length
        ? agent.sources.map((s) => s.id).filter((id) => sourceIds.includes(id))
        : sourceIds;
      const brief = await planImage({
        agent,
        prompt,
        sourceIds: agentSources,
        images,
        room: Math.max(0, 4 - inputImages.length - referenceAssetIds.length),
        abortSignal: req.signal,
      });
      finalPrompt = brief.prompt;
      agentNotes = brief.notes;
      referenceAssetIds = [...referenceAssetIds, ...brief.referenceAssetIds.filter((id) => !referenceAssetIds.includes(id))]
        .slice(0, 4 - inputImages.length);
      await logUsage({
        userId: user.id,
        conversationId: "",
        model: brief.model,
        promptTokens: brief.usage?.inputTokens ?? 0,
        completionTokens: brief.usage?.outputTokens ?? 0,
      });
    }

    const result = await createImage({
      prompt: style ? `${finalPrompt}\n\nStyle: ${style.prompt}` : finalPrompt,
      model: body.model || undefined,
      aspectRatio,
      filename: "studio",
      referenceAssetIds,
      sourceIds,
      inputImages,
      // Stopknop in de studio breekt de request af → ook de (betaalde) generatie stoppen
      abortSignal: req.signal,
    });
    const image = await db.imageGeneration.create({
      data: {
        userId: user.id,
        brandId: folder?.brandId ?? (await userBrandScope(user)),
        folderId: folder?.id ?? null,
        parentId: parent?.id ?? null,
        prompt,
        style: [agent && `${agent.emoji} ${agent.name}`, style?.name].filter(Boolean).join(" · "),
        model: result.model,
        aspectRatio: aspectRatio ?? "",
        url: result.url,
      },
    });
    await logUsage({
      userId: user.id,
      conversationId: "",
      model: result.model,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
    });
    return Response.json(
      { image, references: result.references, ...(agent ? { agentPrompt: finalPrompt, agentNotes } : {}) },
      { status: 201 },
    );
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
