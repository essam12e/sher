import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { optionalProductSchema, apiError } from "@/lib/api";
import { hostImageFromUrl } from "@/lib/hosting-service";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const httpUrl = z
  .string()
  .trim()
  .min(1, "ضع رابط الصورة.")
  .refine((value) => /^https?:\/\//i.test(value) && URL.canParse(value), "الرابط غير صالح. يجب أن يبدأ بـ https://");

const schema = z.object({
  product: optionalProductSchema,
  sourceUrl: httpUrl,
  fallbackUrl: httpUrl.optional(),
  pageUrl: httpUrl.optional(),
  searchEvidence: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "image-approve", 20, 60);
  if (limited) return limited;

  try {
    const input = schema.parse(await request.json());
    const result = await hostImageFromUrl(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
