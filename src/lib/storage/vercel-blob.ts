import { del, head, put } from "@vercel/blob";
import type { StorageProvider, UploadImageInput } from "@/lib/storage/provider";

export class VercelBlobStorageProvider implements StorageProvider {
  async uploadImage(input: UploadImageInput) {
    const result = await put(input.key, input.buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: input.contentType,
    });

    return {
      storageKey: input.key,
      publicUrl: result.url,
    };
  }

  async deleteImage(key: string) {
    const url = await this.getPublicUrl(key);
    await del(url);
  }

  async getPublicUrl(key: string) {
    const result = await head(key);
    return result.url;
  }

  async checkImageExists(key: string) {
    try {
      await head(key);
      return true;
    } catch {
      return false;
    }
  }
}
