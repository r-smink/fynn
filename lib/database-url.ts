/**
 * Direct Postgres URL for the `pg` driver adapter. The Vercel Prisma Postgres integration
 * may expose a `prisma+postgres://` (Accelerate) URL; `pg` needs the direct TCP one.
 */
export function databaseUrl(): string | undefined {
  const candidates = [process.env.DATABASE_URL, process.env.POSTGRES_URL];
  return candidates.find((u) => u && /^postgres(ql)?:\/\//.test(u)) ?? process.env.DATABASE_URL;
}
