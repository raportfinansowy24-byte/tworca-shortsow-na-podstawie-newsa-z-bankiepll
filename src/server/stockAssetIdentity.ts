import { PIXABAY_INTERNAL_ID_OFFSET } from './pixabayVideoProvider';

export type StockAssetProvider = 'pexels' | 'pixabay';

export interface StockAssetIdentityInput {
  source?: unknown;
  pexelsId?: unknown;
  pixabayId?: unknown;
  stockId?: unknown;
}

/**
 * Return the canonical provider-scoped identity for a stock asset.
 * Provider IDs are intentionally namespaced: Pexels #123 and Pixabay #123
 * are different assets, while the same provider ID is always the same asset.
 */
export function getCanonicalStockAssetId(value: StockAssetIdentityInput): string | null {
  if (!value || (value.source !== 'pexels' && value.source !== 'pixabay')) return null;

  if (value.source === 'pexels') {
    if (!Number.isSafeInteger(value.pexelsId) || Number(value.pexelsId) <= 0) return null;
    if (value.pixabayId !== undefined && value.pixabayId !== null) return null;
    const canonical = 'pexels:' + String(value.pexelsId);
    if (value.stockId !== undefined && value.stockId !== canonical) return null;
    return canonical;
  }

  if (!Number.isSafeInteger(value.pixabayId) || Number(value.pixabayId) <= 0) return null;
  const expectedInternalId = PIXABAY_INTERNAL_ID_OFFSET + Number(value.pixabayId);
  if (!Number.isSafeInteger(expectedInternalId) || value.pexelsId !== expectedInternalId) return null;
  const canonical = 'pixabay:' + String(value.pixabayId);
  if (value.stockId !== canonical) return null;
  return canonical;
}

export function hasDuplicateStockAssetIdentities(values: StockAssetIdentityInput[]): boolean {
  const identities = values.map(getCanonicalStockAssetId);
  return identities.some((identity) => identity === null) ||
    new Set(identities).size !== identities.length;
}
