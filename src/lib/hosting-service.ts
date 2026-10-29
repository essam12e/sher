import { fetchImageWithFallbacks } from "@/lib/http";
import { imageQualityScore, productMatchScore } from "@/lib/matching";
import { storageKeyForImage } from "@/lib/storage-key";
import { getImageLimits, getRecord, saveRecord, uploadImage, assertStorage, type HostedRecord } from "@/lib/store";
import type { ProductInput } from "@/lib/types";
import {
  detectWatermarkFromEvidence,
  inspectImageBuffer,
  processImage,
  sha256,
  validateMinimumDimensions,
  validatePublicImageUrl,
} from "@/lib/image/validation";

export type HostResult = {
  duplicate: boolean;
  steps: string[];
  hostedImage: HostedRecord;
  compatibility: HostedRecord["compatibilityReport"];
};

function cleanProduct(input: ProductInput) {
  return {
    name: input.name?.trim() || "صورة منتج",
    sku: input.sku?.trim() || null,
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
  };
}

async function testUrl(url: string, minWidth: number, minHeight: number) {
  // محاولة ثانية بعد لحظة في حال لم يكن الملف قد انتشر على CDN بعد
  let report = await validatePublicImageUrl(url, minWidth, minHeight);
  if (report.status !== "READY") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    report = await validatePublicImageUrl(url, minWidth, minHeight);
  }
  return report;
}

/** المسار الكامل: صورة خام -> فحص -> معالجة -> رفع -> اختبار الرابط -> حفظ البيانات */
export async function hostImageBuffer(input: {
  buffer: Buffer;
  product: ProductInput;
  sourceUrl: string;
  searchEvidence?: string;
}): Promise<HostResult> {
  assertStorage();
  const limits = await getImageLimits();
  const steps = ["Validating"];

  if (input.buffer.length > limits.maxFileSize) {
    throw new Error(`حجم الصورة أكبر من ${Math.round(limits.maxFileSize / 1024 / 1024)}MB.`);
  }

  const original = await inspectImageBuffer(input.buffer);
  validateMinimumDimensions(original.width, original.height, limits.minWidth, limits.minHeight);

  steps.push("Processing");
  const processed = await processImage(input.buffer, original.mimeType, original.hasAlpha);
  const info = await inspectImageBuffer(processed.buffer);
  const id = sha256(processed.buffer);

  const existing = await getRecord(id);
  if (existing) {
    const report = await testUrl(existing.publicUrl, limits.minWidth, limits.minHeight);
    return { duplicate: true, steps: [...steps, "Testing URL", report.status], hostedImage: existing, compatibility: report };
  }

  const product = cleanProduct(input.product);
  const key = storageKeyForImage({ name: product.name, sku: product.sku ?? undefined }, id, processed.extension);

  steps.push("Uploading");
  const publicUrl = await uploadImage(key, processed.buffer, processed.mimeType);

  steps.push("Testing URL");
  const compatibility = await testUrl(publicUrl, limits.minWidth, limits.minHeight);
  if (compatibility.status !== "READY") {
    throw new Error(compatibility.reason ?? "تعذر الوصول للرابط العام بعد الرفع.");
  }

  const evidence = [input.searchEvidence, input.sourceUrl].filter(Boolean).join(" ");
  const matchScore = input.searchEvidence ? productMatchScore(input.product, evidence) : 100;
  const watermarkStatus = detectWatermarkFromEvidence(evidence);

  const record: HostedRecord = {
    id,
    publicUrl,
    imageKey: key,
    sourceUrl: input.sourceUrl,
    width: info.width,
    height: info.height,
    mimeType: processed.mimeType,
    fileSize: processed.buffer.length,
    matchScore,
    qualityScore: imageQualityScore({
      matchScore,
      width: info.width,
      height: info.height,
      watermarkStatus,
      mimeType: processed.mimeType,
    }),
    watermarkStatus,
    compatibilityStatus: compatibility.status,
    compatibilityReport: compatibility,
    createdAt: new Date().toISOString(),
    product,
  };
  await saveRecord(record);

  return { duplicate: false, steps: [...steps, "READY"], hostedImage: record, compatibility };
}

/** تحويل رابط صورة (أو صفحة منتج) إلى رابط مستضاف */
export async function hostImageFromUrl(input: {
  product: ProductInput;
  sourceUrl: string;
  fallbackUrl?: string;
  pageUrl?: string;
  searchEvidence?: string;
}) {
  assertStorage();
  const limits = await getImageLimits();
  const fetched = await fetchImageWithFallbacks([input.sourceUrl, input.fallbackUrl], {
    maxBytes: limits.maxFileSize,
    timeoutMs: 15_000,
    maxRedirects: 5,
    retries: 1,
    referer: input.pageUrl,
    resolveHtml: true,
  });

  return hostImageBuffer({
    buffer: fetched.buffer,
    product: input.product,
    sourceUrl: fetched.finalUrl,
    searchEvidence: input.searchEvidence,
  });
}
