import { prisma } from "@/lib/db";
import { fetchExternalImage } from "@/lib/http";
import { productMatchScore, imageQualityScore } from "@/lib/matching";
import { buildSearchQuery } from "@/lib/query";
import { getStorageProvider } from "@/lib/storage";
import { storageKeyForImage } from "@/lib/storage-key";
import type { ProductInput } from "@/lib/types";
import {
  detectWatermarkFromEvidence,
  inspectImageBuffer,
  processImage,
  sha256,
  validateMinimumDimensions,
  validatePublicImageUrl,
} from "@/lib/image/validation";
import { getRuntimeImageLimits } from "@/lib/settings";

export async function approveAndHostImage(input: {
  product: ProductInput;
  sourceUrl: string;
  searchEvidence?: string;
}) {
  const limits = await getRuntimeImageLimits();
  const steps: string[] = ["Fetching Original"];

  const fetched = await fetchExternalImage(input.sourceUrl, {
    maxBytes: limits.maxFileSize,
    timeoutMs: 12_000,
    maxRedirects: 4,
    retries: 2,
  });

  steps.push("Validating");
  const original = await inspectImageBuffer(fetched.buffer);
  validateMinimumDimensions(original.width, original.height, limits.minWidth, limits.minHeight);

  const originalHash = sha256(fetched.buffer);
  const duplicate = await prisma.hostedImage.findUnique({ where: { hash: originalHash }, include: { product: true } });
  if (duplicate) {
    const report = await validatePublicImageUrl(duplicate.publicUrl, limits.minWidth, limits.minHeight);
    return {
      duplicate: true,
      steps: [...steps, "Testing URL", report.status],
      hostedImage: duplicate,
      compatibility: report,
    };
  }

  steps.push("Processing");
  const processed = await processImage(fetched.buffer, original.mimeType, original.hasAlpha);
  const processedInfo = await inspectImageBuffer(processed.buffer);
  const processedHash = sha256(processed.buffer);
  const duplicateProcessed = await prisma.hostedImage.findUnique({ where: { hash: processedHash }, include: { product: true } });
  if (duplicateProcessed) {
    const report = await validatePublicImageUrl(duplicateProcessed.publicUrl, limits.minWidth, limits.minHeight);
    return {
      duplicate: true,
      steps: [...steps, "Testing URL", report.status],
      hostedImage: duplicateProcessed,
      compatibility: report,
    };
  }

  const storageKey = storageKeyForImage(input.product, processedHash, processed.extension);
  const storage = getStorageProvider();

  steps.push("Uploading");
  const upload = await storage.uploadImage({
    key: storageKey,
    buffer: processed.buffer,
    contentType: processed.mimeType,
  });

  steps.push("Testing URL");
  const compatibility = await validatePublicImageUrl(upload.publicUrl, limits.minWidth, limits.minHeight);
  if (compatibility.status !== "READY") {
    throw new Error(compatibility.reason ?? "تعذر الوصول للرابط العام.");
  }

  const product = await prisma.product.create({
    data: {
      name: input.product.name,
      sku: input.product.sku || null,
      brand: input.product.brand || null,
      model: input.product.model || null,
      color: input.product.color || null,
      variant: input.product.variant || null,
    },
  });

  const evidence = [buildSearchQuery(input.product), input.searchEvidence, input.sourceUrl].filter(Boolean).join(" ");
  const matchScore = productMatchScore(input.product, evidence);
  const watermarkStatus = detectWatermarkFromEvidence(evidence);
  const qualityScore = imageQualityScore({
    matchScore,
    width: processedInfo.width,
    height: processedInfo.height,
    watermarkStatus,
    mimeType: processed.mimeType,
  });

  const hostedImage = await prisma.hostedImage.create({
    data: {
      productId: product.id,
      sourceUrl: input.sourceUrl,
      storageKey: upload.storageKey,
      publicUrl: upload.publicUrl,
      hash: processedHash,
      width: processedInfo.width,
      height: processedInfo.height,
      mimeType: processed.mimeType,
      fileSize: processed.buffer.length,
      matchScore,
      qualityScore,
      watermarkStatus,
      compatibilityStatus: compatibility.status,
      compatibilityReport: compatibility,
    },
    include: { product: true },
  });

  return {
    duplicate: false,
    steps: [...steps, "READY"],
    hostedImage,
    compatibility,
  };
}
