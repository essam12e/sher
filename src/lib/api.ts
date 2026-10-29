import { NextResponse } from "next/server";
import { z } from "zod";

export function apiError(error: unknown, status = 400) {
  const message =
    error instanceof z.ZodError
      ? (error.issues[0]?.message && !/^(Invalid|Expected|Too)/.test(error.issues[0].message)
          ? error.issues[0].message
          : "البيانات المرسلة غير صحيحة.")
      : error instanceof Error
        ? error.message
        : "حدث خطأ غير متوقع.";
  return NextResponse.json({ error: message }, { status });
}

export const productSchema = z.object({
  name: z.string().trim().min(2, "اسم المنتج مطلوب.").max(200),
  brand: z.string().optional().default(""),
  model: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  color: z.string().optional().default(""),
  variant: z.string().optional().default(""),
});
