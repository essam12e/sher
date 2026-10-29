import { NextResponse, type NextRequest } from "next/server";

// حد بسيط للطلبات في ذاكرة الخادم بدون أي خدمة خارجية
const hits = new Map<string, { count: number; resetAt: number }>();

export async function enforceRateLimit(request: NextRequest, bucket: string, limit = 30, windowSeconds = 60) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();

  if (hits.size > 5000) {
    for (const [entryKey, entry] of hits) if (entry.resetAt < now) hits.delete(entryKey);
  }

  const current = hits.get(key);
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return null;
  }

  current.count += 1;
  if (current.count > limit) {
    return NextResponse.json({ error: "طلبات كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى." }, { status: 429 });
  }
  return null;
}
