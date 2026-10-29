import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  minWidth: z.number().int().min(100).max(4000),
  minHeight: z.number().int().min(100).max(4000),
  maxFileSizeMb: z.number().int().min(1).max(50),
});

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const map = Object.fromEntries(settings.map((setting: { key: string; value: string }) => [setting.key, setting.value]));
    return NextResponse.json({
      minWidth: Number(map.MIN_IMAGE_WIDTH ?? process.env.MIN_IMAGE_WIDTH ?? 500),
      minHeight: Number(map.MIN_IMAGE_HEIGHT ?? process.env.MIN_IMAGE_HEIGHT ?? 500),
      maxFileSizeMb: Number(map.MAX_IMAGE_FILE_SIZE_MB ?? process.env.MAX_IMAGE_FILE_SIZE_MB ?? 15),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "settings", 10, 60);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: "MIN_IMAGE_WIDTH" },
        update: { value: String(body.minWidth) },
        create: { key: "MIN_IMAGE_WIDTH", value: String(body.minWidth) },
      }),
      prisma.setting.upsert({
        where: { key: "MIN_IMAGE_HEIGHT" },
        update: { value: String(body.minHeight) },
        create: { key: "MIN_IMAGE_HEIGHT", value: String(body.minHeight) },
      }),
      prisma.setting.upsert({
        where: { key: "MAX_IMAGE_FILE_SIZE_MB" },
        update: { value: String(body.maxFileSizeMb) },
        create: { key: "MAX_IMAGE_FILE_SIZE_MB", value: String(body.maxFileSizeMb) },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
