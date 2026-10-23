/** Ingebouwde stijl-presets voor de beeldstudio; eigen presets staan in de db (ImageStyle). */
export type ImageStylePreset = { id: string; name: string; emoji: string; prompt: string };

export const BUILTIN_IMAGE_STYLES: ImageStylePreset[] = [
  { id: "builtin:photo", name: "Fotorealistisch", emoji: "📷", prompt: "photorealistic, shot on a full-frame camera, natural lighting, sharp focus, high detail" },
  { id: "builtin:cinematic", name: "Cinematisch", emoji: "🎬", prompt: "cinematic film still, dramatic lighting, shallow depth of field, anamorphic lens, color graded" },
  { id: "builtin:3d", name: "3D render", emoji: "🧊", prompt: "3D render, soft studio lighting, smooth materials, octane render, clean background" },
  { id: "builtin:clay", name: "Klei", emoji: "🧸", prompt: "claymation style, handmade plasticine look, soft shadows, playful" },
  { id: "builtin:flat", name: "Flat illustratie", emoji: "🟦", prompt: "flat vector illustration, simple shapes, limited color palette, clean lines, no gradients" },
  { id: "builtin:isometric", name: "Isometrisch", emoji: "🔷", prompt: "isometric illustration, 30-degree angle, clean geometric shapes, soft colors" },
  { id: "builtin:watercolor", name: "Aquarel", emoji: "🎨", prompt: "watercolor painting, soft washes, visible paper texture, delicate brush strokes" },
  { id: "builtin:sketch", name: "Schets", emoji: "✏️", prompt: "pencil sketch, hand-drawn line art, cross-hatching, monochrome" },
  { id: "builtin:anime", name: "Anime", emoji: "🌸", prompt: "anime style, cel shading, vibrant colors, expressive characters" },
  { id: "builtin:pixel", name: "Pixel art", emoji: "👾", prompt: "pixel art, 16-bit retro game style, crisp pixels, limited palette" },
  { id: "builtin:product", name: "Productfoto", emoji: "🛍️", prompt: "professional product photography, seamless studio backdrop, softbox lighting, e-commerce ready" },
  { id: "builtin:social", name: "Social post", emoji: "📱", prompt: "eye-catching social media visual, bold composition, vibrant colors, modern marketing style" },
];

export const ASPECT_RATIOS = ["1:1", "4:5", "3:4", "16:9", "9:16", "3:2"] as const;

/** Hoeveel de AI een kennisbank-afbeelding mag aanpassen wanneer die als referentie dient. */
export const EDIT_POLICIES = {
  locked: {
    label: "Beschermd",
    hint: "Exact overnemen — vorm, kleuren en details blijven identiek",
    instruction:
      "is a PROTECTED brand asset. Reproduce it EXACTLY as in the reference: identical shape, proportions, colors, " +
      "facial features, outfit, logo and every detail. Do NOT redesign, restyle, simplify or reinterpret it. " +
      "Only its placement, size and the surrounding scene may change.",
  },
  minimal: {
    label: "Beperkt",
    hint: "Herkenbaar houden — alleen houding, hoek of belichting mag variëren",
    instruction:
      "is a brand asset that must stay clearly recognizable: keep its design, colors, proportions and key details. " +
      "Only pose, angle, expression and lighting may vary slightly to fit the scene.",
  },
  free: {
    label: "Vrij",
    hint: "Inspiratie — de AI mag het beeld vrij interpreteren",
    instruction: "is loose inspiration; you may reinterpret it freely.",
  },
} as const;

export type EditPolicy = keyof typeof EDIT_POLICIES;

export function isEditPolicy(value: unknown): value is EditPolicy {
  return typeof value === "string" && value in EDIT_POLICIES;
}
