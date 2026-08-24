import { NextResponse, type NextRequest } from "next/server";
import { productSchema, apiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildSearchQuery } from "@/lib/query";
import { searchProductImages } from "@/lib/search/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "image-search", 20, 60);
  if (limited) return limited;

  try {
    const product = productSchema.parse(await request.json());
    const query = buildSearchQuery(product);
    const productRecord = await prisma.product.create({
      data: {
        name: product.name,
        sku: product.sku || null,
        brand: product.brand || null,
        model: product.model || null,
        color: product.color || null,
        variant: product.variant || null,
      },
    });
    await prisma.searchSession.create({ data: { query, productId: productRecord.id } });

    const results = await searchProductImages(product);
    return NextResponse.json({ query, results });
  } catch (error) {
    return apiError(error);
  }
}
