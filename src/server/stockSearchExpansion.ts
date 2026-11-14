/** Return a focused stock-search alias only when the scene explicitly asks for financial/business news. */
export function buildFinancialNewsSearchAliases(query: string): string[] {
  const normalized = String(query || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const namesFinancialNews = /\b(?:financial|business|economic|market) news\b/.test(normalized);
  const newsOnComputer = /\bnews\b.*\b(?:laptop|computer|screen)\b/.test(normalized);
  return namesFinancialNews || newsOnComputer
    ? ['financial analyst reviewing business news laptop']
    : [];
}
