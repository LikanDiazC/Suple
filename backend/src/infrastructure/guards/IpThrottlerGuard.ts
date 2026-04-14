import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ==========================================================================
 * IpThrottlerGuard — Rate Limiting with X-Forwarded-For Support
 * ==========================================================================
 *
 * Problem: The default ThrottlerGuard uses the TCP connection IP as the
 * rate-limit key. When all requests are proxied through the Next.js server
 * (127.0.0.1), every user shares the same rate-limit bucket — one wrong
 * SII password attempt from any user can block everyone for 15 minutes.
 *
 * Fix: Read the real client IP from the X-Forwarded-For header, which
 * the Next.js API route sets before forwarding to this backend.
 * This way each end-user has their own independent rate-limit bucket.
 *
 * Security note: Only trust X-Forwarded-For if the request comes from
 * a known proxy (in our case: the Next.js server at 127.0.0.1).
 * ==========================================================================
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const headers = req.headers as Record<string, string | string[] | undefined>;

    // X-Forwarded-For is set by the Next.js proxy with the real browser IP
    const xForwardedFor = headers['x-forwarded-for'];
    if (xForwardedFor) {
      // Header can be a comma-separated list; first entry is the original client IP
      const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      const clientIp = raw.split(',')[0].trim();
      if (clientIp) return clientIp;
    }

    // X-Real-IP is set by some reverse proxies (Nginx, etc.)
    const xRealIp = headers['x-real-ip'];
    if (xRealIp && !Array.isArray(xRealIp)) return xRealIp.trim();

    // Fallback: use TCP connection IP
    return (req.ip as string) ?? '127.0.0.1';
  }
}
