import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const FYNDABLE_THEME = {
  primary: "#8F39AC",
  secondary: "#379FD3",
  gradient: "linear-gradient(135deg,#8F39AC 0%,#379FD3 100%)",
  headingFont: "Inter, system-ui, sans-serif",
  bodyFont: "Inter, system-ui, sans-serif",
};

async function main() {
  // --- admin user ---
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@fynn.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || `fynn-${Math.random().toString(36).slice(2, 10)}`;
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    await db.user.create({
      data: { email, name: "Admin", passwordHash: await bcrypt.hash(password, 12), role: "admin" },
    });
    console.log(`Admin aangemaakt: ${email} / ${password}`);
  } else {
    console.log(`Admin bestaat al: ${email}`);
  }

  // --- Fyndable brand ---
  const brand = await db.brand.upsert({
    where: { slug: "fyndable" },
    create: {
      name: "Fyndable",
      slug: "fyndable",
      description:
        "Fyndable Smart SEO — multi-tenant SaaS SEO-platform voor WordPress met GEO/AI-zoekmachine-zichtbaarheid.",
      websiteUrl: "https://fyndable.ai",
      toneOfVoice:
        "Professioneel maar toegankelijk. Duidelijk en concreet, geen jargon tenzij nodig. " +
        "Nederlands als hoofdtaal. Zelfverzekerd zonder overdrijving; focus op resultaat voor de gebruiker.",
      theme: JSON.stringify(FYNDABLE_THEME),
      isDefault: true,
    },
    update: {},
  });

  // --- agents ---
  const agents = [
    {
      slug: "fynn-expert",
      name: "Fynn — Fyndable Expert",
      description: "Productkennis, features en data van Fyndable. Antwoorden op vragen over het platform.",
      color: "#8F39AC",
      isDefault: true,
      defaultModel: "openai/gpt-4o-mini",
      temperature: 0.4,
      enabledTools: ["knowledge", "platform", "repo"],
      systemPrompt:
        "Je bent de Fyndable-expert van het team. Je kent het Fyndable Smart SEO platform door en door: " +
        "de client-plugin, het SaaS-dashboard, licenties, tiers, de GEO-scanner en alle ~115 modules. " +
        "Gebruik de kennisbank voor documentatie en de platform-tools voor live data (licenties, tenants, usage, scans). " +
        "Antwoord concreet en verwijs naar features/modules waar relevant.",
    },
    {
      slug: "fynn-marketing",
      name: "Fynn — Marketing",
      description: "Marketingmateriaal in de Fyndable-huisstijl: LinkedIn, blogs, nieuwsbrieven, ads, landingspagina's.",
      color: "#379FD3",
      defaultModel: "anthropic/claude-sonnet-4.5",
      temperature: 0.7,
      enabledTools: ["knowledge", "web", "image"],
      systemPrompt:
        "Je bent de marketing-copywriter van Fyndable. Je schrijft publicatie-klaar materiaal in de huisstijl " +
        "(paars #8F39AC → blauw #379FD3) en tone-of-voice van de brand. " +
        "Lever complete teksten: LinkedIn-posts, blogartikelen, nieuwsbrieven, advertenties, landingspagina-copy. " +
        "Denk mee over hooks, CTA's en doelgroep. Gebruik de kennisbank voor feiten over het product en " +
        "de generate_image-tool voor bijpassende visuals.",
    },
    {
      slug: "fynn-analyst",
      name: "Fynn — Analyst",
      description: "Live platform-data: licenties, tenants, MRR, usage en GEO-scans.",
      color: "#10b981",
      defaultModel: "openai/gpt-4o-mini",
      temperature: 0.2,
      enabledTools: ["platform", "web"],
      systemPrompt:
        "Je bent de data-analist. Beantwoord vragen over het Fyndable-platform met live data via de " +
        "platform-tools: licenties, tenants, MRR/ARR, usage en GEO-scans. " +
        "Presenteer getallen helder in tabellen waar nuttig en leg trends uit.",
    },
    {
      slug: "fynn-code",
      name: "Fynn — Code",
      description: "Vragen over de codebase van Fyndable (git-repo kennis + zoeken).",
      color: "#f59e0b",
      defaultModel: "anthropic/claude-sonnet-4.5",
      temperature: 0.3,
      enabledTools: ["knowledge", "repo"],
      systemPrompt:
        "Je bent de senior developer van het Fyndable-team. Je kent de codebase: de WordPress-plugins " +
        "(fyndable-client, fyndable-saas-dashboard), de Shopify-app en de Android-app. " +
        "Gebruik repo_search en repo_file om concrete code te vinden en verwijs naar bestanden/regels.",
    },
  ];

  for (const a of agents) {
    await db.agent.upsert({
      where: { slug: a.slug },
      create: { ...a, enabledTools: JSON.stringify(a.enabledTools), brandId: brand.id },
      update: {},
    });
  }

  // --- knowledge sources (relatieve paden t.o.v. deze repo — pas aan in productie) ---
  const sources = [
    {
      name: "Fyndable platform-docs",
      type: "file",
      brandId: brand.id,
      config: { localPath: "C:\\WorkSpace\\Fyndable\\FYNDABLE.md" },
    },
    {
      name: "Fyndable technical log",
      type: "file",
      brandId: brand.id,
      config: { localPath: "C:\\WorkSpace\\Fyndable\\AGENTS.md" },
    },
    {
      name: "Fyndable CVI / design tokens",
      type: "folder",
      brandId: brand.id,
      config: {
        localPath: "C:\\WorkSpace\\Fyndable\\overig\\WebElementsFyn\\_ds\\fyndable-design-system-229a7a30-6c0f-4026-8cef-5d274871d71f",
      },
    },
    {
      name: "fyndable.ai website",
      type: "sitemap",
      brandId: brand.id,
      config: { url: "https://fyndable.ai", maxPages: 60 },
    },
  ];

  for (const s of sources) {
    const exists = await db.knowledgeSource.findFirst({ where: { name: s.name } });
    if (!exists) {
      await db.knowledgeSource.create({ data: { ...s, config: JSON.stringify(s.config) } });
    }
  }

  // --- marketing templates ---
  const templates = [
    {
      title: "LinkedIn-post",
      category: "linkedin",
      prompt:
        "Schrijf een LinkedIn-post voor Fyndable over [ONDERWERP]. Haak: sterke eerste zin. " +
        "Body: 3-5 korte alinea's met concrete waarde voor de lezer. " +
        "Sluit af met een vraag of CTA. Max 150 woorden, Nederlandse tone-of-voice, geen emoji-overdaad.",
    },
    {
      title: "Blogartikel",
      category: "blog",
      prompt:
        "Schrijf een blogartikel voor fyndable.ai over [ONDERWERP]. Structuur: pakkende H1, " +
        "inleiding die het probleem schetst, 3-5 secties met H2's, praktische tips, " +
        "en een afsluiting met CTA naar Fyndable. SEO-vriendelijk, ~800 woorden.",
    },
    {
      title: "Nieuwsbrief",
      category: "nieuwsbrief",
      prompt:
        "Schrijf een nieuwsbrief voor Fyndable-gebruikers over [ONDERWERP/NIEUWS]. " +
        "Onderwerpregel + preview-tekst + 3 korte blokken met CTA-knoppen-teksten. Persoonlijk en helder.",
    },
    {
      title: "Advertentie-varianten",
      category: "advertentie",
      prompt:
        "Maak 5 advertentie-varianten voor Fyndable over [ONDERWERP]: " +
        "elk met headline (max 30 tekens), beschrijving (max 90 tekens) en CTA. " +
        "Varieer de invalshoek: pijn, resultaat, USP, sociale bewijskracht, urgentie.",
    },
    {
      title: "Landingspagina-sectie",
      category: "landingspagina",
      prompt:
        "Schrijf de copy voor een landingspagina-sectie over [ONDERWERP]: " +
        "H2-titel, intro-alinea, 3 feature-bullets met titels, en een CTA. " +
        "Lever ook een suggestie voor een bijpassende visual (Engelse image-prompt).",
    },
  ];

  for (const t of templates) {
    const exists = await db.promptTemplate.findFirst({ where: { title: t.title, brandId: brand.id } });
    if (!exists) {
      await db.promptTemplate.create({ data: { ...t, brandId: brand.id } });
    }
  }

  console.log("Seed klaar.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
