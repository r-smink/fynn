import { convertToModelMessages, generateText, stepCountIs, type UIMessage } from "ai";
import type { Task } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { buildSystemPrompt, buildTools, knowledgeSourceIdsFor, FALLBACK_MODEL } from "@/lib/agents";
import { chatModel } from "@/lib/openrouter";
import { fusionIdFromModel, fusionLeadModel, isFusionModel, runSidekicks } from "@/lib/fusion";
import { logUsage } from "@/lib/usage";
import { wpConfigured, wpCreatePost } from "@/lib/wordpress";

export const TASK_ACTIONS = ["chat_run", "wordpress_post"] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];

const NL_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Amsterdam",
  minute: "numeric",
  hour: "numeric",
  hourCycle: "h23",
  day: "numeric",
  month: "numeric",
  weekday: "short",
});
const NL_WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Minimale 5-veld cron-matcher: `*`, `*/n`, `a`, `a,b`, `a-b`.
// Tijden worden geïnterpreteerd in Europe/Amsterdam (de server draait UTC).
export function cronMatches(expr: string, date: Date): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const parts: Record<string, string> = {};
  for (const p of NL_PARTS.formatToParts(date)) parts[p.type] = p.value;
  const vals = [
    parseInt(parts.minute, 10),
    parseInt(parts.hour, 10),
    parseInt(parts.day, 10),
    parseInt(parts.month, 10),
    NL_WEEKDAYS[parts.weekday] ?? date.getDay(),
  ];
  const max = [59, 23, 31, 12, 7];
  return fields.every((f, i) => cronFieldMatches(f, vals[i], max[i]));
}

function cronFieldMatches(field: string, value: number, max: number): boolean {
  for (const part of field.split(",")) {
    const [range, stepStr] = part.split("/");
    const step = stepStr ? parseInt(stepStr, 10) : 1;
    let lo = 0, hi = max;
    if (range !== "*") {
      const [a, b] = range.split("-").map((s) => parseInt(s, 10));
      lo = a; hi = b === undefined || isNaN(b) ? a : b;
    }
    if (value >= lo && value <= hi && (value - lo) % step === 0) return true;
  }
  return false;
}

/** Due = enabled + schedule matcht het huidige minuut + niet al deze minuut gedraaid. */
export function taskIsDue(task: Task, now: Date): boolean {
  if (!task.enabled || !task.schedule.trim() || !cronMatches(task.schedule, now)) return false;
  if (task.lastRunAt && now.getTime() - task.lastRunAt.getTime() < 60_000) return false;
  return true;
}

/** Parse model-output als {title, content}; valt terug op hele tekst als post-body. */
export function parsePostOutput(text: string): { title: string; content: string } {
  const m = text.match(/\{[\s\S]*"title"[\s\S]*\}/);
  if (m) {
    try {
      const j = JSON.parse(m[0]);
      if (j.title && (j.content || j.body || j.html)) {
        return { title: String(j.title), content: String(j.content ?? j.body ?? j.html) };
      }
    } catch { /* fallback hieronder */ }
  }
  const heading = text.match(/^#\s+(.+)$/m);
  return {
    title: heading?.[1]?.trim() || "FYNN post",
    content: text,
  };
}

type ActionConfig = {
  status?: "draft" | "publish";
  categories?: number[];
  tags?: number[];
  wpPostId?: number;
};

/** Voert één task uit en logt de run. Geeft de aangemaakte TaskRun terug. */
export async function runTask(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { agent: { include: { brand: true, sources: true } } },
  });
  if (!task) throw new Error("Task niet gevonden");

  const run = await db.taskRun.create({ data: { taskId: task.id } });
  try {
    const agent =
      task.agent ??
      (await db.agent.findFirst({ where: { isDefault: true }, include: { brand: true, sources: true } }));

    const requestedModel = task.model || agent?.defaultModel || FALLBACK_MODEL;
    const fusion = isFusionModel(requestedModel)
      ? await db.fusionTemplate.findFirst({
          where: { id: fusionIdFromModel(requestedModel), userId: task.userId },
        })
      : null;
    const modelId = isFusionModel(requestedModel) && !fusion ? FALLBACK_MODEL : requestedModel;

    let system = agent
      ? buildSystemPrompt({ ...agent, brand: agent.brand })
      : "Je bent FYNN, een behulpzame AI-assistent. Antwoord in de taal van de gebruiker.";
    if (task.action === "wordpress_post") {
      system +=
        "\n\nJe output wordt als WordPress-post gepubliceerd. Antwoord UITSLUITEND als JSON-object " +
        '{"title": "...", "content": "<h2>...</h2><p>...</p>"} met content in HTML (geen markdown, geen codeblokken rondom).';
    }

    const uiMessages: UIMessage[] = [
      { id: run.id, role: "user", parts: [{ type: "text", text: task.prompt }] },
    ];
    if (fusion) {
      system += await runSidekicks({
        fusion, uiMessages, userId: task.userId, conversationId: `task:${task.id}`,
      });
    }

    const brandSources = agent?.brand
      ? await db.knowledgeSource.findMany({ where: { brandId: agent.brand.id }, select: { id: true } as never })
      : [];
    const sourceIds = agent ? await knowledgeSourceIdsFor(agent, brandSources as never) : undefined;
    const tools = agent ? buildTools(agent, sourceIds) : {};

    const res = await generateText({
      model: fusion ? fusionLeadModel(fusion) : chatModel(modelId),
      system,
      messages: await convertToModelMessages(uiMessages),
      tools,
      ...(Object.keys(tools).length ? { stopWhen: stepCountIs(8) } : {}),
      temperature: agent?.temperature ?? 0.7,
    });
    await logUsage({
      userId: task.userId,
      conversationId: `task:${task.id}`,
      model: fusion?.leadModel ?? modelId,
      promptTokens: res.usage?.inputTokens ?? 0,
      completionTokens: res.usage?.outputTokens ?? 0,
    });

    const cfg = JSON.parse(task.actionConfig || "{}") as ActionConfig;
    let output = res.text;
    let resultUrl = "";

    if (task.action === "wordpress_post") {
      if (!wpConfigured()) throw new Error("WP_USER / WP_APP_PASSWORD niet geconfigureerd");
      const post = parsePostOutput(res.text);
      const created = await wpCreatePost({
        title: post.title,
        content: post.content,
        status: cfg.status ?? "draft",
        categories: cfg.categories,
        tags: cfg.tags,
      });
      resultUrl = created.link;
      output = `Post "${post.title}" aangemaakt als ${created.status}: ${created.link}`;
      await db.task.update({
        where: { id: task.id },
        data: { actionConfig: JSON.stringify({ ...cfg, wpPostId: created.id }) },
      });
    }

    await db.task.update({ where: { id: task.id }, data: { lastRunAt: new Date() } });
    return await db.taskRun.update({
      where: { id: run.id },
      data: { status: "done", output: output.slice(0, 20_000), resultUrl },
    });
  } catch (e) {
    await db.task.update({ where: { id: task.id }, data: { lastRunAt: new Date() } }).catch(() => {});
    return await db.taskRun.update({
      where: { id: run.id },
      data: { status: "error", error: e instanceof Error ? e.message : String(e) },
    });
  }
}
