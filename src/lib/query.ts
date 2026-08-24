const stopWords = new Set(["with", "and", "for", "the", "new", "original", "صورة", "منتج"]);

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

export function buildSearchQuery(input: {
  name: string;
  brand?: string;
  model?: string;
  sku?: string;
  color?: string;
  variant?: string;
}) {
  return [input.brand, input.name, input.model, input.sku, input.color, input.variant]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
