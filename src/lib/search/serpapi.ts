import type { ImageSearchProvider, RawImageSearchResult } from "@/lib/search/provider";

type SerpImage = {
  title?: string;
  source?: string;
  link?: string;
  original?: string;
  thumbnail?: string;
  original_width?: number;
  original_height?: number;
};

export class SerpApiImageSearchProvider implements ImageSearchProvider {
  async searchImages(input: { query: string; limit?: number }) {
    const apiKey = process.env.IMAGE_SEARCH_API_KEY;
    if (!apiKey) throw new Error("IMAGE_SEARCH_API_KEY مطلوب لتشغيل SerpAPI.");

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_images");
    url.searchParams.set("q", input.query);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("safe", "active");
    url.searchParams.set("ijn", "0");

    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`فشل البحث عن الصور. HTTP ${response.status}`);
    const data = (await response.json()) as { images_results?: SerpImage[]; error?: string };
    if (data.error) throw new Error(data.error);

    return (data.images_results ?? [])
      .filter((item) => item.original || item.thumbnail)
      .slice(0, input.limit ?? 24)
      .map((item): RawImageSearchResult => {
        const originalUrl = item.original ?? item.thumbnail ?? "";
        return {
          title: item.title ?? "بدون عنوان",
          source: item.source ?? new URL(originalUrl).hostname,
          pageUrl: item.link,
          thumbnailUrl: item.thumbnail,
          originalUrl,
          width: item.original_width,
          height: item.original_height,
          fileName: originalUrl.split("/").pop()?.split("?")[0],
        };
      });
  }

  async getOriginalImageUrl(result: RawImageSearchResult) {
    return result.originalUrl;
  }

  async getMetadata(result: RawImageSearchResult) {
    return {
      title: result.title,
      source: result.source,
      fileName: result.fileName,
      width: result.width,
      height: result.height,
    };
  }
}
