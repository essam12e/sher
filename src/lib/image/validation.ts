import crypto from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import type { CompatibilityCheck, WatermarkStatus } from "@/lib/types";
import { fetchExternalImage } from "@/lib/http";

const supportedMimes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

export async function inspectImageBuffer(buffer: Buffer) {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !supportedMimes.has(detected.mime)) {
    throw new Error("نوع الملف غير مدعوم أو لا يعيد صورة حقيقية.");
  }

  const sharp = await loadSharp();
  const metadata = await sharp(buffer, { failOn: "error" }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("تعذر قراءة أبعاد الصورة.");
  }

  return {
    width: metadata.width,
    height: metadata.height,
    mimeType: detected.mime,
    extension: detected.ext === "jpg" ? "jpg" : detected.ext,
    hasAlpha: Boolean(metadata.hasAlpha),
  };
}

export function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function processImage(buffer: Buffer, mimeType: string, hasAlpha: boolean) {
  const sharp = await loadSharp();
  const image = sharp(buffer).rotate().withMetadata({ exif: undefined });
  if (mimeType === "image/png" && hasAlpha) {
    return {
      buffer: await image.png({ compressionLevel: 9, effort: 8 }).toBuffer(),
      mimeType: "image/png",
      extension: "png",
    };
  }

  return {
    buffer: await image.jpeg({ quality: 88, mozjpeg: true }).toBuffer(),
    mimeType: "image/jpeg",
    extension: "jpg",
  };
}

export function validateMinimumDimensions(width: number, height: number, minWidth: number, minHeight: number) {
  if (width < minWidth || height < minHeight) {
    throw new Error(`الصورة أقل من الحد المطلوب ${minWidth}×${minHeight}.`);
  }
}

export function detectWatermarkFromEvidence(evidence: string): WatermarkStatus {
  const text = evidence.toLowerCase();
  const strong = ["watermark", "shutterstock", "alamy", "dreamstime", "123rf", "stock photo"];
  const possible = ["logo", "store", "shop", "promo", "offer", "sale", "خصم", "عرض", "متجر"];

  if (strong.some((word) => text.includes(word))) return "Watermark Detected";
  if (possible.some((word) => text.includes(word))) return "Possible Watermark";
  return "No Watermark Detected";
}

export async function validatePublicImageUrl(url: string, minWidth = 500, minHeight = 500): Promise<CompatibilityCheck> {
  const result: CompatibilityCheck = {
    https: false,
    httpStatus: 0,
    contentType: null,
    publicAccess: false,
    directImage: false,
    serverFetch: false,
    dimensions: null,
    permanentUrl: false,
    contentLength: null,
    redirectCount: 0,
    finalUrl: url,
    status: "FAILED",
  };

  try {
    const parsed = new URL(url);
    result.https = parsed.protocol === "https:";
    if (!result.https) throw new Error("الرابط ليس HTTPS.");

    const fetched = await fetchExternalImage(url, {
      timeoutMs: 10_000,
      maxBytes: 20 * 1024 * 1024,
      maxRedirects: 4,
      retries: 0,
    });

    result.httpStatus = fetched.status;
    result.contentType = fetched.contentType;
    result.contentLength = fetched.contentLength ?? fetched.buffer.length;
    result.redirectCount = fetched.redirectCount;
    result.finalUrl = fetched.finalUrl;
    result.publicAccess = true;
    result.serverFetch = true;
    result.directImage = Boolean(fetched.contentType?.startsWith("image/"));
    if (!result.directImage) throw new Error("الرابط لا يعيد صورة مباشرة.");

    const metadata = await inspectImageBuffer(fetched.buffer);
    validateMinimumDimensions(metadata.width, metadata.height, minWidth, minHeight);

    result.dimensions = `${metadata.width}×${metadata.height}`;
    result.permanentUrl = !/[?&](expires|signature|x-amz-expires|token)=/i.test(url);
    if (!result.permanentUrl) throw new Error("الرابط يبدو مؤقتًا أو موقّعًا.");

    result.status = "READY";
    return result;
  } catch (error) {
    result.reason = error instanceof Error ? error.message : "فشل اختبار رابط الصورة.";
    return result;
  }
}
