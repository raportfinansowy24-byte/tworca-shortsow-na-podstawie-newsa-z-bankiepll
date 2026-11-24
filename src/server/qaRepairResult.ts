import { getCanonicalStockAssetId, type StockAssetProvider } from './stockAssetIdentity';
import { isTrustedPixabayMediaUrl } from './pixabayVideoProvider';
import { isTrustedStockPreviewUrl } from './pexelsCandidateVisualQa';

export interface QaRepairAssetResult {
  sceneIndex: number;
  provider: StockAssetProvider;
  providerAssetId: number;
  canonicalAssetId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  sourcePageUrl: string;
  width: number;
  height: number;
  duration?: number;
  searchKeyword: string;
  photographer?: string;
  photographerUrl?: string;
  /** Internal scene-contract metadata; consumers should use canonicalAssetId. */
  pexelsId: number;
  pixabayId?: number;
  stockId: string;
}

export type QaRepairAssetInput = Omit<QaRepairAssetResult, 'canonicalAssetId'> & {
  canonicalAssetId?: string;
};

/** Convert either provider's result into one validated, provider-agnostic repair contract. */
export function normalizeQaRepairAssetResult(input: QaRepairAssetInput): QaRepairAssetResult {
  if (!input || !Number.isInteger(input.sceneIndex) || input.sceneIndex < 0) {
    throw new Error('Nieprawidłowy indeks sceny naprawy QA.');
  }
  if (input.provider !== 'pexels' && input.provider !== 'pixabay') {
    throw new Error('Nieobsługiwany dostawca materiału naprawczego QA.');
  }
  if (!Number.isSafeInteger(input.providerAssetId) || input.providerAssetId <= 0) {
    throw new Error('Nieprawidłowy identyfikator materiału dostawcy QA.');
  }
  const identity = getCanonicalStockAssetId({
    source: input.provider,
    pexelsId: input.pexelsId,
    pixabayId: input.pixabayId,
    stockId: input.stockId
  });
  if (!identity || (input.canonicalAssetId && input.canonicalAssetId !== identity)) {
    throw new Error('Niespójna kanoniczna tożsamość materiału naprawczego QA.');
  }
  if ((input.provider === 'pexels' && input.providerAssetId !== input.pexelsId) ||
      (input.provider === 'pixabay' && input.providerAssetId !== input.pixabayId)) {
    throw new Error('Identyfikator dostawcy nie zgadza się z metadanymi materiału QA.');
  }
  const trustedPage = input.provider === 'pixabay'
    ? isTrustedPixabayMediaUrl(input.sourcePageUrl)
    : isTrustedStockPreviewUrl(input.sourcePageUrl) &&
      new URL(input.sourcePageUrl).hostname.endsWith('pexels.com');
  if (!trustedPage || !isTrustedStockPreviewUrl(input.videoUrl) ||
      (input.thumbnailUrl && !isTrustedStockPreviewUrl(input.thumbnailUrl))) {
    throw new Error('Materiał naprawczy QA zawiera niezaufany URL.');
  }
  if (![input.width, input.height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Materiał naprawczy QA nie zawiera prawidłowych wymiarów.');
  }
  if (!input.searchKeyword.trim()) throw new Error('Brak zapytania wyszukiwania materiału QA.');
  return { ...input, canonicalAssetId: identity };
}

/** Reject duplicate provider-scoped assets across one repair batch. */
export function validateQaRepairAssetBatch(results: QaRepairAssetResult[]): QaRepairAssetResult[] {
  const ids = results.map((result) => result.canonicalAssetId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Naprawa QA zwróciła powielony materiał stock.');
  }
  const scenes = results.map((result) => result.sceneIndex);
  if (new Set(scenes).size !== scenes.length) {
    throw new Error('Naprawa QA zwróciła więcej niż jeden materiał dla tej samej sceny.');
  }
  return results;
}
