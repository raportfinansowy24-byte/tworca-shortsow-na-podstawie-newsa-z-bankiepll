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
      score: item.selectionScore + item.visual!.confidence * 12,
      reason: item.visual!.reason
    }))
    .sort((a, b) => b.score - a.score);
  return accepted[0] || null;
}
