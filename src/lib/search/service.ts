import { fetchImageWithFallbacks } from "@/lib/http";
import { imageQualityScore, productMatchScore } from "@/lib/matching";
import { buildSearchQuery } from "@/lib/query";
import { searchWebImages, type RawImageSearchResult } from "@/lib/search/web";
import type { ImageSearchResult, ProductInput } from "@/lib/types";
import { detectWatermarkFromEvidence, inspectImageBuffer } from "@/lib/image/validation";
import { getImageLimits } from "@/lib/store";

type Limits = Awaited<ReturnType<typeof getImageLimits>>;

// الدليل يُبنى من بيانات النتيجة فقط، وليس من بيانات المنتج المدخلة
function evidenceFor(result: RawImageSearchResult) {
  return [result.title, result.source, result.fileName, result.originalUrl].filter(Boolean).join(" ");
}

async function enrichResult(
  product: ProductInput,
  result: RawImageSearchResult,
  index: number,
  limits: Limits,
): Promise<ImageSearchResult> {
  const evidence = evidenceFor(result);
  const matchScore = productMatchScore(product, evidence);
  const watermarkStatus = detectWatermarkFromEvidence(evidence);

  let width = result.width;
  let height = result.height;
  let mimeType: string | undefined;
  let fileSize: number | undefined;
  let rejectionReason: string | undefined;
  let usedFallback = false;

  try {
    // نفحص الصورة الأصلية فعليًا (وليس المصغّرة) ونجرب نسخة محرك البحث إن منع الموقع التحميل
    const original = await fetchImageWithFallbacks([result.originalUrl, result.fallbackUrl], {
      maxBytes: limits.maxFileSize,
      timeoutMs: 7_000,
      maxRedirects: 4,
      retries: 0,
      referer: result.pageUrl,
    });
    const image = await inspectImageBuffer(original.buffer);
    width = image.width;
    height = image.height;
    mimeType = image.mimeType;
    fileSize = original.buffer.length;
    usedFallback = original.usedFallback;

    if (width < limits.minWidth || height < limits.minHeight) {
      rejectionReason = `الصورة ${width}×${height} أقل من الحد المطلوب ${limits.minWidth}×${limits.minHeight}`;
    }
  } catch (error) {
    rejectionReason = error instanceof Error ? error.message : "تعذر فحص الصورة الأصلية";
  }

  const qualityScore = imageQualityScore({ matchScore, width, height, watermarkStatus, mimeType });

  return {
    id: `${index}-${Buffer.from(result.originalUrl).toString("base64url").slice(-16)}`,
    title: result.title,
    source: result.source,
    pageUrl: result.pageUrl,
    thumbnailUrl: result.thumbnailUrl,
    originalUrl: result.originalUrl,
    fallbackUrl: result.fallbackUrl,
    fileName: result.fileName,
    width,
    height,
    mimeType,
    fileSize,
    matchScore,
    qualityScore,
    watermarkStatus,
    isAcceptable: !rejectionReason && width !== undefined && height !== undefined,
    rejectionReason,
    usedFallback,
  };
}

export async function searchProductImages(product: ProductInput) {
  const query = buildSearchQuery(product);
  if (!query) throw new Error("اكتب اسم المنتج أو بياناته أولًا.");

  const [rawResults, limits] = await Promise.all([searchWebImages(query, 24), getImageLimits()]);
  if (!rawResults.length) return [];

  const top = rawResults.slice(0, 16);
  const enriched = await Promise.all(top.map((result, index) => enrichResult(product, result, index, limits)));

  return enriched.sort(
    (a, b) =>
      Number(b.isAcceptable) - Number(a.isAcceptable) ||
      b.qualityScore - a.qualityScore ||
      b.matchScore - a.matchScore,
  );
}
