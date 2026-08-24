import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { validatePublicImageUrl } from "@/lib/image/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRuntimeImageLimits } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ url: z.string().url() });

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "url-checker", 30, 60);
  if (limited) return limited;

  try {
    const { url } = schema.parse(await request.json());
    const limits = await getRuntimeImageLimits();
    const report = await validatePublicImageUrl(url, limits.minWidth, limits.minHeight);
    return NextResponse.json({ report });
  } catch (error) {
    return apiError(error);
  }
}
