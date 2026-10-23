import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createImage } from "@/lib/images";
import { ASPECT_RATIOS, BUILTIN_IMAGE_STYLES } from "@/lib/image-styles";
import { logUsage } from "@/lib/usage";
import { referenceSourceWhere, visibleOwnedWhere } from "@/lib/scope";

export const maxDuration = 300;

/** Eigen beeldgeschiedenis (nieuwste eerst). */
export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const images = await db.imageGeneration.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return Response.json({ images });
}

/** POST { prompt, styleId?, model?, aspectRatio?, referenceAssetIds? } → nieuwe afbeelding. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    prompt?: string;
    styleId?: string;
    model?: string;
    aspectRatio?: string;
    referenceAssetIds?: string[];
  };
  const prompt = body.prompt?.trim();
  if (!prompt) return Response.json({ error: "Beschrijf wat je wilt zien" }, { status: 400 });

  const style = body.styleId
    ? BUILTIN_IMAGE_STYLES.find((s) => s.id === body.styleId) ??
      (await db.imageStyle.findFirst({ where: { id: body.styleId, ...(await visibleOwnedWhere(user)) } }))
    : null;
  const aspectRatio = ASPECT_RATIOS.includes(body.aspectRatio as never) ? body.aspectRatio : undefined;

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
    });
    const image = await db.imageGeneration.create({
      data: {
        userId: user.id,
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
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
