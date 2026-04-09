export function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function parseIntWithFallback(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
}

export function parseActivityContent(rawContent) {
  if (!rawContent) {
    return {};
  }

  if (typeof rawContent === "string") {
    try {
      return JSON.parse(rawContent);
    } catch {
      return {};
    }
  }

  return typeof rawContent === "object" ? rawContent : {};
}

export function getSafeDisplayText(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text || text.includes("�")) {
    return fallback;
  }
  return text;
}

export function formatNumberWithThousandsSpace(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value ?? "");
  }

  return Math.trunc(numericValue)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function randomRotation(minDegrees = -10, maxDegrees = 10) {
  const safeMin = Math.min(minDegrees, maxDegrees);
  const safeMax = Math.max(minDegrees, maxDegrees);
  const rotationRange = safeMax - safeMin;

  return Math.round((Math.random() * rotationRange + safeMin) * 10) / 10;
}
