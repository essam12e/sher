import { NextResponse, type NextRequest } from "next/server";
import { productSchema, apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildSearchQuery } from "@/lib/query";
import { searchProductImages } from "@/lib/search/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "image-search", 20, 60);
  if (limited) return limited;

  try {
    const product = productSchema.parse(await request.json());
    const query = buildSearchQuery(product);
    const results = await searchProductImages(product);
    return NextResponse.json({ query, results });
  } catch (error) {
    return apiError(error);
  }
}
