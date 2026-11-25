const SAFE_RASTER_DATA_IMAGE_RE =
  /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validates and sanitizes image URLs before storing or binding to <img src>.
 * Allows https:, http:, safe app-relative paths (/path, ./path), and raster base64 data:image/* URIs.
 * Blocks javascript:, vbscript:, data:text/html, data:image/svg+xml, and malformed URIs.
 */
export function sanitizeImageUrl(rawUrl?: string | null): string | undefined {
  if (typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  // Reject control characters or embedded newlines
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return undefined;
  }

  if (SAFE_RASTER_DATA_IMAGE_RE.test(trimmed)) {
    return trimmed;
  }

  // Allow safe local relative asset paths (disallow protocol-relative //evil.com)
  if ((trimmed.startsWith('/') && !trimmed.startsWith('//')) || trimmed.startsWith('./')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * Recursively clones plain JSON data while stripping prototype-pollution keys
 * (__proto__, constructor, prototype).
 */
export function stripPrototypePollution<T>(input: T, depth = 0): T {
  if (depth > 25 || input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => stripPrototypePollution(item, depth + 1)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = stripPrototypePollution(value, depth + 1);
  }
  return out as T;
}
