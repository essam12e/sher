import { NextResponse, type NextRequest } from "next/server";
import { apiError, optionalProductSchema } from "@/lib/api";
import { hostImageBuffer } from "@/lib/hosting-service";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// حد Vercel لحجم الطلب 4.5MB؛ الواجهة تضغط الصور الأكبر قبل الرفع
const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "image-upload", 20, 60);
  if (limited) return limited;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("اختر صورة من جهازك.");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("حجم الصورة كبير جدًا. الحد 4MB.");

    let product = {};
    try {
      product = JSON.parse(String(form.get("product") ?? "{}"));
    } catch {
      product = {};
    }

    const result = await hostImageBuffer({
      buffer: Buffer.from(await file.arrayBuffer()),
      product: optionalProductSchema.parse(product),
      sourceUrl: `upload:${file.name || "image"}`,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
