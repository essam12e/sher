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

  // كل حقل يدخل في النسبة فقط إذا كتبه المستخدم، حتى يصل التطابق الكامل إلى 100
  const fields: { weight: number; value?: string }[] = [
    { weight: 25, value: product.brand },
    { weight: 25, value: product.model },
    { weight: 10, value: product.sku },
    { weight: 4, value: product.color },
    { weight: 3, value: product.variant },
  ].filter((field) => field.value?.trim());

  const nameWeight = 60;
  const totalWeight = nameWeight + fields.reduce((sum, field) => sum + field.weight, 0);
  const nameRatio = tokens.length ? tokens.filter((token) => includesExactToken(text, token)).length / tokens.length : 0;
  let earned = nameRatio * nameWeight;
  for (const field of fields) if (includesExactToken(text, field.value ?? "")) earned += field.weight;

  let score = Math.round((earned / totalWeight) * 100);
  if (product.model && !includesExactToken(text, product.model)) score -= 15;
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
