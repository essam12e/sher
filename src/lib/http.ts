import { assertPublicUrl } from "@/lib/ssrf";

type FetchImageOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  retries?: number;
};

export type FetchedImage = {
  buffer: Buffer;
  contentType: string | null;
  contentLength: number | null;
  finalUrl: string;
  status: number;
  redirectCount: number;
};

async function fetchOnce(rawUrl: string, options: Required<FetchImageOptions>, redirectCount = 0): Promise<FetchedImage> {
  const url = await assertPublicUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "NitaqImageBot/1.0 (+https://vercel.app)",
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.1",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount >= options.maxRedirects) {
        throw new Error("تجاوز الرابط الحد المسموح من التحويلات.");
      }
      const location = response.headers.get("location");
      if (!location) throw new Error("تحويل بدون رابط وجهة.");
      const nextUrl = new URL(location, url).toString();
      await assertPublicUrl(nextUrl);
      return fetchOnce(nextUrl, options, redirectCount + 1);
    }

    const contentLength = Number(response.headers.get("content-length")) || null;
    if (contentLength && contentLength > options.maxBytes) {
      throw new Error("حجم الصورة أكبر من الحد المسموح.");
    }

    if (!response.ok) {
      throw new Error(`تعذر الوصول للصورة الأصلية. HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("تعذر قراءة محتوى الصورة.");

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        if (received > options.maxBytes) {
          throw new Error("حجم الصورة أكبر من الحد المسموح.");
        }
        chunks.push(value);
      }
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: response.headers.get("content-type"),
      contentLength,
      finalUrl: response.url || url.toString(),
      status: response.status,
      redirectCount,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchExternalImage(rawUrl: string, options: FetchImageOptions = {}) {
  const resolved: Required<FetchImageOptions> = {
    timeoutMs: options.timeoutMs ?? 10_000,
    maxBytes: options.maxBytes ?? 15 * 1024 * 1024,
    maxRedirects: options.maxRedirects ?? 4,
    retries: options.retries ?? 2,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= resolved.retries; attempt += 1) {
    try {
      return await fetchOnce(rawUrl, resolved);
    } catch (error) {
      lastError = error;
      if (attempt === resolved.retries) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("فشل جلب الصورة.");
}
