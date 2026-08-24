import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const image = await prisma.hostedImage.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });

    await getStorageProvider().deleteImage(image.storageKey);
    await prisma.hostedImage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
