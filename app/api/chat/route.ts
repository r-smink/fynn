import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { buildSystemPrompt, buildTools, knowledgeSourceIdsFor, FALLBACK_MODEL } from "@/lib/agents";
import { chatModel, openrouter } from "@/lib/openrouter";
import { logUsage } from "@/lib/usage";
import {
  fusionIdFromModel, fusionLeadModel, isFusionModel, runSidekicks,
} from "@/lib/fusion";

export const maxDuration = 300;

function fallbackTitle(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
}

async function improveTitle(conversationId: string, firstUserText: string) {
  const convo = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) return;
  const fallback = fallbackTitle(firstUserText);
  if (convo.title !== "Nieuw gesprek" && convo.title !== fallback) return;
  try {
    const res = await generateText({
      model: openrouter().chat("openai/gpt-4o-mini"),
      prompt: `Vat dit bericht samen in een gesprekstitel van max. 6 woorden, zonder quotes:\n\n${firstUserText.slice(0, 800)}`,
    });
    await db.conversation.update({
      where: { id: conversationId },
      data: { title: res.text.trim().slice(0, 80) || fallback },
    });
  } catch { /* behoud de fallback-titel */ }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { conversationId, model: requestedModel, agentId } = body as {
    conversationId: string;
    model?: string;
    agentId?: string;
  };
  const uiMessages = (body.messages ?? []) as UIMessage[];
  const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
  if (!conversationId || !lastUser) {
    return Response.json({ error: "conversationId en message zijn vereist" }, { status: 400 });
  }

  const convo = await db.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
    include: {
      agent: { include: { brand: true, sources: true } },
      brand: true,
      messages: { select: { id: true } },
    },
  });
  if (!convo) return Response.json({ error: "Gesprek niet gevonden" }, { status: 404 });

  const agent =
    convo.agent ??
    (agentId
      ? await db.agent.findUnique({ where: { id: agentId }, include: { brand: true, sources: true } })
      : null) ??
    (await db.agent.findFirst({
      where: { isDefault: true },
      include: { brand: true, sources: true },
    }));

  const model = requestedModel || convo.model || agent?.defaultModel || FALLBACK_MODEL;

  // Fusion-templates: model = "fusion:<id>" → lead + sidekick-modellen van de gebruiker
  const fusion = isFusionModel(model)
    ? await db.fusionTemplate.findFirst({
        where: { id: fusionIdFromModel(model), userId: user.id },
      })
    : null;
  const displayModel = fusion ? `Fusion · ${fusion.name}` : model;

  if (convo.model !== model) {
    await db.conversation.update({ where: { id: conversationId }, data: { model } });
  }

  // Persist the new user message (dedupe by id for regenerate flows)
  const knownIds = new Set(convo.messages.map((m) => m.id));
  if (!knownIds.has(lastUser.id)) {
    await db.message.create({
      data: {
        id: lastUser.id,
        conversationId,
        role: "user",
        parts: JSON.stringify(lastUser.parts ?? [{ type: "text", text: "" }]),
      },
    });
  }
  if (convo.title === "Nieuw gesprek") {
    const fallback = fallbackTitle(
      lastUser.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "",
    );
    if (fallback) {
      await db.conversation.update({ where: { id: conversationId }, data: { title: fallback } }).catch(() => {});
    }
  }

  const brand = agent?.brand ?? convo.brand;
  const brandSources = brand
    ? await db.knowledgeSource.findMany({ where: { brandId: brand.id }, select: { id: true } as never })
    : [];
  const sourceIds = agent ? await knowledgeSourceIdsFor(agent, brandSources as never) : undefined;

  let system = agent
    ? buildSystemPrompt({ ...agent, brand: agent.brand ?? brand })
    : "Je bent FYNN, een behulpzame AI-assistent. Antwoord in de taal van de gebruiker.";

  if (fusion) {
    system += await runSidekicks({ fusion, uiMessages, userId: user.id, conversationId });
  }

  const tools = agent ? buildTools(agent, sourceIds) : {};

  const result = streamText({
    model: fusion ? fusionLeadModel(fusion) : chatModel(model),
    system,
    messages: await convertToModelMessages(uiMessages),
    tools,
    ...(Object.keys(tools).length ? { stopWhen: stepCountIs(8) } : {}),
    temperature: agent?.temperature ?? 0.7,
    onFinish: async ({ totalUsage }) => {
      await logUsage({
        userId: user.id,
        conversationId,
        model: fusion?.leadModel ?? model,
        promptTokens: totalUsage?.inputTokens ?? 0,
        completionTokens: totalUsage?.outputTokens ?? 0,
      });
      const firstText = lastUser.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "";
      await improveTitle(conversationId, firstText);
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") return { model: displayModel };
      return undefined;
    },
    onFinish: async ({ responseMessage }) => {
      await db.message.create({
        data: {
          id: responseMessage.id,
          conversationId,
          role: "assistant",
          parts: JSON.stringify(responseMessage.parts),
          model: displayModel,
          usage: JSON.stringify(responseMessage.metadata ?? {}),
        },
      });
      await db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    },
  });
}
