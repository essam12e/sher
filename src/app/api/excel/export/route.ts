import { type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { MAX_EXCEL_BYTES, exportWorkbookWithImageUrls } from "@/lib/excel";
import { hostedImageUpdates } from "@/lib/excel-updates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mappingSchema = z.object({
  productNameColumn: z.string().min(1, "اختر عمود اسم المنتج."),
  skuColumn: z.string().optional(),
  productIdColumn: z.string().optional(),
  imageUrlColumn: z.string().min(1, "اختر عمود رابط الصورة."),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "excel-export", 10, 60);
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("ارفع ملف Excel مرة أخرى.");
    if (file.size > MAX_EXCEL_BYTES) throw new Error("حجم ملف Excel أكبر من 10MB.");

    const mapping = mappingSchema.parse(JSON.parse(String(formData.get("mapping") ?? "{}")));
    const sheetName = formData.get("sheetName");
    const overwriteExisting = formData.get("overwriteExisting") !== "false";

    const updates = await hostedImageUpdates();
    if (!updates.length) throw new Error("مكتبة الصور فارغة. اعتمد صورًا للمنتجات أولًا ثم صدّر الملف.");

    const { buffer, changedRows, unmatchedRows } = await exportWorkbookWithImageUrls({
      buffer: Buffer.from(await file.arrayBuffer()),
      sheetName: typeof sheetName === "string" && sheetName ? sheetName : undefined,
      mapping: {
        ...mapping,
        skuColumn: mapping.skuColumn || undefined,
        productIdColumn: mapping.productIdColumn || undefined,
      },
      updates,
      overwriteExisting,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="products-with-images.xlsx"',
        "x-changed-rows": String(changedRows),
        "x-unmatched-rows": String(unmatchedRows),
        "access-control-expose-headers": "x-changed-rows, x-unmatched-rows",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
