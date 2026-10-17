# FYNN — whitelabel AI-chatplatform

Eigen ChatGPT/Claude-achtige chatinterface voor het Fyndable-team: chat met willekeurige
OpenRouter-modellen, bouw eigen agents met tools en kennis (RAG), en genereer
marketingmateriaal on-brand. Te hosten op `fynn.fyndable.ai` achter login.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Vercel AI SDK 7 ·
@openrouter/ai-sdk-provider · Prisma 7 + PostgreSQL (pg adapter) · Vercel Blob ·
Auth.js/next-auth v4 (credentials) · Tailwind 4 + shadcn/ui (base-ui) · simple-git.

## Snelstart (lokaal)

```bash
cp .env.example .env          # vul OPENROUTER_API_KEY in
docker compose up -d db       # Postgres op :5432 (of zet DATABASE_URL naar Neon e.d.)
npm ci
npx prisma migrate deploy     # of: migrate dev
npx prisma db seed            # admin + Fyndable-brand + agents + templates
npm run dev                   # http://localhost:3000
```

Login: `admin@fynn.local` met het wachtwoord dat de seed print (of zet
`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` vóór de eerste seed).

## Docker

```bash
docker compose up -d --build          # bouwt + start op :3000
# of met eigen compose/proxy voor fynn.fyndable.ai + TLS (Caddy/nginx/Traefik)
```

Compose start de app plus een `postgres:17`-service. Losse container:
`docker run -p 3000:3000 -v fynn-data:/app/data --env-file .env fynn` met `DATABASE_URL`
naar een bestaande Postgres. (`RUN_SEED=1` om bij eerste start te seeden.)

## Vercel

1. Importeer de repo in Vercel (framework: Next.js, build command standaard).
2. **Storage → Prisma Postgres** (of Neon) koppelen; dit zet `DATABASE_URL`/`POSTGRES_URL`.
   De `pg`-adapter gebruikt de directe `postgres://`-URL; een `prisma+postgres://`-URL in
   `DATABASE_URL` wordt automatisch overgeslagen ten gunste van `POSTGRES_URL`.
3. **Storage → Blob** koppelen (private store); dit zet `BLOB_READ_WRITE_TOKEN`.
4. Env vars zetten: `AUTH_SECRET`, `NEXTAUTH_URL` (`https://fynn.fyndable.ai`),
   `OPENROUTER_API_KEY`, optioneel `FYNDABLE_WP_USER`/`FYNDABLE_WP_APP_PASSWORD`.
5. Migraties + seed eenmalig vanaf je eigen machine tegen de Neon-database:
   ```bash
   DATABASE_URL="<postgres://-url>" npx prisma migrate deploy
   DATABASE_URL="<postgres://-url>" SEED_ADMIN_PASSWORD="<sterk-wachtwoord>" npx prisma db seed
   ```
   Draai `migrate deploy` opnieuw na elke nieuwe migratie.
6. Domein `fynn.fyndable.ai` toevoegen onder Settings → Domains.

Beperkingen op Vercel: git-syncs moeten binnen de max. functieduur passen (`maxDuration`
staat op 300 s, het maximum op Hobby; op Pro kun je in `app/api/knowledge/[id]/sync/route.ts`
tot 800 s gaan); kennisbronnen van type `folder` werken alleen bij
self-hosting (lokale map).

## Concepten

- **Brands** (whitelabel): naam, logo, kleur/font-tokens, tone-of-voice, website.
  Agents en exports nemen de brand over; meerdere brands naast elkaar.
- **Agents**: system prompt + brand + default model + tool-groepen + kennisbronnen.
- **Kennisbronnen**: `file`, `url`, `sitemap` (site-crawl), `git` (clone+re-index),
  `folder` (lokale map met globs). Chunks → embeddings (OpenRouter) → cosine search.
- **Tools**: `search_knowledge`, `repo_search`/`repo_file`, Fyndable-admin-API
  (licenties/tenants/usage/revenue/GEO-scan/tickets), `web_search`, `fetch_url`,
  `generate_image`.
- **Model-catalogus**: gesynced van `GET openrouter.ai/api/v1/models` (Instellingen →
  ververs), selector met prijs/context/modaliteit.
- **Usage**: per-bericht tokens + geschatte kosten → `/usage`.

## Env

Zie `.env.example`. Belangrijk: `OPENROUTER_API_KEY` (vereist voor chat/embeddings/images),
`AUTH_SECRET`, `FYNDABLE_WP_USER`+`FYNDABLE_WP_APP_PASSWORD` (WP Application Password op
portal.fyndable.ai voor live platform-data).

## Data

Alle data staat in Postgres, ook een snapshot van de tekstbestanden van git-bronnen
(`RepoFile`, voor `repo_search`/`repo_file`); clones zijn tijdelijk (`$TMPDIR/fynn-repos`).
Uploads en images gaan naar Vercel Blob, of zonder `BLOB_READ_WRITE_TOKEN` naar
`./data/uploads` en `./data/images` (mount als volume bij self-hosting).
