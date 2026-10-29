import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { validatePublicImageUrl } from "@/lib/image/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getImageLimits, getRecord, saveRecord } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, "image-retest", 30, 60);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const record = await getRecord(id);
    if (!record) return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });

    const limits = await getImageLimits();
    const report = await validatePublicImageUrl(record.publicUrl, limits.minWidth, limits.minHeight);
    const updated = await saveRecord({ ...record, compatibilityStatus: report.status, compatibilityReport: report });
    return NextResponse.json({ image: updated, report });
  } catch (error) {
    return apiError(error);
  }
}
