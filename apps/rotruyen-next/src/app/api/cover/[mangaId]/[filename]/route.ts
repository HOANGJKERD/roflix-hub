import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

const UUID = /^[0-9a-f-]{36}$/i;
const FILE = /^[a-zA-Z0-9._-]{1,180}$/;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ mangaId: string; filename: string }> },
) {
  const { mangaId, filename } = await context.params;
  if (!UUID.test(mangaId) || !FILE.test(filename) || filename.includes("..")) {
    return NextResponse.json({ message: "Invalid cover path" }, { status: 400 });
  }

  const upstream = new URL(
    `https://uploads.mangadex.org/covers/${mangaId}/${filename}`,
  );

  try {
    const response = await fetch(upstream, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "RoHub/1.0 (RoTruyen manga catalog)",
      },
      cache: "force-cache",
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { message: "Cover unavailable from MangaDex", status: response.status },
        { status: response.status === 404 ? 404 : 502 },
      );
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ message: "Upstream did not return an image" }, { status: 502 });
    }
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Could not reach MangaDex cover server" }, { status: 502 });
  }
}
