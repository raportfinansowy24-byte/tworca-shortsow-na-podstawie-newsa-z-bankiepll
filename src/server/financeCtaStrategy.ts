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
  spokenText: string;
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
      spokenText: 'Sprawdź ofertę partnera.',
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
      spokenText: 'Sprawdź spółkę po NIP.',
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
      spokenText: 'Policz zysk z lokaty.',
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
      spokenText: 'Porównaj konta bankowe.',
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
      spokenText: 'Policz ratę kredytu.',
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
    spokenText: 'Sprawdź pełny kontekst.',
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
- Stopy procentowe, RPP, NBP, raty, kredyty lub hipoteka: tekst mówiony "Policz ratę kredytu."; docelowa strona: https://raport-finansowy24.pl/loan.
- Konto lub opłaty bankowe: tekst mówiony "Porównaj konta bankowe."; docelowa strona: https://raport-finansowy24.pl/konta.
- Spółka, GPW, akcje, wyniki firmy, NIP lub KRS: tekst mówiony "Sprawdź spółkę po NIP."; docelowa strona: https://raport-finansowy24.pl/firma.
- Lokaty, oszczędności, depozyty lub odsetki: tekst mówiony "Policz zysk z lokaty."; docelowa strona: https://raport-finansowy24.pl/savings.
- Promocja, bonus lub premia: CTA do oferty partnerskiej WYŁĄCZNIE przy aktualnej, zweryfikowanej ofercie z katalogu. W innym przypadku tekst mówiony "Sprawdź pełny kontekst."
- URL i ścieżkę strony umieść w opisie publikacji/metadanych, NIGDY w tekście lektora.
- Nie używaj ogólnego "obserwuj po więcej", jeśli można przypisać powyższy cel.
- Nie wymyślaj parametrów oferty, procentów, bonusów, przyznawalności ani pilności.
- CTA ma być ostatnią, krótką wypowiedzią; maksymalnie 4 słowa.
===============================================`;
}
