import { fetchExternalImage } from "@/lib/http";
import { imageQualityScore, productMatchScore } from "@/lib/matching";
import { buildSearchQuery } from "@/lib/query";
import { getImageSearchProvider } from "@/lib/search";
import type { RawImageSearchResult } from "@/lib/search/provider";
import type { ImageSearchResult, ProductInput } from "@/lib/types";
import { detectWatermarkFromEvidence, inspectImageBuffer } from "@/lib/image/validation";
import { getRuntimeImageLimits } from "@/lib/settings";

// الدليل يُبنى من بيانات النتيجة فقط. سابقًا كانت بيانات المنتج نفسها تُضاف للنص
// فتحصل كل النتائج تقريبًا على Match Score مرتفع حتى لو كانت لمنتج آخر.
function evidenceFor(result: RawImageSearchResult) {
  return [
    result.title,
    result.source,
    result.fileName,
    result.originalUrl,
  ]
    .filter(Boolean)
    .join(" ");
}

type Limits = Awaited<ReturnType<typeof getRuntimeImageLimits>>;

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

  try {
    const original = await fetchExternalImage(result.originalUrl, {
      maxBytes: limits.maxFileSize,
      timeoutMs: 8_000,
      maxRedirects: 4,
      retries: 1,
    });
    const image = await inspectImageBuffer(original.buffer);
    width = image.width;
    height = image.height;
    mimeType = image.mimeType;
    fileSize = original.buffer.length;

    if (width < limits.minWidth || height < limits.minHeight) {
      rejectionReason = "الصورة أقل من الحد المطلوب";
    }
  } catch (error) {
    rejectionReason = error instanceof Error ? error.message : "تعذر فحص الصورة الأصلية";
  }

  const qualityScore = imageQualityScore({ matchScore, width, height, watermarkStatus, mimeType });

  return {
    id: `${index}-${Buffer.from(result.originalUrl).toString("base64url").slice(0, 16)}`,
    title: result.title,
    source: result.source,
    pageUrl: result.pageUrl,
    thumbnailUrl: result.thumbnailUrl,
    originalUrl: result.originalUrl,
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
  };
}

export async function searchProductImages(product: ProductInput) {
  const provider = getImageSearchProvider();
  const query = buildSearchQuery(product);
  if (!query) throw new Error("اكتب اسم المنتج أو بياناته أولًا.");

  const [rawResults, limits] = await Promise.all([
    provider.searchImages({ ...product, query, limit: 24 }),
    getRuntimeImageLimits(),
  ]);

  // إزالة الروابط المكررة قبل الفحص لتوفير الوقت.
  const seen = new Set<string>();
  const unique = rawResults.filter((result) => {
    if (!result.originalUrl || seen.has(result.originalUrl)) return false;
    seen.add(result.originalUrl);
    return true;
  });

  const top = unique.slice(0, 12);
  const enriched = await Promise.all(top.map((result, index) => enrichResult(product, result, index, limits)));

  return enriched.sort(
    (a, b) =>
      Number(b.isAcceptable) - Number(a.isAcceptable) ||
      b.qualityScore - a.qualityScore ||
      b.matchScore - a.matchScore,
  );
}
