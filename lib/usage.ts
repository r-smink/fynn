import { db } from "@/lib/db";
import { estimateCost } from "@/lib/openrouter";

export async function logUsage(opts: {
  userId: string;
  conversationId: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}) {
  try {
    const cost = await estimateCost(opts.model, opts.promptTokens ?? 0, opts.completionTokens ?? 0);
    await db.usageEvent.create({
      data: {
        userId: opts.userId,
        conversationId: opts.conversationId,
        model: opts.model,
        promptTokens: opts.promptTokens ?? 0,
        completionTokens: opts.completionTokens ?? 0,
        cost,
      },
    });
    return cost;
  } catch {
    return 0;
  }
}
