import { getCanonicalStockAssetId, type StockAssetProvider } from './stockAssetIdentity';
import { isTrustedPixabayMediaUrl } from './pixabayVideoProvider';
import { isTrustedStockPreviewUrl } from './pexelsCandidateVisualQa';

function isTrustedProviderUrl(value: string, provider: StockAssetProvider): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (provider === 'pixabay') return isTrustedPixabayMediaUrl(value);
    return isTrustedStockPreviewUrl(value) &&
      (host === 'pexels.com' || host.endsWith('.pexels.com'));
  } catch {
    return false;
  }
}

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
  if (!isTrustedProviderUrl(input.sourcePageUrl, input.provider) ||
      !isTrustedProviderUrl(input.videoUrl, input.provider) ||
      (input.thumbnailUrl && !isTrustedProviderUrl(input.thumbnailUrl, input.provider))) {
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


/** Apply normalized results without branching on provider in the repair consumer. */
export function applyQaRepairResultBatch<T extends Record<string, unknown>>(
  scenes: T[],
  results: QaRepairAssetResult[]
): T[] {
  const validated = validateQaRepairAssetBatch(results);
  const updated = scenes.slice();
  for (const result of validated) {
    if (!updated[result.sceneIndex]) throw new Error(`Nieprawidłowy numer sceny naprawy: ${result.sceneIndex + 1}.`);
    updated[result.sceneIndex] = {
      ...updated[result.sceneIndex],
      source: result.provider,
      pexelsId: result.pexelsId,
      pixabayId: result.pixabayId,
      stockId: result.canonicalAssetId,
      sourcePageUrl: result.sourcePageUrl,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      width: result.width,
      height: result.height,
      searchKeyword: result.searchKeyword,
      visualQuery: result.searchKeyword,
      photographer: result.photographer,
      photographerUrl: result.photographerUrl
    };
  }
  return updated;
}
