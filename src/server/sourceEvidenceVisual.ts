import { normalizeFinanceText } from '../utils/financeSceneMatching';
import { isSafeFinanceDataVisualSvg } from './sceneContract';

export interface SourceEvidenceVisual {
  visualMode: 'data_visual';
  visualTitle: string;
  visualSubtitle: string;
  visualSvg: string;
  facts: [];
}

export type StockOrEvidenceVisual<TStock> =
  | { kind: 'stock'; value: TStock }
  | { kind: 'data_visual'; value: SourceEvidenceVisual; stockError: unknown };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function excerptForCard(evidence: string): string {
  const maxChars = 112;
  if (evidence.length <= maxChars) return evidence;
  const prefix = evidence.slice(0, maxChars - 1);
  const lastSpace = prefix.lastIndexOf(' ');
  return `${prefix.slice(0, lastSpace > 48 ? lastSpace : prefix.length).trimEnd()}…`;
}

function wrapQuote(value: string, maxLineLength = 27): string[] | null {
  const lines: string[] = [];
  let current = '';
  for (const word of value.split(/\s+/).filter(Boolean)) {
    if (word.length > maxLineLength) return null;
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxLineLength) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 && lines.length <= 5 ? lines : null;
}

/** Build a branded quote card only when the supplied evidence is present in the source. */
export function buildSourceEvidenceVisual(sourceText: string, sourceEvidence: string): SourceEvidenceVisual | null {
  const source = String(sourceText || '').trim();
  const evidence = String(sourceEvidence || '').replace(/\s+/g, ' ').trim();
  const evidenceWords = evidence.split(/\s+/).filter(Boolean);
  if (!source || evidenceWords.length < 3 || evidence.length > 600) return null;

  const normalizedSource = normalizeFinanceText(source);
  const normalizedEvidence = normalizeFinanceText(evidence);
  if (normalizedEvidence.length < 10 || !normalizedSource.includes(normalizedEvidence)) return null;

  const lines = wrapQuote(excerptForCard(evidence));
  if (!lines) return null;
  const quoteLines = lines.map((line, index) =>
    `<text x="360" y="${475 + index * 52}" text-anchor="middle" fill="#f8fafc" font-size="29" font-family="Arial, sans-serif" font-weight="700">${escapeXml(line)}</text>`
  ).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><rect width="720" height="1280" fill="#07111f"/><circle cx="620" cy="170" r="190" fill="#b7f34a" opacity="0.08"/><rect x="48" y="88" width="624" height="1104" rx="34" fill="#0e1c2f" stroke="#29415e" stroke-width="2"/><rect x="88" y="140" width="8" height="84" rx="4" fill="#b7f34a"/><text x="120" y="176" fill="#b7f34a" font-size="22" font-family="Arial, sans-serif" font-weight="800" letter-spacing="2">FAKT Z ARTYKUŁU</text><text x="360" y="318" text-anchor="middle" fill="#94a3b8" font-size="19" font-family="Arial, sans-serif" font-weight="700" letter-spacing="1">FRAGMENT ŹRÓDŁOWEJ INFORMACJI</text><line x1="128" y1="360" x2="592" y2="360" stroke="#334155" stroke-width="2"/>${quoteLines}<line x1="128" y1="824" x2="592" y2="824" stroke="#334155" stroke-width="2"/><text x="360" y="878" text-anchor="middle" fill="#cbd5e1" font-size="21" font-family="Arial, sans-serif" font-weight="700">ŹRÓDŁO: ARTYKUŁ BANKIER.PL</text><text x="360" y="1110" text-anchor="middle" fill="#64748b" font-size="18" font-family="Arial, sans-serif" letter-spacing="1">RAPORTFINANSOWY24.PL · MATERIAŁ INFORMACYJNY</text></svg>`;
  if (!isSafeFinanceDataVisualSvg(svg)) return null;

  return {
    visualMode: 'data_visual',
    visualTitle: 'Fakt z artykułu',
    visualSubtitle: 'Cytat ze źródła Bankier.pl',
    visualSvg: svg,
    facts: []
  };
}

/** Use a verified source quote only after stock resolution fails; otherwise preserve stock-first behavior. */
export async function resolveStockWithEvidenceFallback<TStock>(
  resolveStock: () => Promise<TStock>,
  buildFallback: () => SourceEvidenceVisual | null
): Promise<StockOrEvidenceVisual<TStock>> {
  try {
    return { kind: 'stock', value: await resolveStock() };
  } catch (stockError) {
    let fallback: SourceEvidenceVisual | null;
    try {
      fallback = buildFallback();
    } catch {
      throw stockError;
    }
    if (!fallback) throw stockError;
    return { kind: 'data_visual', value: fallback, stockError };
  }
}
