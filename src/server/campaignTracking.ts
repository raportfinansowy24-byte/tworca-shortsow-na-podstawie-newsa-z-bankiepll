export type CampaignPlatform = 'tiktok' | 'youtube' | 'instagram' | 'facebook';

export interface CampaignTrackingLinks {
  destinationUrl: string;
  descriptionUrl: string;
  pinnedComment: string;
  metadata: {
    destinationUrl: string;
    utmSource: CampaignPlatform;
    utmMedium: 'organic_social';
    utmCampaign: 'shorts';
    utmContent: string;
  };
}

const BASE_URL = 'https://raport-finansowy24.pl';

function normalizePlatform(platform: string): CampaignPlatform {
  const value = platform.toLocaleLowerCase('en-US');
  if (value.includes('tiktok')) return 'tiktok';
  if (value.includes('instagram') || value.includes('reel')) return 'instagram';
  if (value.includes('facebook')) return 'facebook';
  return 'youtube';
}

function normalizeContentId(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || 'short';
}

/**
 * Creates one canonical tracked destination for the caption, suggested pinned
 * comment and campaign metadata. Tracking parameters are never spoken in TTS.
 */
export function buildCampaignTrackingLinks(params: {
  platform: string;
  contentId: string;
  destinationPath?: string;
}): CampaignTrackingLinks {
  const platform = normalizePlatform(params.platform);
  const pathname = params.destinationPath?.startsWith('/') ? params.destinationPath : '/';
  const url = new URL(pathname, BASE_URL);
  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', 'organic_social');
  url.searchParams.set('utm_campaign', 'shorts');
  url.searchParams.set('utm_content', normalizeContentId(params.contentId));

  const destinationUrl = url.toString();
  return {
    destinationUrl,
    descriptionUrl: destinationUrl,
    pinnedComment: `Sprawdź szczegóły na RaportFinansowy24: ${destinationUrl}`,
    metadata: {
      destinationUrl,
      utmSource: platform,
      utmMedium: 'organic_social',
      utmCampaign: 'shorts',
      utmContent: normalizeContentId(params.contentId)
    }
  };
}
