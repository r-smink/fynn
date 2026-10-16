# FYNN — whitelabel AI-chatplatform

Eigen ChatGPT/Claude-achtige chatinterface voor het Fyndable-team: chat met willekeurige
OpenRouter-modellen, bouw eigen agents met tools en kennis (RAG), en genereer
marketingmateriaal on-brand. Te hosten op `fynn.fyndable.ai` achter login.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Vercel AI SDK 7 ·
@openrouter/ai-sdk-provider · Prisma 7 + SQLite (better-sqlite3 adapter) ·
Auth.js/next-auth v4 (credentials) · Tailwind 4 + shadcn/ui (base-ui) · simple-git.

## Snelstart (lokaal)

```bash
cp .env.example .env          # vul OPENROUTER_API_KEY in
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

`docker run -p 3000:3000 -v fynn-data:/app/data --env-file .env fynn`
(`RUN_SEED=1` om bij eerste start te seeden.)

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

`./data/` bevat: `fynn.db` (SQLite), `repos/` (gesyncede git-clones), `uploads/`,
`images/` (gegenereerde visuals). Mount als volume in productie.
