export type FinanceCtaType =
  | 'loan_calculator'
  | 'bank_accounts'
  | 'company_analysis'
  | 'savings_calculator'
  | 'verified_partner_offer'
  | 'editorial_analysis';

export interface FinanceCtaPlan {
  type: FinanceCtaType;
  text: string;
  caption: string;
  destinationPath: string;
  destinationUrl: string;
  requiresVerifiedOffer: boolean;
  reason: string;
}

type OfferMatchLike = {
  categoryPath?: string;
  categoryName?: string;
  catalogStatus?: string;
  observedOfferCount?: number;
  candidateOfferNamesAllowed?: boolean;
  promotionalCtaAllowed?: boolean;
};

const BASE_URL = 'https://raport-finansowy24.pl';

function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL');
}

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(normalize(phrase)));
}

export function selectFinanceCta(
  article: { title?: string; description?: string; summary?: string; category?: string },
  offerMatch?: OfferMatchLike
): FinanceCtaPlan {
  const text = normalize([
    article.title,
    article.description,
    article.summary,
    article.category
  ].filter(Boolean).join(' '));

  const isPromotion = hasAny(text, [
    'promocja', 'promocje', 'bonus', 'premia', 'cashback', 'oferta specjalna',
    'na start', 'oprocentowanie lokaty', 'promocyjne oprocentowanie'
  ]);

  // A promotion may use an affiliate CTA only when the live catalog explicitly
  // authorizes it. Otherwise remain editorial and never invent offer claims.
  const verifiedOfferAvailable = Boolean(
    isPromotion &&
    offerMatch?.promotionalCtaAllowed === true &&
    offerMatch.catalogStatus === 'fresh' &&
    Number(offerMatch.observedOfferCount) > 0 &&
    offerMatch.candidateOfferNamesAllowed === true
  );

  if (verifiedOfferAvailable) {
    const destinationPath = offerMatch?.categoryPath || '/';
    return {
      type: 'verified_partner_offer',
      text: `Sprawdź zweryfikowaną ofertę partnera na ${destinationPath.replace(/^\//, '') || 'RaportFinansowy24'}.`,
      caption: 'SPRAWDŹ ZWERYFIKOWANĄ OFERTĘ',
      destinationPath,
      destinationUrl: `${BASE_URL}${destinationPath}`,
      requiresVerifiedOffer: true,
      reason: 'Promocja ma aktualny, zweryfikowany wpis w katalogu ofert.'
    };
  }

  if (hasAny(text, ['spółka', 'spółki', 'akcje', 'gpw', 'giełda', 'wyniki finansowe', 'dywidenda', 'kurs akcji', 'krs', 'nip', 'regon'])) {
    return {
      type: 'company_analysis',
      text: 'Sprawdź analizę spółki po NIP lub KRS na raport-finansowy24.pl/firma.',
      caption: 'SPRAWDŹ ANALIZĘ SPÓŁKI',
      destinationPath: '/firma',
      destinationUrl: `${BASE_URL}/firma`,
      requiresVerifiedOffer: false,
      reason: 'News dotyczy spółki, rynku akcji lub wyników przedsiębiorstwa.'
    };
  }

  if (hasAny(text, ['lokata', 'lokaty', 'oszczędności', 'oszczednosci', 'depozyt', 'odsetki'])) {
    return {
      type: 'savings_calculator',
      text: 'Sprawdź, ile mogą urosnąć Twoje oszczędności na raport-finansowy24.pl/savings.',
      caption: 'POLICZ ZYSK Z OSZCZĘDNOŚCI',
      destinationPath: '/savings',
      destinationUrl: `${BASE_URL}/savings`,
      requiresVerifiedOffer: false,
      reason: 'News dotyczy oszczędzania, lokat lub odsetek.'
    };
  }

  if (hasAny(text, ['konto bankowe', 'konta bankowe', 'konto osobiste', 'konta osobiste', 'bank zmienia', 'opłata za konto', 'rachunek bankowy'])) {
    return {
      type: 'bank_accounts',
      text: 'Porównaj aktualne konta i warunki na raport-finansowy24.pl/konta.',
      caption: 'PORÓWNAJ AKTUALNE KONTA',
      destinationPath: '/konta',
      destinationUrl: `${BASE_URL}/konta`,
      requiresVerifiedOffer: false,
      reason: 'News dotyczy konta, banku lub opłat bankowych.'
    };
  }

  if (hasAny(text, ['stopa procentowa', 'stopy procentowe', 'rpp', 'nbp', 'rata', 'raty', 'kredyt', 'kredyty', 'hipoteka', 'hipoteczny', 'refinansowanie'])) {
    return {
      type: 'loan_calculator',
      text: 'Sprawdź wpływ tej zmiany na ratę w kalkulatorze: raport-finansowy24.pl/loan.',
      caption: 'SPRAWDŹ WPŁYW NA RATĘ',
      destinationPath: '/loan',
      destinationUrl: `${BASE_URL}/loan`,
      requiresVerifiedOffer: false,
      reason: 'News dotyczy stóp, rat, kredytów lub hipoteki.'
    };
  }

  return {
    type: 'editorial_analysis',
    text: 'Sprawdź pełny kontekst i źródła na raport-finansowy24.pl.',
    caption: 'SPRAWDŹ PEŁNY KONTEKST',
    destinationPath: '/',
    destinationUrl: BASE_URL,
    requiresVerifiedOffer: false,
    reason: 'Brak wystarczająco konkretnego sygnału do bezpiecznego CTA produktowego.'
  };
}

export function buildCtaPolicyPrompt(): string {
  return `
=== POLITYKA CTA — WYBIERZ JEDNO CTA ZGODNIE Z NEWSEM ===
- Stopy procentowe, RPP, NBP, raty, kredyty lub hipoteka: "Sprawdź wpływ tej zmiany na ratę w kalkulatorze: raport-finansowy24.pl/loan."
- Bank, konto lub opłaty za konto: "Porównaj aktualne konta i warunki na raport-finansowy24.pl/konta."
- Spółka, GPW, akcje, wyniki firmy, NIP lub KRS: "Sprawdź analizę spółki po NIP lub KRS na raport-finansowy24.pl/firma."
- Lokaty, oszczędności, depozyty lub odsetki: "Sprawdź, ile mogą urosnąć Twoje oszczędności na raport-finansowy24.pl/savings."
- Promocja, bonus lub premia: użyj CTA do konkretnej oferty partnerskiej WYŁĄCZNIE, jeśli przekazany katalog oznacza ją jako aktualną i zweryfikowaną. W przeciwnym razie użyj: "Sprawdź pełny kontekst i źródła na raport-finansowy24.pl."
- Nie używaj ogólnego "obserwuj po więcej", jeśli można przypisać jeden z powyższych celów.
- Nie wymyślaj parametrów oferty, procentów, bonusów, przyznawalności ani pilności.
- CTA ma być w ostatniej scenie, mieć jedno działanie i mieścić się w limicie słów.
===============================================`;
}
