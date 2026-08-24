export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function optionalNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getImageLimits() {
  return {
    minWidth: optionalNumberEnv("MIN_IMAGE_WIDTH", 500),
    minHeight: optionalNumberEnv("MIN_IMAGE_HEIGHT", 500),
    maxFileSize: optionalNumberEnv("MAX_IMAGE_FILE_SIZE_MB", 15) * 1024 * 1024,
  };
}
