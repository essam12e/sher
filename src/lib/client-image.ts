"use client";

const MAX_UPLOAD = 4 * 1024 * 1024;
const DIRECT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * يجهز الصورة قبل رفعها: يحوّل صيغ مثل HEIC (صور الآيفون) إلى JPEG
 * ويصغّر الصور الأكبر من 4MB لأن Vercel يرفض الطلبات الأكبر من 4.5MB.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (DIRECT_TYPES.has(file.type) && file.size <= MAX_UPLOAD) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("تعذر قراءة الصورة على هذا الجهاز. جرّب صورة بصيغة JPG أو PNG.");
  }

  let maxSide = 2400;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) break;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (blob && blob.size <= MAX_UPLOAD) {
      bitmap.close();
      const name = file.name.replace(/\.[^.]+$/, "") || "image";
      return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
    }
    maxSide = Math.round(maxSide * 0.75);
  }
  bitmap.close();
  throw new Error("الصورة كبيرة جدًا ولم نتمكن من ضغطها. جرّب صورة أصغر.");
}
