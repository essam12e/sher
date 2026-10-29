import { BlobNotFoundError, del, head, list, put } from "@vercel/blob";
import type { CompatibilityCheck, WatermarkStatus } from "@/lib/types";

/**
 * كل البيانات محفوظة في Vercel Blob المرتبط بالمشروع (بدون قاعدة بيانات):
 * - products/<sku-or-name>/<hash>.jpg  الصورة نفسها (رابطها هو الرابط النهائي)
 * - meta/<hash>.json                   بيانات الصورة والمنتج
 * - config/settings-<time>.json        الإعدادات
 * Vercel يضيف BLOB_READ_WRITE_TOKEN تلقائيًا عند ربط مخزن Blob بالمشروع.
 */

export type HostedRecord = {
  id: string; // sha256 للصورة بعد المعالجة
  publicUrl: string;
  imageKey: string;
  sourceUrl: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  matchScore: number;
  qualityScore: number;
  watermarkStatus: WatermarkStatus;
  compatibilityStatus: CompatibilityCheck["status"];
  compatibilityReport: CompatibilityCheck;
  createdAt: string;
  product: { name: string; sku: string | null; brand: string | null; model: string | null };
};

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function assertStorage() {
  if (!storageConfigured()) {
    throw new Error("التخزين غير مفعّل. اربط مخزن Vercel Blob بالمشروع من تبويب Storage في Vercel ثم أعد النشر.");
  }
}

const metaKey = (id: string) => `meta/${id}.json`;

async function readJson<T>(url: string, version?: string | Date): Promise<T | null> {
  const stamp = version instanceof Date ? version.getTime() : version;
  const response = await fetch(stamp ? `${url}?v=${encodeURIComponent(String(stamp))}` : url, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function uploadImage(key: string, buffer: Buffer, contentType: string) {
  assertStorage();
  const result = await put(key, buffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return result.url;
}

export async function saveRecord(record: HostedRecord) {
  assertStorage();
  await put(metaKey(record.id), JSON.stringify(record), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return record;
}

export async function getRecord(id: string): Promise<HostedRecord | null> {
  assertStorage();
  if (!/^[a-f0-9]{16,64}$/.test(id)) return null;
  try {
    const meta = await head(metaKey(id));
    return await readJson<HostedRecord>(meta.url, meta.uploadedAt);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

export async function listRecords(limit = 1000): Promise<HostedRecord[]> {
  assertStorage();
  const blobs: { url: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "meta/", cursor, limit: 1000 });
    blobs.push(...page.blobs.map((blob) => ({ url: blob.url, uploadedAt: blob.uploadedAt })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && blobs.length < limit);

  const records: HostedRecord[] = [];
  const queue = [...blobs.slice(0, limit)];
  await Promise.all(
    Array.from({ length: Math.min(16, queue.length) }, async () => {
      while (queue.length) {
        const blob = queue.shift();
        if (!blob) break;
        const record = await readJson<HostedRecord>(blob.url, blob.uploadedAt).catch(() => null);
        if (record?.id) records.push(record);
      }
    }),
  );

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRecord(record: HostedRecord) {
  assertStorage();
  const meta = await head(metaKey(record.id)).catch(() => null);
  const urls = [record.publicUrl, meta?.url].filter((url): url is string => Boolean(url));
  if (urls.length) await del(urls);
}

/* ---------- الإعدادات ---------- */

export type ImageSettings = { minWidth: number; minHeight: number; maxFileSizeMb: number };

export const defaultSettings: ImageSettings = { minWidth: 500, minHeight: 500, maxFileSizeMb: 15 };

let settingsCache: { value: ImageSettings; at: number } | null = null;

export async function readSettings(): Promise<ImageSettings> {
  if (!storageConfigured()) return defaultSettings;
  if (settingsCache && Date.now() - settingsCache.at < 30_000) return settingsCache.value;
  try {
    const { blobs } = await list({ prefix: "config/settings-", limit: 100 });
    const latest = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
    const stored = latest ? await readJson<Partial<ImageSettings>>(latest.url) : null;
    const value = { ...defaultSettings, ...(stored ?? {}) };
    settingsCache = { value, at: Date.now() };
    return value;
  } catch {
    return defaultSettings;
  }
}

export async function writeSettings(value: ImageSettings) {
  assertStorage();
  // ملف جديد في كل حفظ (رابط فريد) حتى لا تعيد ذاكرة CDN نسخة قديمة
  await put(`config/settings-${Date.now()}.json`, JSON.stringify(value), {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
  });
  const { blobs } = await list({ prefix: "config/settings-", limit: 100 });
  const old = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()).slice(1).map((blob) => blob.url);
  if (old.length) await del(old).catch(() => undefined);
  settingsCache = { value, at: Date.now() };
  return value;
}

export async function getImageLimits() {
  const settings = await readSettings();
  return {
    minWidth: settings.minWidth,
    minHeight: settings.minHeight,
    maxFileSize: settings.maxFileSizeMb * 1024 * 1024,
  };
}
