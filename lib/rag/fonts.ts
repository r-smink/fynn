const CSS2 = "https://fonts.googleapis.com/css2";

/** Turn a Google Fonts input into a css2 stylesheet URL + display label.
 * Accepts a css2/css URL, a fonts.google.com link (specimen/share/query/family param),
 * or plain family names like "Outfit" or "Outfit, Inter". */
export function resolveGoogleFonts(input: string): { cssUrl: string; label: string; families: string[] } {
  const v = input.trim();
  if (!v) throw new Error("Geef een Google Fonts-link of familienaam op");
  if (v.includes("fonts.googleapis.com")) {
    const cssUrl = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const fams = (familyParam(cssUrl) ?? "")
      .split("|")
      .map((f) => decodeURIComponent(f.replace(/[:;@].*$/, "")).replace(/[+_]/g, " ").trim())
      .filter(Boolean);
    return { cssUrl, label: decodeURIComponent(familyParam(cssUrl) || cssUrl), families: fams };
  }
  const families = extractFamilies(v);
  if (!families.length) {
    throw new Error("Geen fontfamilie gevonden — gebruik een naam (bijv. Outfit) of een fonts.google.com-link");
  }
  return {
    cssUrl: css2Url(families),
    label: families.join(", "),
    families,
  };
}

export function css2Url(families: string[]): string {
  const q = families
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@100..900`)
    .join("&");
  return `${CSS2}?${q}&display=swap`;
}

function familyParam(url: string): string | null {
  try {
    return new URL(url).searchParams.get("family");
  } catch {
    return null;
  }
}

function extractFamilies(input: string): string[] {
  const v = input.trim();
  // fonts.google.com links: /specimen/Outfit, ?query=Outfit, ?family=Outfit:wght@600
  const specimen = v.match(/fonts\.google\.com\/specimen\/([^/?#&]+)/i);
  if (specimen) return [toFamilyName(specimen[1])];
  const m = v.match(/[?&](?:query|family|selection\.family)=([^&#]+)/i);
  if (m) {
    return m[1]
      .split("|")
      .map((f) => toFamilyName(f.replace(/[:;@].*$/, "")))
      .filter(Boolean);
  }
  if (/^https?:\/\//i.test(v)) return [];
  // plain input: comma/newline separated family names
  return v
    .split(/[,\n|]+/)
    .map((f) => toFamilyName(f.replace(/[:;@].*$/, "").trim()))
    .filter((f) => /^[a-zA-Z][a-zA-Z0-9 '\-]*$/.test(f));
}

const toFamilyName = (s: string) => decodeURIComponent(s).replace(/[+_]/g, " ").trim();
