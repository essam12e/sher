import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const images = await prisma.hostedImage.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true },
      take: 100,
    });
    return NextResponse.json({ images });
  } catch (error) {
    return apiError(error);
  }
}
