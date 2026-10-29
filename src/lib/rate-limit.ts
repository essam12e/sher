import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

const localHits = new Map<string, { count: number; resetAt: number }>();
const limiters = new Map<string, Ratelimit>();

function upstashLimiter(limit: number, windowSeconds: number) {
  const id = `${limit}:${windowSeconds}`;
  let limiter = limiters.get(id);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    });
    limiters.set(id, limiter);
  }
  return limiter;
}

function localLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (localHits.size > 5000) {
    for (const [entryKey, entry] of localHits) if (entry.resetAt < now) localHits.delete(entryKey);
  }
  const current = localHits.get(key);
  if (!current || current.resetAt < now) {
    localHits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export async function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  limit = 30,
  windowSeconds = 60,
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const key = `${bucket}:${ip}`;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const result = await upstashLimiter(limit, windowSeconds).limit(key);
    if (!result.success) {
      return NextResponse.json(
        { error: "تم تجاوز حد الطلبات مؤقتًا. حاول مرة أخرى بعد قليل." },
        { status: 429 },
      );
    }
    return null;
  }

  if (!localLimit(key, limit, windowSeconds * 1000)) {
    return NextResponse.json(
      { error: "تم تجاوز حد الطلبات مؤقتًا. حاول مرة أخرى بعد قليل." },
      { status: 429 },
    );
  }

  return null;
}
