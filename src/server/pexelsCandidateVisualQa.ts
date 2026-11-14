export interface PexelsVisualAssessment {
  pexelsId: number;
  selectionScore: number;
  visual?: {
    scene: number;
    match: boolean;
    confidence: number;
    reason: string;
  };
}

export interface SelectedPexelsVisualCandidate {
  pexelsId: number;
  confidence: number;
  score: number;
  reason: string;
}

export function isTrustedStockPreviewUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'pexels.com' || url.hostname.endsWith('.pexels.com') ||
        url.hostname === 'pixabay.com' || url.hostname.endsWith('.pixabay.com'));
  } catch {
    return false;
  }
}

export function selectVisuallyVerifiedPexelsCandidate(
  assessments: PexelsVisualAssessment[],
  minimumConfidence = 0.68
): SelectedPexelsVisualCandidate | null {
  const accepted = assessments
    .filter((item) =>
      Number.isSafeInteger(item.pexelsId) &&
      item.pexelsId > 0 &&
      item.visual?.match === true &&
      Number.isFinite(item.visual.confidence) &&
      item.visual.confidence >= minimumConfidence
    )
    .map((item) => ({
      pexelsId: item.pexelsId,
      confidence: item.visual!.confidence,
      // Text/relevance scores only break near-ties; visual fit is the primary signal.
      score: item.visual!.confidence * 100 + Math.max(0, Math.min(300, item.selectionScore)) * 0.01,
      reason: item.visual!.reason
    }))
    .sort((a, b) => b.score - a.score);
  return accepted[0] || null;
}

/** Backward-compatible alias; the validator now accepts both configured stock providers. */
export const isTrustedPexelsPreviewUrl = isTrustedStockPreviewUrl;
