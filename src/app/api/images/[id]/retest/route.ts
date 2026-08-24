import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validatePublicImageUrl } from "@/lib/image/validation";
import { apiError } from "@/lib/api";
import { getRuntimeImageLimits } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const image = await prisma.hostedImage.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });

    const limits = await getRuntimeImageLimits();
    const report = await validatePublicImageUrl(image.publicUrl, limits.minWidth, limits.minHeight);
    const updated = await prisma.hostedImage.update({
      where: { id },
      data: {
        compatibilityStatus: report.status,
        compatibilityReport: report,
      },
      include: { product: true },
    });
    return NextResponse.json({ image: updated, report });
  } catch (error) {
    return apiError(error);
  }
}
