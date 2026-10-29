import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteRecord, getRecord } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, "image-delete", 20, 60);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const record = await getRecord(id);
    if (!record) return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });
    await deleteRecord(record);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
