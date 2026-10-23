import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function objectPathFromManifest(value: unknown, origin: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  if (/^series\/[a-zA-Z0-9-]+\//.test(raw) && !raw.split("/").includes("..")) return raw;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.origin !== origin) return null;
  const prefix = "/storage/v1/object/public/rotruyen-pages/";
  if (!url.pathname.startsWith(prefix)) return null;
  let path: string;
  try { path = decodeURIComponent(url.pathname.slice(prefix.length)); } catch { return null; }
  if (!path || path.startsWith("/") || path.split("/").includes("..") || path.includes("\\0")) return null;
  if (!path.startsWith("series/")) return null;
  return path;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return respond(500, { error: "Storage signing is not configured" });

  let body: { chapterId?: unknown };
  try { body = await req.json(); } catch { return respond(400, { error: "Invalid JSON" }); }
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)) {
    return respond(400, { error: "A valid chapterId is required" });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: chapter, error: chapterError } = await adminClient
    .from("rotruyen_chapters")
    .select("id,series_id,is_published,page_manifest")
    .eq("id", chapterId)
    .maybeSingle();
  if (chapterError) return respond(500, { error: "Could not load chapter" });
  if (!chapter) return respond(404, { error: "Chapter not found" });

  const { data: series, error: seriesError } = await adminClient
    .from("rotruyen_series")
    .select("id,is_published,is_locked")
    .eq("id", chapter.series_id)
    .maybeSingle();
  if (seriesError) return respond(500, { error: "Could not load series" });
  if (!series) return respond(404, { error: "Series not found" });

  let isAdmin = false;
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData } = await authClient.auth.getUser(bearer);
    const user = authData?.user;
    if (user) {
      const { data: profile } = await adminClient.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
      isAdmin = profile?.role === "admin" && (!profile.account_status || profile.account_status === "active");
    }
  }

  const publicReadable = chapter.is_published === true && series.is_published === true && series.is_locked !== true;
  if (!publicReadable && !isAdmin) return respond(403, { error: "Chapter is not publicly readable" });

  const pages = Array.isArray(chapter.page_manifest) ? chapter.page_manifest : [];
  const storageOrigin = new URL(supabaseUrl).origin;
  const paths: string[] = [];
  const pagePathIndexes: Array<number | null> = [];
  for (const page of pages) {
    if (page && typeof page === "object" && (page as Record<string, unknown>).type === "text") {
      pagePathIndexes.push(null);
      continue;
    }
    const candidate = typeof page === "string" ? page : page && typeof page === "object" ? (page as Record<string, unknown>).url : null;
    const path = objectPathFromManifest(candidate, storageOrigin);
    if (path) {
      pagePathIndexes.push(paths.length);
      paths.push(path);
      continue;
    }
    // External images are retained only for already-public chapters during the migration.
    if (publicReadable && typeof candidate === "string" && /^https:\/\//i.test(candidate)) {
      pagePathIndexes.push(null);
      continue;
    }
    if (!publicReadable && candidate) return respond(409, { error: "Locked chapter contains an image that cannot be protected by Storage signed URLs" });
    pagePathIndexes.push(null);
  }

  const uniquePaths = [...new Set(paths)];
  const signedByPath = new Map<string, string>();
  if (uniquePaths.length) {
    const { data: signed, error: signError } = await adminClient.storage.from("rotruyen-pages").createSignedUrls(uniquePaths, 900);
    if (signError || !signed) return respond(502, { error: "Could not sign chapter images" });
    for (const item of signed) {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    }
  }

  let pathCursor = 0;
  const outputPages = pages.map((page, index) => {
    const pathIndex = pagePathIndexes[index];
    if (pathIndex !== null) {
      const path = paths[pathIndex];
      const signedUrl = signedByPath.get(path);
      if (signedUrl) return typeof page === "string" ? signedUrl : { ...(page as Record<string, unknown>), url: signedUrl };
    }
    return page;
  });

  // Reject a manifest if any Storage image could not be signed; never silently return its public URL.
  for (let i = 0; i < pages.length; i++) {
    if (pagePathIndexes[i] !== null) {
      const original = pages[i];
      const path = paths[pagePathIndexes[i] as number];
      if (!signedByPath.has(path)) return respond(502, { error: "One or more chapter images could not be signed" });
    }
  }

  return respond(200, { chapterId, expiresIn: 900, pages: outputPages });
});
