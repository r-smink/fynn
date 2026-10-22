/**
 * Direct Postgres URL for the `pg` driver adapter. The Vercel Prisma Postgres integration
 * may expose a `prisma+postgres://` (Accelerate) URL; `pg` needs the direct TCP one.
 */
export function databaseUrl(): string | undefined {
  const candidates = [process.env.DATABASE_URL, process.env.POSTGRES_URL];
  return candidates.find((u) => u && /^postgres(ql)?:\/\//.test(u)) ?? process.env.DATABASE_URL;
}

/**
 * URL for the Prisma CLI (migrations). Prefers the unpooled connection that Neon / Vercel Postgres
 * expose, because migrations take advisory locks that a pooler (pgbouncer) does not reliably support.
 */
export function migrationUrl(): string | undefined {
  const unpooled = [process.env.DATABASE_URL_UNPOOLED, process.env.POSTGRES_URL_NON_POOLING];
  return unpooled.find((u) => u && /^postgres(ql)?:\/\//.test(u)) ?? databaseUrl();
}
