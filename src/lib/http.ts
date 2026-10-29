import { assertPublicUrl } from "@/lib/ssrf";
import { BROWSER_UA } from "@/lib/search/web";

type FetchImageOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  retries?: number;
  /** صفحة المصدر؛ بعض المواقع ترفض تحميل الصورة بدونها */
  referer?: string;
  /** إذا كان الرابط صفحة منتج وليس صورة، نستخرج صورة og:image منها */
  resolveHtml?: boolean;
};

export type FetchedImage = {
  buffer: Buffer;
  contentType: string | null;
  contentLength: number | null;
  finalUrl: string;
  status: number;
  redirectCount: number;
};

/** يحوّل الروابط التي ينسخها الناس من نتائج البحث إلى رابط الصورة الفعلي. */
export function unwrapImageUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, "");
    // google.com/imgres?imgurl=... و bing.com/images/search?mediaurl=...
    const nested =
      (/(^|\.)google\.[a-z.]+$/.test(host) && (url.searchParams.get("imgurl") || url.searchParams.get("url"))) ||
      (/(^|\.)bing\.com$/.test(host) && url.searchParams.get("mediaurl")) ||
      null;
    if (nested && /^https?:\/\//i.test(nested)) return nested;
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

/** يستخرج رابط الصورة الرئيسية من صفحة HTML (og:image أو twitter:image). */
export function extractOgImage(html: string, baseUrl: string) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image(?::src)?)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const found = html.match(pattern)?.[1];
    if (found) {
      try {
        return new URL(found.replace(/&amp;/g, "&"), baseUrl).toString();
      } catch {
        // نجرب النمط التالي
      }
    }
  }
  return null;
}

function safeReferer(referer?: string) {
  if (!referer) return undefined;
  try {
    // ترميز الرابط ضروري: الروابط العربية في Referer كانت تُفشل الطلب بالكامل
    return new URL(referer).href;
  } catch {
    return undefined;
  }
}

async function readLimited(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("تعذر قراءة محتوى الصورة.");
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("حجم الصورة أكبر من الحد المسموح.");
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}

async function fetchOnce(
  rawUrl: string,
  options: Required<Omit<FetchImageOptions, "referer">> & { referer?: string },
  redirectCount = 0,
  htmlHops = 0,
): Promise<FetchedImage> {
  const url = await assertPublicUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const referer = safeReferer(options.referer);
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "user-agent": BROWSER_UA,
        accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*;q=0.8,text/html;q=0.5,*/*;q=0.1",
        "accept-language": "ar,en-US;q=0.9,en;q=0.8",
        ...(referer ? { referer } : {}),
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount >= options.maxRedirects) {
        throw new Error("تجاوز الرابط الحد المسموح من التحويلات.");
      }
      const location = response.headers.get("location");
      if (!location) throw new Error("تحويل بدون رابط وجهة.");
      const nextUrl = new URL(location, url).toString();
      return fetchOnce(nextUrl, options, redirectCount + 1, htmlHops);
    }

    const contentLength = Number(response.headers.get("content-length")) || null;
    if (contentLength && contentLength > options.maxBytes) {
      throw new Error("حجم الصورة أكبر من الحد المسموح.");
    }

    if (!response.ok) {
      throw new Error(
        response.status === 403 || response.status === 401
          ? "الموقع الأصلي يمنع تحميل الصورة. جرّب صورة أخرى أو ارفعها من جهازك."
          : `تعذر الوصول للصورة. HTTP ${response.status}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (options.resolveHtml && htmlHops === 0 && contentType?.includes("text/html")) {
      const html = (await readLimited(response, 3 * 1024 * 1024)).toString("utf8");
      const imageUrl = extractOgImage(html, url.toString());
      if (!imageUrl) throw new Error("الرابط صفحة وليس صورة، ولم نجد صورة رئيسية داخلها. انسخ رابط الصورة نفسها.");
      return fetchOnce(imageUrl, { ...options, referer: url.toString() }, redirectCount, htmlHops + 1);
    }

    const buffer = await readLimited(response, options.maxBytes);
    return {
      buffer,
      contentType,
      contentLength,
      finalUrl: url.toString(),
      status: response.status,
      redirectCount,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("انتهت مهلة تحميل الصورة من الموقع الأصلي.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchExternalImage(rawUrl: string, options: FetchImageOptions = {}) {
  const resolved = {
    timeoutMs: options.timeoutMs ?? 10_000,
    maxBytes: options.maxBytes ?? 15 * 1024 * 1024,
    maxRedirects: options.maxRedirects ?? 4,
    retries: options.retries ?? 1,
    resolveHtml: options.resolveHtml ?? false,
    referer: options.referer,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= resolved.retries; attempt += 1) {
    try {
      return await fetchOnce(unwrapImageUrl(rawUrl), resolved);
    } catch (error) {
      lastError = error;
      // لا فائدة من إعادة المحاولة إذا كان المنع أو الحجم هو السبب
      if (error instanceof Error && /يمنع|الحد المسموح|غير صالح|محظور|خاص|صفحة وليس/.test(error.message)) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("فشل جلب الصورة.");
}

/** يجرب الرابط الأصلي ثم الروابط البديلة (نسخة محرك البحث) بالترتيب. */
export async function fetchImageWithFallbacks(urls: (string | undefined)[], options: FetchImageOptions = {}) {
  const candidates = urls.filter((url): url is string => Boolean(url));
  let firstError: unknown;
  for (const [index, url] of candidates.entries()) {
    try {
      const fetched = await fetchExternalImage(url, index === 0 ? options : { ...options, referer: undefined });
      return { ...fetched, usedUrl: url, usedFallback: index > 0 };
    } catch (error) {
      firstError ??= error;
    }
  }
  throw firstError instanceof Error ? firstError : new Error("فشل جلب الصورة.");
}
