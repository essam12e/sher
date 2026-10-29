import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readSettings, writeSettings } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  minWidth: z.number().int().min(100, "أقل عرض 100").max(4000, "أقصى عرض 4000"),
  minHeight: z.number().int().min(100, "أقل ارتفاع 100").max(4000, "أقصى ارتفاع 4000"),
  maxFileSizeMb: z.number().int().min(1, "أقل حجم 1MB").max(50, "أقصى حجم 50MB"),
});

export async function GET() {
  try {
    return NextResponse.json(await readSettings());
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "settings", 10, 60);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    await writeSettings(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
