import type { ProductInput, WatermarkStatus } from "@/lib/types";
import { normalizeText, tokenize } from "@/lib/query";

function includesExactToken(haystack: string, needle: string) {
  if (!needle) return true;
  return new RegExp(`(^|\\s)${escapeRegExp(normalizeText(needle))}(\\s|$)`, "u").test(haystack);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function modelConflict(productModel: string | undefined, text: string) {
  if (!productModel) return false;
  const normalizedModel = normalizeText(productModel);
  const modelMatch = normalizedModel.match(/^([a-z]+)\s?(\d+)(.*)$/i);
  if (!modelMatch) return false;

  const [, prefix, number, suffix] = modelMatch;
  const similarModel = new RegExp(`\\b${escapeRegExp(prefix)}\\s?(\\d+)${escapeRegExp(suffix.trim())}\\b`, "iu");
  const found = text.match(similarModel);
  return Boolean(found && found[1] !== number);
}

export function productMatchScore(product: ProductInput, evidence: string) {
  const text = normalizeText(evidence);
  const tokens = tokenize(product.name);
  const matchedTokens = tokens.filter((token) => includesExactToken(text, token)).length;
  let score = tokens.length ? Math.round((matchedTokens / tokens.length) * 40) : 0;

  if (product.brand && includesExactToken(text, product.brand)) score += 20;
  if (product.model && includesExactToken(text, product.model)) score += 25;
  if (product.sku && includesExactToken(text, product.sku)) score += 10;
  if (product.color && includesExactToken(text, product.color)) score += 3;
  if (product.variant && includesExactToken(text, product.variant)) score += 2;

  if (product.model && !includesExactToken(text, product.model)) score -= 25;
  if (product.brand && !includesExactToken(text, product.brand)) score -= 10;
  if (modelConflict(product.model, text)) score -= 35;

  return Math.max(0, Math.min(100, score));
}

export function resolutionScore(width = 0, height = 0) {
  const minSide = Math.min(width, height);
  if (minSide >= 1200) return 100;
  if (minSide >= 1000) return 92;
  if (minSide >= 800) return 84;
  if (minSide >= 500) return 68;
  return Math.max(0, Math.round((minSide / 500) * 45));
}

export function imageQualityScore(input: {
  matchScore: number;
  width?: number;
  height?: number;
  watermarkStatus: WatermarkStatus;
  mimeType?: string;
}) {
  const watermarkPenalty =
    input.watermarkStatus === "Watermark Detected"
      ? 35
      : input.watermarkStatus === "Possible Watermark"
        ? 15
        : 0;
  const formatBonus = input.mimeType?.includes("jpeg") || input.mimeType?.includes("png") ? 5 : 0;
  const score = input.matchScore * 0.45 + resolutionScore(input.width, input.height) * 0.4 + formatBonus - watermarkPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}
