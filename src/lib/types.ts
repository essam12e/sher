export type WatermarkStatus =
  | "No Watermark Detected"
  | "Possible Watermark"
  | "Watermark Detected";

export type CompatibilityStatus = "READY" | "FAILED";

export type ProductInput = {
  name: string;
  brand?: string;
  model?: string;
  sku?: string;
  color?: string;
  variant?: string;
};

export type ImageSearchResult = {
  id: string;
  title: string;
  source: string;
  pageUrl?: string;
  thumbnailUrl?: string;
  originalUrl: string;
  fallbackUrl?: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  matchScore: number;
  qualityScore: number;
  watermarkStatus: WatermarkStatus;
  isAcceptable: boolean;
  rejectionReason?: string;
  usedFallback?: boolean;
};

export type CompatibilityCheck = {
  https: boolean;
  httpStatus: number;
  contentType: string | null;
  publicAccess: boolean;
  directImage: boolean;
  serverFetch: boolean;
  dimensions: string | null;
  permanentUrl: boolean;
  contentLength: number | null;
  redirectCount: number;
  finalUrl: string;
  status: CompatibilityStatus;
  reason?: string;
};
