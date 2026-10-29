import { prisma } from "@/lib/db";
import type { ExcelImageUpdate } from "@/lib/excel";

/** يبني قائمة الروابط من مكتبة الصور الجاهزة (الأحدث أولًا) لربطها بصفوف Excel. */
export async function hostedImageUpdates(): Promise<ExcelImageUpdate[]> {
  const images = await prisma.hostedImage.findMany({
    where: { compatibilityStatus: "READY" },
    orderBy: { createdAt: "desc" },
    select: { publicUrl: true, product: { select: { name: true, sku: true } } },
    take: 5000,
  });

  return images.map((image: { publicUrl: string; product: { name: string; sku: string | null } }) => ({
    sku: image.product.sku ?? undefined,
    productName: image.product.name,
    hostedUrl: image.publicUrl,
  }));
}
