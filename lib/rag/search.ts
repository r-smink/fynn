import { db } from "@/lib/db";
import { embedText, fromBuffer } from "@/lib/rag/embed";

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export type SearchHit = {
  text: string;
  path: string;
  sourceName: string;
  score: number;
};

/** Cosine search over knowledge chunks, optionally restricted to source ids. */
export async function searchKnowledge(
  query: string,
  opts: { sourceIds?: string[]; topK?: number } = {}
): Promise<SearchHit[]> {
  const topK = opts.topK ?? 8;
  const q = await embedText(query);

  const chunks = await db.knowledgeChunk.findMany({
    where: opts.sourceIds?.length ? { sourceId: { in: opts.sourceIds } } : undefined,
    include: { source: { select: { name: true } } },
  });

  return chunks
    .map((c) => ({
      text: c.text,
      path: c.path,
      sourceName: c.source.name,
      score: cosine(q, fromBuffer(c.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
