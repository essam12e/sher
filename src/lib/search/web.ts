/**
 * بحث الصور بدون أي مفتاح API.
 *
 * Google Images لا يعيد نتائج للطلبات من الخادم (الصفحة تتطلب JavaScript)،
 * لذلك نقرأ صفحة نتائج الصور العامة في Bing مباشرة كما يفتحها المتصفح،
 * ومع فشلها نستخدم DuckDuckGo كبديل تلقائي. لا يوجد أي تسجيل أو مفتاح.
 */

export type RawImageSearchResult = {
  title: string;
  source: string;
  pageUrl?: string;
  thumbnailUrl?: string;
  originalUrl: string;
  /** نسخة مخزنة لدى محرك البحث نستخدمها إذا منع الموقع الأصلي التحميل */
  fallbackUrl?: string;
  width?: number;
  height?: number;
  fileName?: string;
  engine: "bing" | "duckduckgo";
};

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const htmlHeaders = {
  "user-agent": BROWSER_UA,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "ar,en-US;q=0.9,en;q=0.8",
};

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function fileNameOf(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    return url.split("/").pop()?.split("?")[0];
  }
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

async function fetchText(url: string, init: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/** يحلل صفحة نتائج صور Bing ويستخرج الرابط الأصلي لكل صورة وبياناتها. */
export function parseBingImagesHtml(html: string): RawImageSearchResult[] {
  const results: RawImageSearchResult[] = [];
  const anchor = /class="iusc"/g;
  const positions: number[] = [];
  for (let match = anchor.exec(html); match; match = anchor.exec(html)) positions.push(match.index);

  positions.forEach((start, index) => {
    const end = positions[index + 1] ?? Math.min(html.length, start + 6000);
    // نبدأ قبل class قليلًا لأن خاصية m قد تأتي قبلها أو بعدها داخل نفس الوسم
    const tagStart = html.lastIndexOf("<a", start);
    const segment = html.slice(tagStart >= 0 ? tagStart : start, end);
    const raw = segment.match(/\sm="([^"]+)"/)?.[1];
    if (!raw) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(decodeEntities(raw));
    } catch {
      return;
    }
    if (!isHttpUrl(data.murl)) return;

    const href = decodeEntities(segment.match(/\shref="([^"]+)"/)?.[1] ?? "");
    const params = new URLSearchParams(href.split("?")[1] ?? "");
    const cdnUrl = params.get("cdnurl") ?? undefined;
    const width = Number(params.get("expw")) || undefined;
    const height = Number(params.get("exph")) || undefined;
    const title = String(data.t ?? data.desc ?? "").replace(/\s+/g, " ").trim();
    const pageUrl = isHttpUrl(data.purl) ? data.purl : undefined;

    results.push({
      title: title || "بدون عنوان",
      source: hostOf(pageUrl) || hostOf(data.murl),
      pageUrl,
      thumbnailUrl: isHttpUrl(data.turl) ? data.turl : undefined,
      originalUrl: data.murl,
      fallbackUrl: isHttpUrl(cdnUrl) ? cdnUrl : undefined,
      width,
      height,
      fileName: fileNameOf(data.murl),
      engine: "bing",
    });
  });

  return results;
}

async function searchBing(query: string) {
  const url = new URL("https://www.bing.com/images/async");
  url.searchParams.set("q", query);
  url.searchParams.set("first", "0");
  url.searchParams.set("count", "35");
  url.searchParams.set("mmasync", "1");
  const html = await fetchText(url.toString(), {
    headers: { ...htmlHeaders, cookie: "SRCHHPGUSR=ADLT=MODERATE" },
  });
  return parseBingImagesHtml(html);
}

type DuckImage = {
  title?: string;
  image?: string;
  thumbnail?: string;
  url?: string;
  width?: number;
  height?: number;
  source?: string;
};

export function parseDuckDuckGoJson(json: string): RawImageSearchResult[] {
  let data: { results?: DuckImage[] };
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  return (data.results ?? [])
    .filter((item) => isHttpUrl(item.image))
    .map((item) => ({
      title: (item.title ?? "").trim() || "بدون عنوان",
      source: hostOf(item.url) || hostOf(item.image),
      pageUrl: isHttpUrl(item.url) ? item.url : undefined,
      thumbnailUrl: isHttpUrl(item.thumbnail) ? item.thumbnail : undefined,
      originalUrl: item.image as string,
      width: item.width || undefined,
      height: item.height || undefined,
      fileName: fileNameOf(item.image as string),
      engine: "duckduckgo" as const,
    }));
}

async function searchDuckDuckGo(query: string) {
  const page = await fetchText(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: htmlHeaders,
  });
  const vqd = page.match(/vqd=["']?([\d-]+)/)?.[1];
  if (!vqd) throw new Error("DuckDuckGo token missing");
  const url = new URL("https://duckduckgo.com/i.js");
  url.searchParams.set("l", "wt-wt");
  url.searchParams.set("o", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("vqd", vqd);
  url.searchParams.set("f", ",,,,,");
  url.searchParams.set("p", "1");
  const json = await fetchText(url.toString(), {
    headers: { ...htmlHeaders, accept: "application/json", referer: "https://duckduckgo.com/" },
  });
  return parseDuckDuckGoJson(json);
}

/** يبحث في Bing أولًا ثم DuckDuckGo، ويزيل الروابط المكررة. */
export async function searchWebImages(query: string, limit = 24): Promise<RawImageSearchResult[]> {
  const errors: string[] = [];
  for (const engine of [searchBing, searchDuckDuckGo]) {
    try {
      const results = await engine(query);
      if (results.length) {
        const seen = new Set<string>();
        return results
          .filter((result) => {
            if (seen.has(result.originalUrl)) return false;
            seen.add(result.originalUrl);
            return true;
          })
          .slice(0, limit);
      }
      errors.push(`${engine.name}: no results`);
    } catch (error) {
      errors.push(`${engine.name}: ${error instanceof Error ? error.message : "error"}`);
    }
  }
  console.warn("image search failed", errors);
  return [];
}

/** رابط بحث جوجل صور يفتحه المستخدم في متصفحه */
export function googleImagesUrl(query: string) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
