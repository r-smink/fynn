import { env } from "@/lib/env";

function authHeader() {
  return "Basic " + Buffer.from(`${env.wpUser}:${env.wpPassword}`).toString("base64");
}

export function wpConfigured() {
  return !!(env.wpUser && env.wpPassword);
}

type WpPostPayload = {
  title: string;
  content: string;
  status?: "draft" | "publish" | "future" | "pending" | "private";
  categories?: number[];
  tags?: number[];
  featured_media?: number;
};

async function wpFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${env.wpSiteUrl}/wp-json/wp/v2${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`WordPress ${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

/** Maakt een post aan (standaard als draft) en geeft {id, link} terug. */
export async function wpCreatePost(p: WpPostPayload): Promise<{ id: number; link: string; status: string }> {
  const post = await wpFetch("/posts", {
    method: "POST",
    body: JSON.stringify({
      title: p.title,
      content: p.content,
      status: p.status ?? "draft",
      ...(p.categories?.length && { categories: p.categories }),
      ...(p.tags?.length && { tags: p.tags }),
      ...(p.featured_media && { featured_media: p.featured_media }),
    }),
  });
  return { id: post.id, link: post.link, status: post.status };
}

/** Zet een bestaand post-id op status publish. */
export async function wpPublishPost(id: number): Promise<{ id: number; link: string }> {
  const post = await wpFetch(`/posts/${id}`, {
    method: "POST",
    body: JSON.stringify({ status: "publish" }),
  });
  return { id: post.id, link: post.link };
}
