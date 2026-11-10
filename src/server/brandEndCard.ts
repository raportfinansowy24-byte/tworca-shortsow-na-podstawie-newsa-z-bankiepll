function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapWords(value: string, maxLineLength: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxLineLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ').slice(0, maxLineLength - 1).trimEnd() + '…'];
}

/** Deterministic 9:16 end card. Never uses an external/stock visual for the CTA. */
export function buildBrandedCtaSvg(title: string, subtitle = 'RAPORT-FINANSOWY24.PL'): string {
  const lines = wrapWords(title, 24, 3);
  const titleText = lines.map((line, index) =>
    `<text x="360" y="${520 + index * 78}" text-anchor="middle" fill="#ffffff" font-size="54" font-family="TikTok Sans, Arial, sans-serif" font-weight="800">${escapeXml(line)}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><rect width="720" height="1280" fill="#071426"/><circle cx="610" cy="180" r="210" fill="#b7f34a" opacity="0.12"/><rect x="72" y="312" width="576" height="1" fill="#334155"/><text x="360" y="250" text-anchor="middle" fill="#b7f34a" font-size="30" font-family="TikTok Sans, Arial, sans-serif" font-weight="700" letter-spacing="3">RAPORT FINANSOWY 24</text>${titleText}<rect x="252" y="820" width="216" height="6" rx="3" fill="#b7f34a"/><text x="360" y="900" text-anchor="middle" fill="#cbd5e1" font-size="27" font-family="TikTok Sans, Arial, sans-serif">${escapeXml(subtitle.slice(0, 64))}</text><text x="360" y="1120" text-anchor="middle" fill="#64748b" font-size="20" font-family="TikTok Sans, Arial, sans-serif">SPRAWDŹ ŹRÓDŁO I SZCZEGÓŁY</text></svg>`;
}
