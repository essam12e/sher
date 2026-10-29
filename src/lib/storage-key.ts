import type { ProductInput } from "@/lib/types";
import { normalizeText } from "@/lib/query";

export function slugify(value: string) {
  const normalized = normalizeText(value);
  const ascii = normalized
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii.length >= 3 ? ascii.slice(0, 60) : "product";
}

export function storageKeyForImage(product: ProductInput, hash: string, extension: string) {
  const productKey = product.sku ? slugify(product.sku) : slugify(product.name);
  return `products/${productKey}/image-${hash.slice(0, 12)}.${extension}`;
}
