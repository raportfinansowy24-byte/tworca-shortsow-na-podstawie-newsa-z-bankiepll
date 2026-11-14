import { buildFinancialNewsSearchAliases } from './stockSearchExpansion';

/**
 * Build a small, bounded set of semantic aliases for Pixabay's video search.
 * Search aliases broaden the retrieval query only; every candidate must still
 * pass the image-based stock visual precheck before it can enter a render.
 */
export function buildPixabayFallbackQueries(
  query: string,
  context = "",
  categoryAlternatives: string[] = [],
  maxQueries = 4
): string[] {
  const clean = (value: string) => String(value || "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

  const original = clean(query);
  if (!original) return [];

  const combined = (original + " " + context).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const expansions: string[] = buildFinancialNewsSearchAliases(original);

  // Technology/AI news often names a person or company, while stock libraries
  // tag footage by subject matter (chips, servers, conferences), not names.
  if (/\b(nvidia|jensen huang|gpu|semiconductor|microchip|computer chip|artificial intelligence|\bai\b|machine learning|data cent(?:er|re))\b/i.test(combined)) {
    expansions.push(
      "artificial intelligence technology conference",
      "GPU semiconductor computer chips",
      "AI data center servers"
    );
  } else if (/\b(real estate|property|building plot|vacant land|land for sale|construction|housing|mortgage)\b/i.test(combined)) {
    expansions.push(
      "aerial residential land plots",
      "house construction site surveyor",
      "real estate property development"
    );
  } else if (/\b(interest rate|central bank|rpp|nbp|loan|mortgage|credit)\b/i.test(combined)) {
    expansions.push(
      "central bank building exterior",
      "interest rate financial chart",
      "mortgage loan calculator"
    );
  } else if (/\b(stock market|shares|stocks|trading|exchange|investor|investment|market)\b/i.test(combined)) {
    expansions.push(
      "stock market trading floor",
      "financial market charts screens",
      "investor analyzing stock market data"
    );
  } else if (/\b(currency|forex|exchange rate|euro|dollar|zloty)\b/i.test(combined)) {
    expansions.push(
      "currency exchange rate board",
      "forex trading chart screen",
      "money currency exchange"
    );
  } else if (/\b(inflation|prices|supermarket|groceries|cost of living)\b/i.test(combined)) {
    expansions.push(
      "supermarket price tags shopping",
      "consumer price inflation chart",
      "grocery shopping cost comparison"
    );
  }

  const result: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [original, ...expansions, ...categoryAlternatives]) {
    const value = clean(candidate);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= Math.max(1, Math.min(6, Math.floor(maxQueries) || 4))) break;
  }
  return result;
}
