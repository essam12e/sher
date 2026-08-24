import { BingImageSearchProvider } from "@/lib/search/bing";
import type { ImageSearchProvider } from "@/lib/search/provider";
import { SerpApiImageSearchProvider } from "@/lib/search/serpapi";

export function getImageSearchProvider(): ImageSearchProvider {
  const provider = process.env.IMAGE_SEARCH_PROVIDER ?? "serpapi";
  if (provider === "serpapi") return new SerpApiImageSearchProvider();
  if (provider === "bing") return new BingImageSearchProvider();
  throw new Error(`Search provider غير مدعوم: ${provider}`);
}
