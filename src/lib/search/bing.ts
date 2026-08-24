import type { ImageSearchProvider, RawImageSearchResult } from "@/lib/search/provider";

type BingImage = {
  name?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  hostPageUrl?: string;
  hostPageDisplayUrl?: string;
  encodingFormat?: string;
  width?: number;
  height?: number;
};

export class BingImageSearchProvider implements ImageSearchProvider {
  async searchImages(input: { query: string; limit?: number }) {
    const apiKey = process.env.IMAGE_SEARCH_API_KEY;
    if (!apiKey) throw new Error("IMAGE_SEARCH_API_KEY مطلوب لتشغيل Bing Image Search.");

    const url = new URL("https://api.bing.microsoft.com/v7.0/images/search");
    url.searchParams.set("q", input.query);
    url.searchParams.set("safeSearch", "Moderate");
    url.searchParams.set("count", String(input.limit ?? 24));
    url.searchParams.set("imageType", "Photo");

    const response = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`فشل البحث عن الصور. HTTP ${response.status}`);
    const data = (await response.json()) as { value?: BingImage[] };

    return (data.value ?? [])
      .filter((item) => item.contentUrl)
      .map((item): RawImageSearchResult => {
        const originalUrl = item.contentUrl ?? "";
        return {
          title: item.name ?? "بدون عنوان",
          source: item.hostPageDisplayUrl ?? new URL(originalUrl).hostname,
          pageUrl: item.hostPageUrl,
          thumbnailUrl: item.thumbnailUrl,
          originalUrl,
          width: item.width,
          height: item.height,
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
