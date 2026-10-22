import { db } from "@/lib/db";

/** Gesprekken zonder activiteit worden na zoveel dagen verwijderd, tenzij vastgepind of gearchiveerd. */
export const RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
}

/** Verwijdert verlopen gesprekken (berichten gaan mee via onDelete: Cascade). Optioneel per gebruiker. */
export async function purgeExpiredConversations(userId?: string): Promise<number> {
  const { count } = await db.conversation.deleteMany({
    where: {
      archived: false,
      pinned: false,
      updatedAt: { lt: retentionCutoff() },
      ...(userId && { userId }),
    },
  });
  return count;
}
