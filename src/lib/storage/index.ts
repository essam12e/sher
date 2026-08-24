import type { StorageProvider } from "@/lib/storage/provider";
import { VercelBlobStorageProvider } from "@/lib/storage/vercel-blob";

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "vercel-blob";
  if (provider === "vercel-blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN مطلوب لاستخدام Vercel Blob.");
    }
    return new VercelBlobStorageProvider();
  }

  throw new Error(`Storage provider غير مدعوم: ${provider}`);
}
