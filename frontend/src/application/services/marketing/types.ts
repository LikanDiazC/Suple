/**
 * Re-export all marketing types from the central types module.
 * Services import from here to avoid deep relative paths.
 */
export type {
  MarketingPlatform,
  ConnectionStatus,
  MarketingConnectionDTO,
  OAuthStartResult,
  OAuthTokenSet,
  AdAccount,
  Campaign,
  CampaignSummary,
  TrackingEvent,
  TrackingResult,
  IMarketingService,
} from '@/types/marketing';
