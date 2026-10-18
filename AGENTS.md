<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FYNN — project notes

Whitelabel ChatGPT/Claude-style chatplatform voor het Fyndable-team (zie README.md).

## Stack & conventies

- Next.js 16.4 (App Router, Turbopack), `cacheComponents: false`, `output: "standalone"`.
- **AI**: `ai` v7 + `@ai-sdk/react` v4 + `@openrouter/ai-sdk-provider`. Chat via `streamText` +
  `toUIMessageStreamResponse`, tools via `tool({inputSchema: z.object, execute})`, multi-step via
  `stopWhen: stepCountIs(8)`. Client: `useChat({id, messages, transport: new DefaultChatTransport(...)})`,
  `sendMessage({text}, {body})`.
- **DB**: Prisma 7 (`prisma-client` generator → `@/generated/prisma/client`) + PostgreSQL via
  `@prisma/adapter-pg`. CLI-config in `prisma7.config.ts`. Bytes-velden (`bytea`) = `Uint8Array`.
- **Opslag**: `lib/storage.ts` (`putFile`/`getFile`) → Vercel Blob (private) als
  `BLOB_READ_WRITE_TOKEN` gezet is, anders `FYNN_DATA_DIR`. Geen directe fs-writes voor
  uploads/images (Vercel-filesystem is ephemeral).
- **Auth**: next-auth v4 credentials + JWT, secret = `AUTH_SECRET`. Guard in `proxy.ts`
  (Next 16 = geen `middleware.ts` meer). Server-side: `requireUser()`/`requireAdmin()`/`requireSuperadmin()` uit `lib/auth.ts`.
  Rollen (`lib/roles.ts`): `member` (eigen chats/usage), `admin` (+ beheer), `superadmin`
  (+ alle chats read-only via `/all-chats` en usage van iedereen). Chats altijd filteren op `userId`.
- **UI**: shadcn/ui op **base-ui** (geen Radix): geen `asChild` — gebruik `render={<Link/>}` of
  `buttonVariants()` op een `Link`. Select `onValueChange` geeft `string | null` — coerce met `?? ""`.
- FS-walking: eigen `lib/fsx.ts` (`walkDir`/`iterFiles` met picomatch) — `fs.glob` is niet betrouwbaar
  getypt/gebacked.

## Structuur

- `app/(app)/` — authed shell (sidebar in `components/app-sidebar.tsx`): chat, agents, brands,
  knowledge, templates, usage, users, settings
- `app/api/` — REST: chat (SSE stream), conversations, models, agents, brands, knowledge(+sync/upload),
  templates, usage, users, export (branded HTML), files/images
- `lib/agents.ts` — system-prompt builder + tool-groepen (`knowledge|platform|web|image|repo`)
- `lib/rag/` — chunk, embed (OpenRouter `EMBEDDING_MODEL`), cosine-search, ingest (file/url/sitemap/git/folder)
- `lib/tools/` — platform (Fyndable admin-API), web (`:online` + fetch), image (`IMAGE_MODEL`), repo
- `lib/export.ts` — markdown → on-brand HTML
- `data/` (gitignored) — lokale uploads + gegenereerde images (zonder Blob-token)
- Git-bronnen: tijdelijke clone in `$TMPDIR/fynn-repos` → tekstbestanden naar `RepoFile`
  (repo-tools lezen uit de db)

## Verifiëren

`npx tsc --noEmit` · `npm run build` · `npm run lint`. Dev: `npm run dev` (login: seed-admin).

## Bekende aandachtspunten

- Knowledge/git-sync draait synchroon in de API-route (maxDuration 300 = Vercel Hobby-max) — bij grote repos kan dit
  lang duren; later eventueel queue'en.
- Embeddings worden als Float32Array-blob (`bytea`) opgeslagen; cosine in JS — prima tot ~50k
  chunks. Later eventueel pgvector.
- `web_search` gebruikt OpenRouter `:online`-suffix (extra kosten per resultaat).
- Secrets alleen server-side uit env; WP App Password is Basic-auth → alleen HTTPS.
