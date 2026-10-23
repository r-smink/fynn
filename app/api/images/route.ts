import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createImage } from "@/lib/images";
import { ASPECT_RATIOS, BUILTIN_IMAGE_STYLES } from "@/lib/image-styles";
import { logUsage } from "@/lib/usage";
import { referenceSourceWhere, userBrandScope, visibleOwnedWhere } from "@/lib/scope";
import { findVisibleFolder, libraryView } from "@/lib/image-library";

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

/** POST { prompt, styleId?, model?, aspectRatio?, referenceAssetIds?, folderId? } → nieuwe afbeelding. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    prompt?: string;
    styleId?: string;
    model?: string;
    aspectRatio?: string;
    referenceAssetIds?: string[];
    folderId?: string | null;
  };
  const prompt = body.prompt?.trim();
  if (!prompt) return Response.json({ error: "Beschrijf wat je wilt zien" }, { status: 400 });

  const style = body.styleId
    ? BUILTIN_IMAGE_STYLES.find((s) => s.id === body.styleId) ??
      (await db.imageStyle.findFirst({ where: { id: body.styleId, ...(await visibleOwnedWhere(user)) } }))
    : null;
  const aspectRatio = ASPECT_RATIOS.includes(body.aspectRatio as never) ? body.aspectRatio : undefined;

  const folder = body.folderId ? await findVisibleFolder(user, body.folderId) : null;
  if (body.folderId && !folder) return Response.json({ error: "Map niet gevonden" }, { status: 404 });

  // Referenties alleen uit kennisbronnen waar deze gebruiker bij mag
  const sources = await db.knowledgeSource.findMany({ where: await referenceSourceWhere(user), select: { id: true } });

  try {
    const result = await createImage({
      prompt: style ? `${prompt}\n\nStyle: ${style.prompt}` : prompt,
      model: body.model || undefined,
      aspectRatio,
      filename: "studio",
      // Lege bronlijst = geen filter in createImage, dus dan ook geen referenties toestaan
      referenceAssetIds: sources.length ? body.referenceAssetIds?.slice(0, 4) : undefined,
      sourceIds: sources.map((s) => s.id),
      // Stopknop in de studio breekt de request af → ook de (betaalde) generatie stoppen
      abortSignal: req.signal,
    });
    const image = await db.imageGeneration.create({
      data: {
        userId: user.id,
        brandId: folder?.brandId ?? (await userBrandScope(user)),
        folderId: folder?.id ?? null,
        prompt,
        style: style?.name ?? "",
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
    return Response.json({ image, references: result.references }, { status: 201 });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
