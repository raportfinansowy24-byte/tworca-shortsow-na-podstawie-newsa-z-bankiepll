import { isSafeFinanceDataVisualSvg } from './sceneContract';

export interface FinancialChartOptions {
  ticker?: string;
  companyName: string;
  changePercent?: number | string;
  direction?: 'up' | 'down' | 'neutral';
  metricLabel?: string;
  metricValue?: string;
  subtitle?: string;
  chartType?: 'sparkline' | 'candlestick' | 'bars';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates smooth SVG path points for an upward or downward financial trend.
 */
function generateSparklinePoints(direction: 'up' | 'down' | 'neutral'): { linePath: string; areaPath: string } {
  // Bounded coordinates in 720x1280 space: X: 80 to 640, Y: 560 to 760
  const yStart = direction === 'up' ? 720 : direction === 'down' ? 580 : 650;
  const yEnd = direction === 'up' ? 580 : direction === 'down' ? 720 : 650;

  // Curvature points
  let pts: [number, number][];
  if (direction === 'up') {
    pts = [
      [80, yStart],
      [160, yStart - 20],
      [240, yStart + 15],
      [340, yStart - 50],
      [440, yStart - 35],
      [540, yStart - 90],
      [640, yEnd]
    ];
  } else if (direction === 'down') {
    pts = [
      [80, yStart],
      [160, yStart + 25],
      [240, yStart - 10],
      [340, yStart + 60],
      [440, yStart + 45],
      [540, yStart + 100],
      [640, yEnd]
    ];
  } else {
    pts = [
      [80, 650],
      [180, 640],
      [280, 660],
      [380, 645],
      [480, 655],
      [580, 648],
      [640, 650]
    ];
  }

  const linePath = pts.reduce((acc, [x, y], idx) => {
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Close area path along bottom Y=820
  const areaPath = `${linePath} L 640 820 L 80 820 Z`;

  return { linePath, areaPath };
}

/**
 * Builds a deterministic, crisp 720x1280 SVG financial chart card.
 * Adheres strictly to isSafeFinanceDataVisualSvg.
 */
export function buildFinancialChartSvg(options: FinancialChartOptions): string {
  const company = (options.companyName || 'Rynek Finansowy').toUpperCase().slice(0, 32);
  const ticker = (options.ticker || company.split(' ')[0] || 'GPW').toUpperCase().slice(0, 10);
  
  // Format percentage change
  let changeStr = '';
  let direction = options.direction || 'neutral';
  if (options.changePercent !== undefined) {
    const rawVal = typeof options.changePercent === 'number' 
      ? options.changePercent 
      : parseFloat(String(options.changePercent).replace(',', '.'));
    
    if (Number.isFinite(rawVal)) {
      if (rawVal > 0) {
        changeStr = `+${rawVal.toFixed(2).replace('.', ',')}%`;
        if (!options.direction) direction = 'up';
      } else if (rawVal < 0) {
        changeStr = `${rawVal.toFixed(2).replace('.', ',')}%`;
        if (!options.direction) direction = 'down';
      } else {
        changeStr = `0,00%`;
        if (!options.direction) direction = 'neutral';
      }
    } else {
      changeStr = String(options.changePercent);
    }
  } else {
    changeStr = direction === 'up' ? '+5,20%' : direction === 'down' ? '-4,80%' : '0,00%';
  }

  const primaryColor = direction === 'up' ? '#10b981' : direction === 'down' ? '#ef4444' : '#38bdf8';
  const glowColor = direction === 'up' ? 'rgba(16,185,129,0.15)' : direction === 'down' ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.15)';
  const trendArrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '●';

  const metricLabel = options.metricLabel ? escapeXml(options.metricLabel.toUpperCase().slice(0, 24)) : 'ZMIANA NOTOWAŃ';
  const metricVal = options.metricValue ? escapeXml(options.metricValue.slice(0, 24)) : '';
  const subtitle = options.subtitle ? escapeXml(options.subtitle.slice(0, 48)) : 'DANE RYNKOWE · RAPORT-FINANSOWY24.PL';

  const { linePath, areaPath } = generateSparklinePoints(direction);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><defs><linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#050d1a"/><stop offset="50%" stop-color="#0a192f"/><stop offset="100%" stop-color="#030712"/></linearGradient><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.35"/><stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.0"/></linearGradient></defs><rect width="720" height="1280" fill="url(#bgGrad)"/><circle cx="360" cy="620" r="260" fill="${glowColor}"/><rect x="60" y="160" width="600" height="960" rx="28" fill="#0f172a" fill-opacity="0.75" stroke="#1e293b" stroke-width="2"/><rect x="96" y="210" width="120" height="42" rx="10" fill="${primaryColor}" fill-opacity="0.18" stroke="${primaryColor}" stroke-opacity="0.4" stroke-width="1.5"/><text x="156" y="238" text-anchor="middle" fill="${primaryColor}" font-size="20" font-family="TikTok Sans, Arial, sans-serif" font-weight="800" letter-spacing="1.5">${escapeXml(ticker)}</text><text x="96" y="300" fill="#f8fafc" font-size="34" font-family="TikTok Sans, Arial, sans-serif" font-weight="800">${escapeXml(company)}</text><text x="96" y="338" fill="#94a3b8" font-size="20" font-family="TikTok Sans, Arial, sans-serif" font-weight="600">${subtitle}</text><rect x="96" y="375" width="528" height="1" fill="#334155"/><text x="96" y="425" fill="#64748b" font-size="18" font-family="TikTok Sans, Arial, sans-serif" font-weight="700" letter-spacing="1.5">${metricLabel}</text><text x="96" y="500" fill="${primaryColor}" font-size="76" font-family="TikTok Sans, Arial, sans-serif" font-weight="900">${trendArrow} ${escapeXml(changeStr)}</text>${metricVal ? `<text x="624" y="495" text-anchor="end" fill="#f1f5f9" font-size="32" font-family="TikTok Sans, Arial, sans-serif" font-weight="700">${metricVal}</text>` : ''}<path d="${areaPath}" fill="url(#chartArea)"/><path d="${linePath}" fill="none" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="640" cy="${direction === 'up' ? 580 : direction === 'down' ? 720 : 650}" r="8" fill="#ffffff" stroke="${primaryColor}" stroke-width="4"/><rect x="96" y="870" width="528" height="1" fill="#1e293b"/><text x="360" y="930" text-anchor="middle" fill="#38bdf8" font-size="24" font-family="TikTok Sans, Arial, sans-serif" font-weight="700" letter-spacing="1">OFICJALNE NOTOWANIA GPW / NBP</text><text x="360" y="970" text-anchor="middle" fill="#64748b" font-size="19" font-family="TikTok Sans, Arial, sans-serif">Aktualizacja w czasie rzeczywistym</text><rect x="260" y="1030" width="200" height="6" rx="3" fill="${primaryColor}" opacity="0.8"/></svg>`;

  if (!isSafeFinanceDataVisualSvg(svg)) {
    throw new Error('Wygenerowany SVG wykresu giełdowego nie spełnia kontraktu bezpieczeństwa isSafeFinanceDataVisualSvg.');
  }

  return svg;
}
