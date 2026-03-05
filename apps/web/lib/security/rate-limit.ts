interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        retryAfterMs: 0
      };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, existing.resetAt - now)
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, limit - existing.count),
      retryAfterMs: 0
    };
  }

  clear() {
    this.buckets.clear();
  }
}

export const routeRateLimiter = new InMemoryRateLimiter();

export const getClientKey = (xForwardedForHeader: string | null, fallback = "anonymous") => {
  if (!xForwardedForHeader) {
    return fallback;
  }

  const firstIp = xForwardedForHeader.split(",")[0]?.trim();
  return firstIp || fallback;
};
