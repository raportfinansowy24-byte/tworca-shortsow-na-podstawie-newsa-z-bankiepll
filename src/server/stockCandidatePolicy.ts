import { normalizeFinanceText } from '../utils/financeSceneMatching';

/**
 * Terms that often describe generic or off-topic stock footage. They are ranking
 * hints only: semantic scene matching and visual QA decide whether a clip is usable.
 */
export const SOFT_AVOID_STOCK_TERMS = [
  'gymnast',
  'doctor',
  'medical',
  'cooking',
  'fitness',
  'sport',
  'sports',
  'wedding',
  'cartoon',
  'workout',
  'basketball',
  'football',
  'beach',
  'eraser',
  'writing notes',
  'taking notes'
] as const;

export interface StockCandidateSoftAvoidance {
  matchedTerms: string[];
  penalty: number;
}

/** Preserve useful finance-scene nouns; strip only prompt-style metadata. */
export function cleanStockSearchQuery(value: string): string {
  return String(value || '')
    .replace(/[^\w\s-]/gi, ' ')
    .replace(/\b(illustration|draw|drawing|concept|tutorial)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeFinanceText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function containsPhrase(tokens: string[], phrase: string): boolean {
  const expected = tokenize(phrase);
  if (expected.length === 0 || expected.length > tokens.length) return false;
  return tokens.some((_, start) =>
    expected.every((token, offset) => tokens[start + offset] === token)
  );
}

/** Return a bounded ranking penalty; this policy never makes a candidate ineligible. */
export function scoreStockCandidateSoftAvoidance(value: string, sceneContext = ''): StockCandidateSoftAvoidance {
  const tokens = tokenize(value);
  const requestedTokens = tokenize(sceneContext);
  const matchedTerms = SOFT_AVOID_STOCK_TERMS.filter((term) =>
    containsPhrase(tokens, term) && !containsPhrase(requestedTokens, term)
  );
  return {
    matchedTerms: [...matchedTerms],
    penalty: Math.min(24, matchedTerms.length * 8)
  };
}
