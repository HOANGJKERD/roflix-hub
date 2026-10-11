export type MangaDexManga = {
  id: string;
  attributes: {
    title?: Record<string, string>;
    description?: Record<string, string>;
    status?: string;
    contentRating?: string;
    year?: number;
    tags?: Array<{ id: string; attributes?: { name?: Record<string, string> } }>;
  };
  relationships?: Array<{ id: string; type: string; attributes?: { name?: string; fileName?: string } }>;
};

export type CatalogItem = {
  id: string;
  title: string;
  description: string;
  author: string;
  coverUrl: string | null;
  tags: string[];
  genreKeys: string[];
  status: string;
  contentRating: string;
  year: number | null;
};

export type CatalogResponse = {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
};

function preferredText(value?: Record<string, string>): string {
  if (!value) return "";
  return value.vi || value.en || Object.values(value)[0] || "";
}

export function mapMangaDexItem(item: MangaDexManga): CatalogItem {
  const cover = item.relationships?.find((r) => r.type === "cover_art")?.attributes?.fileName;
  const author = item.relationships?.find((r) => r.type === "author")?.attributes?.name;
  const sourceTags = item.attributes.tags || [];
  const tags = sourceTags
    .map((tag) => preferredText(tag.attributes?.name))
    .filter(Boolean);
  // Keep stable English tag keys for filtering even when the visible label is localized.
  const genreKeys = sourceTags.flatMap((tag) => {
    const names = tag.attributes?.name;
    return names ? Object.values(names).map((name) => name.toLocaleLowerCase("en")) : [];
  });
  return {
    id: item.id,
    title: preferredText(item.attributes.title) || "Chưa có tiêu đề",
    description: preferredText(item.attributes.description) || "Chưa có mô tả.",
    author: author || "Đang cập nhật",
    coverUrl: cover
      ? `https://uploads.mangadex.org/covers/${encodeURIComponent(item.id)}/${encodeURIComponent(cover)}.256.jpg`
      : null,
    tags,
    genreKeys,
    status: item.attributes.status || "unknown",
    contentRating: item.attributes.contentRating || "safe",
    year: item.attributes.year || null,
  };
}
