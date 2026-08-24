import type { ImageSearchResult, ProductInput } from "@/lib/types";

export type RawImageSearchResult = {
  title: string;
  source: string;
  pageUrl?: string;
  thumbnailUrl?: string;
  originalUrl: string;
  width?: number;
  height?: number;
  fileName?: string;
};

export type ImageSearchProvider = {
  searchImages(input: ProductInput & { query: string; limit?: number }): Promise<RawImageSearchResult[]>;
  getOriginalImageUrl(result: RawImageSearchResult): Promise<string>;
  getMetadata(result: RawImageSearchResult): Promise<Record<string, string | number | undefined>>;
};

export type EnrichedSearchResult = ImageSearchResult;
