import { type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { exportWorkbookWithImageUrls } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  workbookId: z.string(),
  sheetName: z.string(),
  mapping: z.object({
    productNameColumn: z.string(),
    skuColumn: z.string().optional(),
    productIdColumn: z.string().optional(),
    imageUrlColumn: z.string(),
  }),
  updates: z.array(
    z.object({
      sku: z.string().optional(),
      productId: z.string().optional(),
      productName: z.string().optional(),
      hostedUrl: z.string().url(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "excel-export", 10, 60);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    const { buffer, changedRows } = await exportWorkbookWithImageUrls(body);
    return new Response(buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="products-with-images.xlsx"',
        "x-changed-rows": String(changedRows),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
