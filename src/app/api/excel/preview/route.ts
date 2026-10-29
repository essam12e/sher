import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { MAX_EXCEL_BYTES, previewWorkbook } from "@/lib/excel";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "excel-preview", 20, 60);
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sheetName = formData.get("sheetName");
    if (!(file instanceof File)) throw new Error("ارفع ملف Excel بصيغة xlsx.");
    if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("يدعم النظام ملفات xlsx فقط.");
    if (file.size > MAX_EXCEL_BYTES) throw new Error("حجم ملف Excel أكبر من 10MB.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await previewWorkbook(buffer, typeof sheetName === "string" && sheetName ? sheetName : undefined);
    return NextResponse.json(preview);
  } catch (error) {
    return apiError(error);
  }
}
