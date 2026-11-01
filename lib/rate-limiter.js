/**
 * In-Memory Sliding Window Rate Limiter
 * Mencegah abuse, spam klik, dan pengurasan kuota API pihak ketiga
 */

const tracker = new Map();

/**
 * Check if a client (IP or User ID) has exceeded rate limit
 * @param {string} identifier - Client IP or User identifier
 * @param {number} maxRequests - Max requests allowed within window (default 25)
 * @param {number} windowSeconds - Time window in seconds (default 60s)
 * @returns {{ allowed: boolean, remaining: number, resetInSeconds: number }}
 */
export function checkRateLimit(
  identifier,
  maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '25', 10),
  windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10)
) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (!tracker.has(identifier)) {
    tracker.set(identifier, []);
  }

  const timestamps = tracker.get(identifier);
  
  // Filter out timestamps outside the active window
  const activeTimestamps = timestamps.filter(ts => now - ts < windowMs);
  
  if (activeTimestamps.length >= maxRequests) {
    const oldestTimestamp = activeTimestamps[0];
    const resetInSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    tracker.set(identifier, activeTimestamps);
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds)
    };
  }

  // Record current request
  activeTimestamps.push(now);
  tracker.set(identifier, activeTimestamps);

  return {
    allowed: true,
    remaining: maxRequests - activeTimestamps.length,
    resetInSeconds: windowSeconds
  };
}

/**
 * Extract client IP from Next.js request headers
 */
export function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
