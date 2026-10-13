export type FinanceVisualCategory =
  | 'rates-credit'
  | 'bank-accounts'
  | 'savings-deposits'
  | 'credit-cards-cashback'
  | 'investments-markets'
  | 'currency-forex'
  | 'taxes-fees'
  | 'inflation-prices'
  | 'general-finance';

export interface FinanceSceneVisual {
  primaryKeyword: string;
  alternativeKeywords: string[];
  visualMood: string;
  reasoning: string;
}

interface CategoryDefinition {
  id: FinanceVisualCategory;
  triggers: string[];
  visualTerms: string[];
  forbiddenTerms: string[];
  scenes: FinanceSceneVisual[];
}

const COMMON_FORBIDDEN = ['crypto', 'bitcoin', 'ethereum', 'bullion', 'gold vault'];

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'rates-credit',
    triggers: [
      'rpp', 'nbp', 'rada polityki pienieznej', 'rada stop', 'stopy', 'stopy procentowe', 'stopy procentowych', 'stop procentowych',
      'stopa referencyjna', 'stop referencyjny', 'podwyzka stop', 'obnizka stop',
      'oprocentowanie kredytu', 'rata kredytu', 'raty kredytow', 'kredytow hipotecznych',
      'kredyt hipoteczny', 'kredyt gotowkowy', 'kredyt', 'odsetki', 'loan', 'mortgage', 'interest rate'
    ],
    visualTerms: [
      'loan', 'credit', 'mortgage', 'interest', 'rate', 'bank', 'financial', 'finance',
      'payment', 'installment', 'calculator', 'budget', 'advisor', 'document', 'paperwork', 'home'
    ],
    forbiddenTerms: [...COMMON_FORBIDDEN, 'cash', 'banknote', 'banknotes', 'counting money', 'counting cash'],
    scenes: [
      {
        primaryKeyword: 'loan payment calculator monthly installment',
        alternativeKeywords: ['home loan payment calculator', 'person checking monthly loan payment', 'mortgage repayment calculator'],
        visualMood: 'Zbliżenie na wyliczenie raty kredytu; dynamiczne, ale realistyczne ujęcie domowych finansów.',
        reasoning: 'Hook pokazuje bezpośredni temat newsa — koszt kredytu i możliwy wpływ decyzji o stopach — zamiast ogólnej gotówki.'
      },
      {
        primaryKeyword: 'interest rate chart financial analysis screen',
        alternativeKeywords: ['interest rate graph on computer', 'financial analyst reviewing interest rate data', 'central bank rate announcement building'],
        visualMood: 'Wykres stóp i analiza danych finansowych, bez sugerowania, że archiwalne ujęcie jest komunikatem NBP.',
        reasoning: 'Scena ilustruje potwierdzony fakt o poziomie stóp lub decyzji RPP.'
      },
      {
        primaryKeyword: 'loan advisor reviewing repayment documents with client',
        alternativeKeywords: ['mortgage advisor discussing loan documents', 'home loan application review at desk', 'bank advisor explaining loan terms'],
        visualMood: 'Rozmowa klienta z doradcą nad dokumentami kredytowymi.',
        reasoning: 'Ujęcie przekłada możliwy ruch stóp na temat kredytobiorcy, bez twierdzenia, że konkretna rata na pewno wzrośnie.'
      },
      {
        primaryKeyword: 'person calculating monthly loan budget at home',
        alternativeKeywords: ['household budget calculator loan payment', 'person planning loan repayment with calculator', 'monthly installment budget planning'],
        visualMood: 'Planowanie miesięcznego budżetu i raty; spokojniejszy kadr na wniosek i CTA.',
        reasoning: 'Finał pozostaje w tej samej kategorii kredytu i budżetu domowego, nie przechodzi do niezwiązanych aktywów.'
      }
    ]
  },
  {
    id: 'bank-accounts',
    triggers: ['konto osobiste', 'rachunek bankowy', 'konto bankowe', 'oplaty za konto', 'karta debetowa', 'bank account', 'checking account'],
    visualTerms: ['bank', 'account', 'banking', 'card', 'payment', 'fee', 'financial', 'finance', 'app', 'statement'],
    forbiddenTerms: [...COMMON_FORBIDDEN, 'casino', 'luxury car'],
    scenes: [
      { primaryKeyword: 'mobile banking app checking account balance', alternativeKeywords: ['person opening bank account on smartphone', 'online banking account dashboard'], visualMood: 'Smartfon i aplikacja bankowa.', reasoning: 'Wprowadza dokładnie temat konta bankowego.' },
      { primaryKeyword: 'bank account fees card payment banking app', alternativeKeywords: ['bank statement account fees close up', 'debit card payment banking app'], visualMood: 'Karta i ekran rachunku.', reasoning: 'Pokazuje mechanizm opłat lub korzystania z konta.' },
      { primaryKeyword: 'person reviewing bank account statement fees', alternativeKeywords: ['checking monthly bank statement at home', 'banking documents account charges'], visualMood: 'Analiza wyciągu i warunków konta.', reasoning: 'Ujęcie odpowiada scenie z konkretnym faktem o koncie.' },
      { primaryKeyword: 'comparing bank accounts on smartphone personal finance', alternativeKeywords: ['person comparing bank account features online', 'mobile banking account comparison'], visualMood: 'Porównanie i decyzja użytkownika.', reasoning: 'Domyka temat konta i prowadzi do CTA.' }
    ]
  },
  {
    id: 'savings-deposits',
    triggers: ['konto oszczednosciowe', 'lokata', 'depozyt', 'oszczednosci', 'oprocentowanie oszczednosci', 'savings account', 'term deposit'],
    visualTerms: ['saving', 'savings', 'deposit', 'interest', 'bank', 'account', 'financial', 'finance', 'calculator', 'balance'],
    forbiddenTerms: [...COMMON_FORBIDDEN, 'counting cash', 'banknotes', 'casino'],
    scenes: [
      { primaryKeyword: 'savings account interest rate mobile banking app', alternativeKeywords: ['person checking savings account balance', 'online savings account interest'], visualMood: 'Ekran konta oszczędnościowego.', reasoning: 'Hook pokazuje produkt i temat oprocentowania.' },
      { primaryKeyword: 'savings deposit interest calculator financial planning', alternativeKeywords: ['deposit interest calculation calculator', 'savings growth calculator on laptop'], visualMood: 'Kalkulator i wyliczenie odsetek.', reasoning: 'Wizualizuje mechanizm oprocentowania.' },
      { primaryKeyword: 'person comparing savings account offers online', alternativeKeywords: ['bank savings account comparison screen', 'financial advisor discussing savings options'], visualMood: 'Porównanie warunków oszczędzania.', reasoning: 'Ujęcie wspiera wątek różnic pomiędzy ofertami.' },
      { primaryKeyword: 'financial savings goal planning calculator', alternativeKeywords: ['person planning savings goal at home', 'monthly savings plan notebook calculator'], visualMood: 'Planowanie celu oszczędnościowego.', reasoning: 'Zamyka materiał w kategorii oszczędności.' }
    ]
  },
  {
    id: 'credit-cards-cashback',
    triggers: ['karta kredytowa', 'cashback', 'moneyback', 'zwrot za platnosci', 'credit card', 'cash back'],
    visualTerms: ['credit', 'card', 'cashback', 'payment', 'checkout', 'shopping', 'bank', 'finance', 'purchase'],
    forbiddenTerms: [...COMMON_FORBIDDEN, 'mortgage', 'loan advisor'],
    scenes: [
      { primaryKeyword: 'contactless credit card payment close up', alternativeKeywords: ['person paying by credit card at checkout', 'credit card terminal payment'], visualMood: 'Dynamiczna płatność kartą.', reasoning: 'Hook natychmiast pokazuje kategorię karty.' },
      { primaryKeyword: 'credit card cashback rewards app screen', alternativeKeywords: ['cashback credit card payment smartphone', 'credit card reward balance mobile app'], visualMood: 'Aplikacja i informacja o zwrocie.', reasoning: 'Ujęcie odnosi się do mechanizmu cashbacku.' },
      { primaryKeyword: 'person reviewing credit card statement online', alternativeKeywords: ['credit card spending dashboard', 'bank card transaction list smartphone'], visualMood: 'Podgląd transakcji i kosztów.', reasoning: 'Scena pokazuje praktyczny aspekt korzystania z karty.' },
      { primaryKeyword: 'comparing credit card benefits on smartphone', alternativeKeywords: ['credit card rewards comparison online', 'person choosing a bank card'], visualMood: 'Porównanie opcji i CTA.', reasoning: 'Zamyka materiał w kategorii kart płatniczych.' }
    ]
  },
  {
    id: 'investments-markets',
    triggers: ['gielda', 'wig20', 'wig', 'akcje', 'etf', 'fundusz inwestycyjny', 'portfel inwestycyjny', 'trading', 'stock market', 'investing'],
    visualTerms: ['stock', 'market', 'trading', 'investment', 'portfolio', 'fund', 'etf', 'finance', 'financial', 'chart', 'exchange'],
    forbiddenTerms: ['mortgage', 'loan advisor', 'cash counting', 'banknotes', 'gold vault', 'crypto', 'bitcoin'],
    scenes: [
      { primaryKeyword: 'stock market chart investor screen', alternativeKeywords: ['stock exchange trading floor', 'financial market chart close up'], visualMood: 'Wykres rynku i ruch danych.', reasoning: 'Hook jest bezpośrednio związany z rynkiem kapitałowym.' },
      { primaryKeyword: 'ETF investment portfolio analytics laptop', alternativeKeywords: ['investor reviewing portfolio performance', 'fund performance chart laptop'], visualMood: 'Analiza portfela inwestycyjnego.', reasoning: 'Pokazuje konkretny mechanizm inwestowania.' },
      { primaryKeyword: 'person analyzing stock market graph', alternativeKeywords: ['financial analyst studying market chart', 'investor reviewing stock data'], visualMood: 'Analityk i wykres.', reasoning: 'Wizualizuje dane i interpretację rynku.' },
      { primaryKeyword: 'long term investment planning laptop', alternativeKeywords: ['person planning investment portfolio', 'financial planning portfolio chart'], visualMood: 'Planowanie długoterminowe.', reasoning: 'Zamyka materiał w kategorii inwestycji.' }
    ]
  },
  {
    id: 'currency-forex',
    triggers: ['waluty', 'kurs walut', 'kurs zlotego', 'dolar', 'euro', 'forex', 'exchange rate', 'currency'],
    visualTerms: ['currency', 'forex', 'exchange', 'rate', 'euro', 'dollar', 'zloty', 'financial', 'finance', 'conversion'],
    forbiddenTerms: [...COMMON_FORBIDDEN, 'mortgage', 'loan advisor'],
    scenes: [
      { primaryKeyword: 'currency exchange rate board euro dollar', alternativeKeywords: ['forex exchange rates screen', 'currency rates numbers display'], visualMood: 'Kursy walut na tablicy lub ekranie.', reasoning: 'Wprowadza temat notowań walut.' },
      { primaryKeyword: 'euro dollar exchange rate chart financial screen', alternativeKeywords: ['forex chart currency pair analysis', 'currency exchange graph on monitor'], visualMood: 'Wykres pary walutowej.', reasoning: 'Pokazuje zmianę kursu i dane rynkowe.' },
      { primaryKeyword: 'person checking currency conversion smartphone', alternativeKeywords: ['currency converter app close up', 'traveler checking exchange rate phone'], visualMood: 'Przeliczanie kursu na telefonie.', reasoning: 'Przekłada zmianę kursu na codzienną decyzję.' },
      { primaryKeyword: 'currency exchange office rate board', alternativeKeywords: ['person comparing currency exchange rates', 'currency exchange counter screen'], visualMood: 'Punkt wymiany i podsumowanie.', reasoning: 'Pozostaje przy walutach i wspiera CTA.' }
    ]
  },
  {
    id: 'taxes-fees',
    triggers: ['podatek', 'podatki', 'belka', 'prowizja', 'prowizje', 'oplaty bankowe', 'fee', 'tax'],
    visualTerms: ['tax', 'fee', 'bank', 'financial', 'finance', 'calculator', 'statement', 'bill', 'accountant', 'document'],
    forbiddenTerms: [...COMMON_FORBIDDEN, 'cash counting', 'banknotes', 'crypto', 'stock trading'],
    scenes: [
      { primaryKeyword: 'tax calculator financial paperwork desk', alternativeKeywords: ['person using tax calculator', 'tax form and calculator close up'], visualMood: 'Kalkulator i dokumenty podatkowe.', reasoning: 'Wprowadza temat podatków lub opłat.' },
      { primaryKeyword: 'accountant reviewing tax documents calculator', alternativeKeywords: ['financial fee schedule document close up', 'person checking bank fees statement'], visualMood: 'Analiza dokumentów i kosztów.', reasoning: 'Ilustruje wyjaśnienie mechanizmu opłaty.' },
      { primaryKeyword: 'person filing taxes laptop financial documents', alternativeKeywords: ['online tax form computer screen', 'accountant checking financial paperwork'], visualMood: 'Wypełnianie i weryfikacja dokumentów.', reasoning: 'Wspiera praktyczny wniosek.' },
      { primaryKeyword: 'comparing financial fees calculator documents', alternativeKeywords: ['person comparing bank charges statement', 'financial planning calculator paperwork'], visualMood: 'Porównanie i decyzja.', reasoning: 'Zamyka temat opłat i kieruje do CTA.' }
    ]
  },
  {
    id: 'inflation-prices',
    triggers: ['inflacja', 'cpi', 'drozyzna', 'wzrost cen', 'ceny zywnosci', 'price inflation', 'rising prices'],
    visualTerms: ['inflation', 'price', 'prices', 'grocery', 'shopping', 'supermarket', 'budget', 'receipt', 'financial', 'chart'],
    forbiddenTerms: [...COMMON_FORBIDDEN, 'cash counting', 'banknotes', 'mortgage advisor'],
    scenes: [
      { primaryKeyword: 'grocery price tags supermarket shopping', alternativeKeywords: ['person comparing grocery prices store', 'shopping cart supermarket price labels'], visualMood: 'Półka sklepowa i ceny.', reasoning: 'Hook pokazuje codzienny wymiar wzrostu cen.' },
      { primaryKeyword: 'inflation chart consumer prices data screen', alternativeKeywords: ['consumer price index graph laptop', 'economist reviewing inflation chart'], visualMood: 'Wykres cen i dane.', reasoning: 'Ilustruje fakty o inflacji, a nie abstrakcyjną gotówkę.' },
      { primaryKeyword: 'person comparing grocery prices shopping list', alternativeKeywords: ['family planning grocery budget at home', 'supermarket receipt price comparison'], visualMood: 'Porównanie zakupów i budżetu.', reasoning: 'Przekłada zmianę cen na decyzję gospodarstwa domowego.' },
      { primaryKeyword: 'household budget planning grocery receipts calculator', alternativeKeywords: ['monthly budget calculator grocery expenses', 'person planning family budget at table'], visualMood: 'Planowanie budżetu.', reasoning: 'Zamyka temat cen i domowych finansów.' }
    ]
  }
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'about', 'into', 'using', 'person', 'people', 'close', 'up', 'video',
  'dynamic', 'animation', 'timelapse', 'hyperlapse', 'portrait', 'vertical', 'finance', 'financial'
]);

export function normalizeFinanceText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsPhrase(text: string, phrase: string): boolean {
  const normalizedText = ` ${normalizeFinanceText(text)} `;
  const normalizedPhrase = ` ${normalizeFinanceText(phrase)} `;
  return normalizedText.includes(normalizedPhrase);
}

export function classifyFinanceVisualCategory(text: string): FinanceVisualCategory {
  const normalized = normalizeFinanceText(text);
  for (const definition of CATEGORY_DEFINITIONS) {
    if (definition.triggers.some((trigger) => containsPhrase(normalized, trigger))) return definition.id;
  }
  return 'general-finance';
}

export function getFinanceSceneVisualPlan(text: string, count = 4): FinanceSceneVisual[] | null {
  const category = classifyFinanceVisualCategory(text);
  const definition = CATEGORY_DEFINITIONS.find((item) => item.id === category);
  if (!definition) return null;
  const safeCount = Math.min(Math.max(Math.floor(count) || 4, 1), 4);
  return definition.scenes.slice(0, safeCount).map((scene) => ({
    ...scene,
    alternativeKeywords: [...scene.alternativeKeywords]
  }));
}

export interface PexelsRelevance {
  relevant: boolean;
  score: number;
  category: FinanceVisualCategory;
  categoryMatches: string[];
  sceneMatches: string[];
  forbiddenMatches: string[];
  reason: string;
}

function queryTokens(query: string): string[] {
  return normalizeFinanceText(query)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function scorePexelsCandidate(newsContext: string, query: string, videoUrlOrSlug: string): PexelsRelevance {
  const contextCategory = classifyFinanceVisualCategory(newsContext);
  const queryCategory = classifyFinanceVisualCategory(query);
  const category = contextCategory !== 'general-finance' ? contextCategory : queryCategory;
  const definition = CATEGORY_DEFINITIONS.find((item) => item.id === category);
  const slug = normalizeFinanceText(videoUrlOrSlug);
  const candidateTokens = new Set(slug.split(/\s+/).filter(Boolean));
  const hasToken = (term: string) => {
    const normalized = normalizeFinanceText(term);
    if (!normalized) return false;
    if (normalized.includes(' ')) return slug.includes(normalized);
    return candidateTokens.has(normalized) || [...candidateTokens].some((token) => token.startsWith(normalized) || normalized.startsWith(token));
  };

  const forbiddenMatches = (definition?.forbiddenTerms || []).filter(hasToken);
  const categoryMatches = (definition?.visualTerms || []).filter(hasToken);
  const tokens = queryTokens(query);
  const sceneMatches = tokens.filter(hasToken);
  const categoryPass = category === 'general-finance' ? sceneMatches.length > 0 : categoryMatches.length > 0;
  const scenePass = sceneMatches.length > 0;
  const relevant = forbiddenMatches.length === 0 && categoryPass && scenePass;
  const score = relevant ? categoryMatches.length * 30 + sceneMatches.length * 20 : -100;

  let reason = 'Brak wystarczającego pokrycia tematu i konkretnej sceny w opisie klipu.';
  if (forbiddenMatches.length > 0) reason = `Klip zawiera wykluczony motyw: ${forbiddenMatches.join(', ')}.`;
  else if (relevant) reason = `Potwierdzono kategorię ${category}; wspólne terminy sceny: ${sceneMatches.join(', ')}.`;

  return { relevant, score, category, categoryMatches, sceneMatches, forbiddenMatches, reason };
}

export function isVisualQueryAlignedWithNews(newsContext: string, query: string): boolean {
  const result = scorePexelsCandidate(newsContext, query, query);
  return result.relevant;
}

export function getCategorySceneAlternatives(text: string, sceneIndex: number): string[] {
  const plan = getFinanceSceneVisualPlan(text, 4);
  if (!plan || !plan[sceneIndex]) return [];
  const scene = plan[sceneIndex];
  return [scene.primaryKeyword, ...scene.alternativeKeywords];
}
