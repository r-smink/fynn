import { embed, embedMany } from "ai";
import { openrouter } from "@/lib/openrouter";
import { env } from "@/lib/env";

function model() {
  return openrouter().textEmbeddingModel(env.embeddingModel);
}

export async function embedText(text: string): Promise<Float32Array> {
  const { embedding } = await embed({ model: model(), value: text });
  return new Float32Array(embedding);
}

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const out: Float32Array[] = [];
  // batches of 32 to stay well under payload limits
  for (let i = 0; i < texts.length; i += 32) {
    const { embeddings } = await embedMany({
      model: model(),
      values: texts.slice(i, i + 32),
    });
    for (const e of embeddings) out.push(new Float32Array(e));
  }
  return out;
}

export function toBuffer(v: Float32Array): Uint8Array<ArrayBuffer> {
  const ab = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer;
  return new Uint8Array(ab);
}

export function fromBuffer(b: Buffer | Uint8Array): Float32Array {
  const buf = Buffer.isBuffer(b) ? b : Buffer.from(b);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}
