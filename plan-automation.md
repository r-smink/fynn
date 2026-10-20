# Plan: geautomatiseerde taken in FYNN

## 0. Wat er al staat

- Agents met eigen system prompt, tools en model (incl. fusion-templates).
- `lib/tools/platform.ts`: bestaande koppeling met `portal.fyndable.ai` via WP Application Password (`FYNDABLE_WP_USER` / `FYNDABLE_WP_APP_PASSWORD`) — alleen de Fyndable admin-API (`/wp-json/ai-seo-saas/v1/...`), nog geen `wp/v2` publicatie.
- `lib/storage.ts`: uploads/images in Vercel Blob of `FYNN_DATA_DIR`.
- Er is **nog geen** scheduler, geen schrijf-toegang tot WordPress `wp/v2`, geen social-koppeling en geen code-opslag naar git.

## 1. Architectuur: scheduled tasks

Nieuw concept naast "chat": een **taak** = (schedule + agent/prompt + actie).

**Datamodel** (Prisma):
- `Task`: `id`, `userId`, `name`, `agentId?`, `fusionModel?` (hergebruik `model`-veld aanpak incl. `fusion:<id>`), `prompt` (of templateId), `schedule` (cron-expressie), `action` (`wordpress_post` | `instagram_post` | `chat_run` | `devin_session`), `actionConfig` (JSON: site, status draft/publish, hashtags, repo…), `enabled`, `lastRunAt`.
- `TaskRun`: `taskId`, `status` (running|done|error|awaiting_approval), `output` (tekst/link naar post/PR), `cost`, `createdAt`.

**Trigger**: Vercel Cron → `GET /api/cron/run-due` (beveiligd met `CRON_SECRET` header) die verlopen tasks uitvoert.
⚠️ Vercel Hobby beperkt cron tot 1×/dag — voor echte schema's (wekelijks blog, dagelijkse posts) is Pro nodig, óf een externe scheduler (bijv. cron-job.org of GitHub Actions schedule) die het endpoint aanroept. Goedkoop alternatief: GitHub Action met `schedule:` in deze repo die `curl /api/cron/run-due` doet — gratis en betrouwbaar.

**Uitvoering**: bestaande chat-pipeline hergebruiken (`buildSystemPrompt` + `buildTools` + `streamText`/`generateText` zonder streaming), output → actie-handler. Elke run logt usage via `logUsage` zoals nu.

**Goedkeuring**: standaard `draft`-modus — posts gaan naar WP draft / IG container zonder publish, en verschijnen op een `/tasks` pagina waar je met één klik publiceert. Pas later "auto-publish" per task inschakelen.

## 2. Blog posts → fyndable.ai (WordPress)

fyndable.ai is WordPress; je hebt al een Application User (de bestaande `FYNDABLE_WP_*` credentials zijn precies daarvoor bedoeld).

- Nieuwe tool/handler `wordpressPublish({ title, contentHtml, status: "draft"|"publish", categories, tags, featuredImageUrl? })` → `POST {site}/wp-json/wp/v2/posts` met Basic auth (`user:app-password`).
- Aparte env-vars per site als je meerdere WP-sites wilt: `WP_SITES` JSON of een `WPSite` tabel (naam, url, user, app-password als secret-ref).
- Flow: task genereert post met agent (brand + kennisbank = tone of voice klopt), maakt WP **draft**, `TaskRun.output` = draft-URL. Jij reviewt in WP en drukt op publish, of FYNN krijgt "publiceren"-knop die `status: publish` PATCHt.
- Uit te breiden met: featured image via `IMAGE_MODEL` genereren → upload naar WP `/wp/v2/media` → koppelen aan post. Zelfde werkt voor seo meta (Yoast/RankMath meta velden via REST `meta`-veld).

## 3. Instagram

Vereist: **Instagram Business/Creator account** gekoppeld aan een Facebook-pagina + een Meta-app met `instagram_content_publish` permissie. Dat is eenmalig handmatig Meta-gedoe (app review kan dagen duren als je boven "test" wil).

Flow (Graph API, 2 calls):
1. `POST /{ig-user-id}/media` met `image_url` (public URL — gegenereerde image via Vercel Blob public-serve of een tijdelijke signed URL) + `caption`.
2. `POST /{ig-user-id}/media_publish` met `creation_id`.

Te bewaren in env/secrets: `IG_USER_ID`, `META_ACCESS_TOKEN` (long-lived, 60 dagen → refresh-task nodig: `GET /oauth/access_token?grant_type=fb_exchange_token`).

Zonder Meta-app kan niet geautomatiseerd gepost worden (persoonlijke accounts zijn uitgesloten van de API).

## 4. Codeer-/development-taken: waar "leeft" code?

Nu: **nergens persistent**. De chat kan wel repo-tools gebruiken, maar die lezen `RepoFile` (kennisbank, read-only). Gegenereerde code blijft in berichten of gaat naar een export — er is geen git-write.

Drie niveaus:

| Niveau | Wat | Hoe |
|---|---|---|
| A. Snel | "Sla dit script/snippet op" | Nieuwe `Snippet`/`Artifact` tabel (of Vercel Blob key) + `/code` pagina met versies/download. Klein, direct bruikbaar. |
| B. Repo | Gegenereerde code als commit in een git repo | `GITHUB_TOKEN` (PAT met `repo` scope) + GitHub REST: create-repo (`POST /user/repos`) en commits via `PUT /repos/{o}/{r}/contents/{path}` of de git/trees API. Task-actie `github_commit` pusht gegenereerde bestanden. |
| C. Echte dev-agent | Multi-file features/PRs | **Devin API** (`https://api.devin.ai/v3/sessions`) — een task start een Devin-sessie met een prompt, die opent zelf een PR op `r-smink/*`. `TaskRun.output` = PR-link. Sterkste optie: jij reviewt PRs in plaats van losse code. |

Aanrader: A nu, C als task-actie `devin_session` (API-key als secret). B alleen als je FYNN zelf apps wil laten deployen zonder PR-review.

## 5. Voorgestelde volgorde

1. **Fase 1 (1 PR)**: `Task`/`TaskRun` + `/tasks` beheer-pagina + `/api/cron/run-due` + GitHub Actions scheduler + actie `wordpress_post` (draft!). = "iedere week om 9:00 een blogdraft op fyndable.ai" werkt.
2. **Fase 2**: approval-flow op `/tasks` (knop "publiceren"), featured image via IMAGE_MODEL.
3. **Fase 3**: Instagram (na Meta-app goedkeuring) — hergebruikt dezelfde task-infra.
4. **Fase 4**: `devin_session` actie + optioneel snippets-opslag.

## 6. Wat ik van jou nodig heb om te starten

- Bevestig fase 1 scope (blog-drafts ok? welke categorie/status?).
- WP: werkt de bestaande `FYNDABLE_WP_USER`/`APP_PASSWORD` ook voor `fyndable.ai/wp-json/wp/v2/posts` (niet alleen portal)? Anders losse app-password voor de site zelf.
- Cron-keuze: GitHub Actions scheduler (gratis) vs Vercel Pro.
- Instagram: heb je een Business account + bereidheid een Meta-app aan te maken?
- Dev-taken: Devin API key (org `prive-ricksmink-nl`) als fase 4 gewenst is.
