import { optionalNumberEnv } from "@/lib/env";
import { prisma } from "@/lib/db";

export async function getRuntimeImageLimits() {
  const fallback = {
    minWidth: optionalNumberEnv("MIN_IMAGE_WIDTH", 500),
    minHeight: optionalNumberEnv("MIN_IMAGE_HEIGHT", 500),
    maxFileSize: optionalNumberEnv("MAX_IMAGE_FILE_SIZE_MB", 15) * 1024 * 1024,
  };

  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build") {
    return fallback;
  }

  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["MIN_IMAGE_WIDTH", "MIN_IMAGE_HEIGHT", "MAX_IMAGE_FILE_SIZE_MB"] } },
    });
    const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
    return {
      minWidth: Number(map.MIN_IMAGE_WIDTH ?? fallback.minWidth),
      minHeight: Number(map.MIN_IMAGE_HEIGHT ?? fallback.minHeight),
      maxFileSize: Number(map.MAX_IMAGE_FILE_SIZE_MB ?? fallback.maxFileSize / 1024 / 1024) * 1024 * 1024,
    };
  } catch {
    return fallback;
  }
}
