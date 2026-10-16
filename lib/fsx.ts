import fs from "fs/promises";
import path from "path";
import picomatch from "picomatch";

const SKIP_DIRS = new Set([".git", "node_modules", "vendor", "dist", "build", ".next", "out"]);

/** Recursively yield files under root. */
export async function* walkDir(root: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const fp = path.join(root, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walkDir(fp);
    } else if (e.isFile()) {
      yield fp;
    }
  }
}

function posix(p: string) {
  return p.split(path.sep).join("/");
}

/** Yield files under root matching include globs and not matching exclude globs. */
export async function* iterFiles(
  root: string,
  include?: string[],
  exclude?: string[]
): AsyncGenerator<string> {
  const includes = (include?.length ? include : ["**/*"]).map((p) => picomatch(p));
  const excludes = (exclude ?? []).map((p) => picomatch(p));
  const defaultExclude = picomatch([
    "**/node_modules/**", "**/.git/**", "**/vendor/**", "**/dist/**", "**/build/**",
    "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.ico", "**/*.webp",
    "**/*.woff", "**/*.woff2", "**/*.ttf", "**/*.zip", "**/*.pdf", "**/*.exe", "**/*.dll",
    "**/*.mo", "**/*.po", "**/*.mp4", "**/*.mp3", "**/*.lock", "**/package-lock.json",
  ]);

  for await (const fp of walkDir(root)) {
    const rel = posix(path.relative(root, fp));
    if (defaultExclude(rel) || excludes.some((m) => m(rel))) continue;
    if (!includes.some((m) => m(rel))) continue;
    yield fp;
  }
}
