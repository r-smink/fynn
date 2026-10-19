import fs from "fs/promises";
import path from "path";
import { del, get, put } from "@vercel/blob";
import { env } from "@/lib/env";

/** Files live in Vercel Blob (private) when BLOB_READ_WRITE_TOKEN is set, otherwise under FYNN_DATA_DIR. */
const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

function localPath(key: string) {
  const fp = path.join(env.dataDir, key);
  if (!fp.startsWith(env.dataDir + path.sep)) throw new Error("Ongeldige opslag-key");
  return fp;
}

export async function putFile(key: string, data: Uint8Array, contentType: string): Promise<void> {
  if (blobEnabled()) {
    await put(key, Buffer.from(data), {
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  const fp = localPath(key);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, data);
}

export async function getFile(key: string): Promise<Uint8Array | null> {
  if (blobEnabled()) {
    const res = await get(key, { access: "private" }).catch(() => null);
    if (!res?.stream) return null;
    return new Uint8Array(await new Response(res.stream).arrayBuffer());
  }
  return fs.readFile(localPath(key)).then((b) => new Uint8Array(b)).catch(() => null);
}

export async function deleteFile(key: string): Promise<void> {
  if (blobEnabled()) {
    await del(key);
    return;
  }
  await fs.rm(localPath(key), { force: true });
}
