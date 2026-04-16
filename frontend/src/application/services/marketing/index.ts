/**
 * Marketing Service Factory.
 *
 * Returns the correct platform service instance based on the platform name.
 * All services implement IMarketingService for a uniform API.
 *
 * Usage:
 *   const svc = getMarketingService('META');
 *   const campaigns = await svc.getCampaigns(accessToken, adAccountId);
 */

import type { MarketingPlatform, IMarketingService } from './types';
import { MetaService } from './meta.service';
import { TikTokService } from './tiktok.service';
import { GoogleAdsService } from './google-ads.service';
import { LinkedInService } from './linkedin.service';

// Singleton instances — stateless, so safe to share.
const services: Record<MarketingPlatform, IMarketingService> = {
  META: new MetaService(),
  TIKTOK: new TikTokService(),
  GOOGLE_ADS: new GoogleAdsService(),
  LINKEDIN: new LinkedInService(),
};

/**
 * Get the marketing service for a given platform.
 * Throws if the platform is not supported.
 */
export function getMarketingService(platform: MarketingPlatform): IMarketingService {
  const svc = services[platform];
  if (!svc) {
    throw new Error(`Unsupported marketing platform: ${platform}`);
  }
  return svc;
}

/**
 * Map a URL-friendly slug to the Prisma enum value.
 * e.g. "google-ads" → "GOOGLE_ADS", "meta" → "META"
 */
export function slugToPlatform(slug: string): MarketingPlatform | null {
  const map: Record<string, MarketingPlatform> = {
    meta: 'META',
    tiktok: 'TIKTOK',
    'google-ads': 'GOOGLE_ADS',
    linkedin: 'LINKEDIN',
  };
  return map[slug.toLowerCase()] ?? null;
}

/**
 * Inverse of slugToPlatform — enum value to URL slug.
 */
export function platformToSlug(platform: MarketingPlatform): string {
  const map: Record<MarketingPlatform, string> = {
    META: 'meta',
    TIKTOK: 'tiktok',
    GOOGLE_ADS: 'google-ads',
    LINKEDIN: 'linkedin',
  };
  return map[platform];
}

// Re-export types for convenience
export type { MarketingPlatform, IMarketingService } from './types';
export { MetaService } from './meta.service';
export { TikTokService } from './tiktok.service';
export { GoogleAdsService } from './google-ads.service';
export { LinkedInService } from './linkedin.service';
