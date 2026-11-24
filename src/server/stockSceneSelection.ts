import { selectRelevantArticleVisualEntities } from './articleVisualEntities';
import { getCanonicalStockAssetId } from './stockAssetIdentity';

export interface StockSceneSearchInput {
  query: string;
  context?: string;
  narration?: string;
  reasonToAvoid?: string;
  categoryAlternatives?: string[];
  maxQueries?: number;
}

function normalize(value: string): string {
  return String(value || '').toLocaleLowerCase('pl-PL').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function cleanQuery(value: string): string {
  return String(value || '').replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 100);
}

/** Build bounded search variants from the exact scene beat, not just its article category. */
export function buildStockSceneSearchQueries(input: StockSceneSearchInput): string[] {
  const original = cleanQuery(input.query);
  if (!original) return [];
  // Classify the individual scene from its own query and narration. Article context may
  // mention several topics (for example Wall Street and inflation); using it here lets
  // one article-level keyword inject unrelated stock queries into every scene.
  // Classify the individual scene from its own query and narration. Article context may
  // mention several topics (for example Wall Street and inflation); it must not override
  // a scene-specific cue or inject unrelated stock queries into every scene.
  const combined = normalize([original, input.narration || ''].join(' '));
  const detectTopics = (text: string) => ({
    isFixedMortgageRate: /fixed rate|fixed mortgage|interest rate|mortgage rate|stawki okresowo stalej stopy|stala stope|oprocentowan|stopa procentow/.test(text),
    isCreditCapacity: /credit capacity|borrowing capacity|zdolnosc kredytow|zdolnosc|pozyczyc wiecej|wiecej kredyt/.test(text),
    isMortgage: /mortgage|home loan|loan application|kredyt hipotec|hipotek|rata kredyt|bank advisor|doradca kredyt/.test(text),
    isBankApp: /mobile banking|banking app|bank app|aplikacj bankow|iko|ipko|bankowo|smartphone app/.test(text),
    isBankBrand: /bank brand|bank logo|logo bank|rebrand|brand identity|nowa identyfikacja|porzadk.*mark|zmien.*mark|bank.*nazw|mark.*banku/.test(text),
    isCentralBank: /national bank of poland|central bank|nbp|rpp|rada polityki pienieznej|rate decision/.test(text),
    isLand: /vacant land|building plot|land plot|dzialk|grunt|ziemi pod budow/.test(text),
    isInflation: /inflation|consumer price|grocery price|supermarket|inflacj|wzrost cen|ceny zywnosc/.test(text),
    isStockMarket: /stock market|stock exchange|shares|equity|gielda|akcj|notowan|wig\d*/.test(text),
    isCrypto: /cryptocurrency|crypto|bitcoin|ethereum|kryptowalut/.test(text),
    isCurrency: /currency|forex|exchange rate|walut|kurs euro|kurs dolara/.test(text),
    isTax: /tax|tax return|tax form|podatek|podatk|fiskus|urzad skarbow/.test(text)
  });
  const sceneTopics = detectTopics(combined);
  const hasSceneTopic = Object.values(sceneTopics).some(Boolean);
  const contextTopics = detectTopics(normalize(input.context || ''));
  const contextTopicEntries = Object.entries(contextTopics).filter(([, matched]) => matched);
  // "Interest rate" overlaps the NBP/RPP detector; do not count it as a second
  // article topic when the context clearly refers to central-bank policy.
  const specificContextTopics = contextTopicEntries.filter(([key]) =>
    !(key === 'isFixedMortgageRate' && contextTopics.isCentralBank)
  );
  const topicFlags = hasSceneTopic
    ? sceneTopics
    : specificContextTopics.length === 1
      ? contextTopics
      : sceneTopics;

  const {
    isFixedMortgageRate, isCreditCapacity, isMortgage, isBankApp, isBankBrand,
    isCentralBank, isLand, isInflation, isStockMarket, isCrypto, isCurrency, isTax
  } = topicFlags;
  const aliases: string[] = [];

  if (isCentralBank) aliases.push('National Bank of Poland monetary policy press conference', 'central bank interest rate decision meeting documents', 'central bank governor speaking at press conference');
  else if (isFixedMortgageRate) aliases.push('bank employee comparing fixed mortgage interest rates on computer', 'home loan fixed interest rate comparison documents', 'mortgage rate offer table on bank advisor tablet');
  else if (isCreditCapacity) aliases.push('mortgage advisor explaining borrowing capacity to home buyers', 'couple reviewing mortgage affordability with bank loan officer', 'home loan affordability calculator and mortgage application papers');
  else if (isMortgage) aliases.push('mortgage advisor explaining home loan documents to couple', 'home buyers reviewing mortgage application paperwork at bank', 'couple discussing home loan offer with bank consultant');
  else if (isBankApp) aliases.push('person navigating mobile banking app on smartphone close up', 'hands interacting with mobile banking application smartphone', 'customer using online bank account app on mobile phone');
  else if (isBankBrand) aliases.push('graphic designer reviewing corporate bank brand identity on computer', 'brand identity designer editing logo concepts on desktop screen', 'corporate rebranding presentation on monitor in design studio');
  else if (isLand) aliases.push('aerial view of vacant residential land plots with visible boundaries', 'land surveyor measuring undeveloped building plot with boundary stakes', 'young couple inspecting empty residential building land');
  else if (isInflation) aliases.push('shopper comparing grocery prices on supermarket shelf', 'close up of supermarket price labels and shopping basket', 'consumer price index inflation chart on computer screen');
  else if (isStockMarket) aliases.push('equity trader reviewing company share prices on trading terminal', 'investor analyzing stock market index chart on monitor', 'stock exchange trading floor with market data screens');
  else if (isCrypto) aliases.push('cryptocurrency trader reviewing bitcoin price chart on monitor', 'bitcoin and ethereum trading data on computer screen', 'person using cryptocurrency exchange app on smartphone');
  else if (isCurrency) aliases.push('currency exchange rate board showing euro and dollar', 'forex trader comparing currency pair rates on monitor', 'person checking currency conversion on smartphone');
  else if (isTax) aliases.push('accountant reviewing tax forms and calculator on desk', 'person completing online tax return on laptop', 'close up of tax payment statement and calculator');

  const reason = normalize(input.reasonToAvoid || '');
  if ((reason.includes('crypto') || reason.includes('bitcoin') || reason.includes('ethereum')) && isMortgage) aliases.unshift('mortgage advisor explaining home loan rates and paperwork to couple');
  if ((reason.includes('generic office') || reason.includes('keyboard') || reason.includes('klawiatur')) && isCreditCapacity) aliases.unshift('bank loan officer explaining mortgage borrowing capacity to couple');
  if ((reason.includes('wrong logo') || reason.includes('motyl') || reason.includes('butterfly')) && isBankBrand) aliases.unshift('corporate brand identity designer reviewing bank logo on large monitor');

  const relevantEntities = selectRelevantArticleVisualEntities(
    input.context || '',
    [original, input.narration || ''].join(' ')
  );
  const entityQueries = relevantEntities.flatMap((entity) => {
    const searchName = entity.canonical.includes('Narodowy Bank Polski')
      ? 'National Bank of Poland (NBP)'
      : entity.canonical.includes('Rada Polityki Pieniężnej')
        ? 'Polish Monetary Policy Council (RPP)'
        : entity.canonical.includes('Europejski Bank Centralny')
          ? 'European Central Bank (ECB)'
          : entity.canonical.includes('Komisja Nadzoru Finansowego')
            ? 'Polish Financial Supervision Authority (KNF)'
            : entity.canonical;
    return entity.type === 'model'
      ? [`${searchName} ${original}`, `${searchName} driving exterior`]
      : entity.type === 'institution'
        ? [`${searchName} ${original}`, `${searchName} headquarters exterior`]
        : [`${searchName} ${original}`];
  });

  const result: string[] = [];
  const seen = new Set<string>();
  const limit = Math.max(1, Math.min(5, Math.floor(input.maxQueries || 3)));
  for (const candidate of [...entityQueries, original, ...aliases, ...(input.categoryAlternatives || [])]) {
    const value = cleanQuery(candidate);
    const key = normalize(value);
    if (!value || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

/** Balance providers in the shortlist so one provider cannot starve the other. */
export function selectDiverseStockCandidates<T extends { source: 'pexels' | 'pixabay'; pexelsId?: number; stockId?: string; selectionScore?: number }>(
  candidates: T[], maxCandidates = 8, perProvider = 4
): T[] {
  const deduped = new Map<string, T>();
  for (const candidate of candidates) {
    const key = getCanonicalStockAssetId(candidate);
    if (!key) continue;
    const existing = deduped.get(key);
    if (!existing || (candidate.selectionScore || 0) > (existing.selectionScore || 0)) deduped.set(key, candidate);
  }
  const ranked = [...deduped.values()].sort((a, b) => (b.selectionScore || 0) - (a.selectionScore || 0));
  const max = Math.max(1, Math.min(16, Math.floor(maxCandidates) || 8));
  const pexels = ranked.filter((item) => item.source === 'pexels');
  const pixabay = ranked.filter((item) => item.source === 'pixabay');
  const pexelsLimit = pixabay.length === 0 ? max : perProvider;
  const pixabayLimit = pexels.length === 0 ? max : perProvider;
  const byProvider = {
    pexels: pexels.slice(0, pexelsLimit),
    pixabay: pixabay.slice(0, pixabayLimit)
  };
  const selected: T[] = [];
  for (let index = 0; selected.length < max; index++) {
    let added = false;
    for (const provider of ['pexels', 'pixabay'] as const) {
      const candidate = byProvider[provider][index];
      if (candidate) { selected.push(candidate); added = true; if (selected.length >= max) break; }
    }
    if (!added) break;
  }
  return selected;
}

/** Spread selected preview frames across the clip timeline instead of front-loading. */
export function selectStockPreviewFrameUrls(urls: string[], maxFrames = 4): string[] {
  const unique = [...new Set(urls.map((url) => String(url || '').trim()).filter(Boolean))];
  if (unique.length <= maxFrames) return unique;
  const count = Math.max(2, Math.min(6, Math.floor(maxFrames) || 4));
  return [...new Set(Array.from({ length: count }, (_, index) =>
    unique[Math.round(index * (unique.length - 1) / (count - 1))]
  ))];
}
