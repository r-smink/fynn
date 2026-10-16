import { tool } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";

/** Client for the Fyndable SaaS admin REST API (portal.fyndable.ai). */
async function portalGet(pathname: string, params?: Record<string, string | number>) {
  if (!env.portalUser || !env.portalPassword) {
    return { error: "Fyndable portal API is niet geconfigureerd (FYNDABLE_WP_USER / FYNDABLE_WP_APP_PASSWORD)." };
  }
  const url = new URL(`/wp-json/ai-seo-saas/v1/admin${pathname}`, env.portalUrl);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: {
      Authorization: "Basic " + Buffer.from(`${env.portalUser}:${env.portalPassword}`).toString("base64"),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const body = await res.text();
  if (!res.ok) return { error: `Portal API ${res.status}: ${body.slice(0, 300)}` };
  try { return JSON.parse(body); } catch { return { raw: body.slice(0, 4000) }; }
}

async function portalPost(pathname: string, payload: unknown) {
  if (!env.portalUser || !env.portalPassword) {
    return { error: "Fyndable portal API is niet geconfigureerd." };
  }
  const res = await fetch(`${env.portalUrl}/wp-json/ai-seo-saas/v1/admin${pathname}`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${env.portalUser}:${env.portalPassword}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  if (!res.ok) return { error: `Portal API ${res.status}: ${body.slice(0, 300)}` };
  try { return JSON.parse(body); } catch { return { raw: body.slice(0, 4000) }; }
}

export function platformTools() {
  return {
    license_stats: tool({
      description: "Fyndable licentie-dashboard statistieken (totaal, actief, per tier).",
      inputSchema: z.object({}),
      execute: async () => portalGet("/licenses/stats"),
    }),
    list_licenses: tool({
      description: "Lijst Fyndable-licenties met optionele filters.",
      inputSchema: z.object({
        status: z.string().optional().describe("bijv. active, revoked"),
        tier: z.string().optional().describe("starter|professional|business|agency"),
        search: z.string().optional(),
        limit: z.number().int().max(100).default(25),
      }),
      execute: async ({ status, tier, search, limit }) =>
        portalGet("/licenses", { ...(status && { status }), ...(tier && { tier }), ...(search && { search }), limit }),
    }),
    list_tenants: tool({
      description: "Lijst Fyndable-tenants (klanten) met filters.",
      inputSchema: z.object({
        status: z.string().optional(),
        tier: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().int().max(100).default(25),
      }),
      execute: async ({ status, tier, search, limit }) =>
        portalGet("/tenants", { ...(status && { status }), ...(tier && { tier }), ...(search && { search }), limit }),
    }),
    tenant_detail: tool({
      description: "Detail van één tenant incl. usage en onboarding.",
      inputSchema: z.object({ tenantKey: z.string() }),
      execute: async ({ tenantKey }) => portalGet(`/tenants/${tenantKey}`),
    }),
    usage_overview: tool({
      description: "API-usage overzicht per actieve tenant (calls, kosten).",
      inputSchema: z.object({}),
      execute: async () => portalGet("/usage"),
    }),
    revenue_stats: tool({
      description: "MRR/ARR en omzet per tier.",
      inputSchema: z.object({}),
      execute: async () => portalGet("/revenue/stats"),
    }),
    recent_geo_scans: tool({
      description: "Recente GEO-readiness scans.",
      inputSchema: z.object({ limit: z.number().int().max(50).default(10) }),
      execute: async ({ limit }) => portalGet("/geo-scan/recent", { limit }),
    }),
    run_geo_scan: tool({
      description: "Start een GEO-readiness scan voor een URL (async, duurt 30-90s). Geeft scan_id terug.",
      inputSchema: z.object({
        url: z.string(),
        keywords: z.array(z.string()).max(5),
        language: z.string().default("auto"),
      }),
      execute: async (input) => portalPost("/geo-scan", input),
    }),
    geo_scan_status: tool({
      description: "Status/rapport van een GEO-scan op id.",
      inputSchema: z.object({ scanId: z.string() }),
      execute: async ({ scanId }) => portalGet(`/geo-scan/${scanId}`),
    }),
    support_tickets: tool({
      description: "Support-tickets van het platform.",
      inputSchema: z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }),
      execute: async ({ status, search }) =>
        portalGet("/support/tickets", { ...(status && { status }), ...(search && { search }) }),
    }),
  };
}
