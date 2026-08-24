import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { productSchema, apiError } from "@/lib/api";
import { approveAndHostImage } from "@/lib/hosting-service";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  product: productSchema,
  sourceUrl: z.string().url(),
  searchEvidence: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "image-approve", 15, 60);
  if (limited) return limited;

  try {
    const input = schema.parse(await request.json());
    const result = await approveAndHostImage(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
