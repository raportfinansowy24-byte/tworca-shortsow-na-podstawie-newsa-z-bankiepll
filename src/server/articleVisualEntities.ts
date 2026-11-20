export type ArticleVisualEntityType = 'brand' | 'model' | 'institution' | 'product';

export interface ArticleVisualEntity {
  type: ArticleVisualEntityType;
  canonical: string;
  aliases: string[];
  family?: string;
}

const ENTITY_CATALOG: ArticleVisualEntity[] = [
  { type: 'brand', canonical: 'Volkswagen', aliases: ['Volkswagen', 'VW'] },
  { type: 'brand', canonical: 'Mercedes-Benz', aliases: ['Mercedes-Benz', 'Mercedes Benz', 'Mercedes'] },
  { type: 'brand', canonical: 'BMW', aliases: ['BMW', 'Bayerische Motoren Werke'] },
  { type: 'brand', canonical: 'Audi', aliases: ['Audi'] },
  { type: 'brand', canonical: 'Peugeot', aliases: ['Peugeot'] },
  { type: 'brand', canonical: 'Škoda', aliases: ['Škoda', 'Skoda'] },
  { type: 'brand', canonical: 'Toyota', aliases: ['Toyota'] },
  { type: 'brand', canonical: 'Renault', aliases: ['Renault'] },
  { type: 'brand', canonical: 'Ford', aliases: ['Ford'] },
  { type: 'brand', canonical: 'Hyundai', aliases: ['Hyundai'] },
  { type: 'brand', canonical: 'Kia', aliases: ['Kia'] },
  { type: 'brand', canonical: 'Volvo', aliases: ['Volvo'] },
  { type: 'brand', canonical: 'Tesla', aliases: ['Tesla'] },
  { type: 'brand', canonical: 'Porsche', aliases: ['Porsche'] },
  { type: 'brand', canonical: 'Opel', aliases: ['Opel'] },
  { type: 'brand', canonical: 'Fiat', aliases: ['Fiat'] },
  { type: 'brand', canonical: 'Nissan', aliases: ['Nissan'] },
  { type: 'brand', canonical: 'Mazda', aliases: ['Mazda'] },
  { type: 'brand', canonical: 'Honda', aliases: ['Honda'] },
  { type: 'brand', canonical: 'Citroën', aliases: ['Citroën', 'Citroen'] },
  { type: 'brand', canonical: 'Suzuki', aliases: ['Suzuki'] },
  { type: 'brand', canonical: 'Mitsubishi', aliases: ['Mitsubishi'] },
  { type: 'brand', canonical: 'SEAT', aliases: ['SEAT'] },
  { type: 'brand', canonical: 'CUPRA', aliases: ['CUPRA'] },
  { type: 'brand', canonical: 'Dacia', aliases: ['Dacia'] },
  { type: 'brand', canonical: 'Jeep', aliases: ['Jeep'] },
  { type: 'brand', canonical: 'Lexus', aliases: ['Lexus'] },
  { type: 'brand', canonical: 'ORLEN', aliases: ['ORLEN', 'PKN Orlen'] },
  { type: 'brand', canonical: 'Allegro', aliases: ['Allegro'] },
  { type: 'brand', canonical: 'Żabka', aliases: ['Żabka', 'Zabka'] },
  { type: 'brand', canonical: 'InPost', aliases: ['InPost'] },
  { type: 'brand', canonical: 'PZU', aliases: ['PZU'] },
  { type: 'brand', canonical: 'Lidl', aliases: ['Lidl'] },
  { type: 'brand', canonical: 'Biedronka', aliases: ['Biedronka'] },
  { type: 'brand', canonical: 'Dino', aliases: ['Dino'] },
  { type: 'brand', canonical: 'KGHM', aliases: ['KGHM'] },
  { type: 'brand', canonical: 'LPP', aliases: ['LPP'] },
  { type: 'brand', canonical: 'CD Projekt', aliases: ['CD Projekt', 'CD Projekt Red'] },
  { type: 'brand', canonical: 'PGE', aliases: ['PGE'] },
  { type: 'brand', canonical: 'Tauron', aliases: ['Tauron'] },
  { type: 'brand', canonical: 'Enea', aliases: ['Enea'] },

  { type: 'model', canonical: 'Volkswagen Tayron', aliases: ['Volkswagen Tayron', 'VW Tayron', 'Tayron'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Volkswagen Tiguan', aliases: ['Volkswagen Tiguan', 'VW Tiguan', 'Tiguan'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Volkswagen Touareg', aliases: ['Volkswagen Touareg', 'VW Touareg', 'Touareg'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Volkswagen Golf', aliases: ['Volkswagen Golf', 'VW Golf', 'Golf'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Volkswagen Passat', aliases: ['Volkswagen Passat', 'VW Passat', 'Passat'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Volkswagen T-Roc', aliases: ['Volkswagen T-Roc', 'VW T-Roc', 'T-Roc'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Volkswagen T-Cross', aliases: ['Volkswagen T-Cross', 'VW T-Cross', 'T-Cross'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Volkswagen ID.4', aliases: ['Volkswagen ID.4', 'VW ID.4', 'ID.4'], family: 'Volkswagen' },
  { type: 'model', canonical: 'Mercedes-Benz GLE', aliases: ['Mercedes-Benz GLE', 'Mercedes GLE', 'GLE'], family: 'Mercedes-Benz' },
  { type: 'model', canonical: 'Mercedes-Benz GLC', aliases: ['Mercedes-Benz GLC', 'Mercedes GLC', 'GLC'], family: 'Mercedes-Benz' },
  { type: 'model', canonical: 'Mercedes-Benz GLS', aliases: ['Mercedes-Benz GLS', 'Mercedes GLS', 'GLS'], family: 'Mercedes-Benz' },
  { type: 'model', canonical: 'BMW X5', aliases: ['BMW X5', 'X5'], family: 'BMW' },
  { type: 'model', canonical: 'BMW X3', aliases: ['BMW X3', 'X3'], family: 'BMW' },
  { type: 'model', canonical: 'BMW Seria 3', aliases: ['BMW Seria 3', 'BMW 3 Series', '3 Series'], family: 'BMW' },
  { type: 'model', canonical: 'Audi Q5', aliases: ['Audi Q5', 'Q5'], family: 'Audi' },
  { type: 'model', canonical: 'Audi Q7', aliases: ['Audi Q7', 'Q7'], family: 'Audi' },
  { type: 'model', canonical: 'Peugeot 3008', aliases: ['Peugeot 3008', '3008'], family: 'Peugeot' },
  { type: 'model', canonical: 'Peugeot 5008', aliases: ['Peugeot 5008', '5008'], family: 'Peugeot' },
  { type: 'model', canonical: 'Toyota RAV4', aliases: ['Toyota RAV4', 'RAV4'], family: 'Toyota' },
  { type: 'model', canonical: 'Toyota Corolla', aliases: ['Toyota Corolla', 'Corolla'], family: 'Toyota' },
  { type: 'model', canonical: 'Škoda Kodiaq', aliases: ['Škoda Kodiaq', 'Skoda Kodiaq', 'Kodiaq'], family: 'Škoda' },
  { type: 'model', canonical: 'Škoda Octavia', aliases: ['Škoda Octavia', 'Skoda Octavia', 'Octavia'], family: 'Škoda' },
  { type: 'model', canonical: 'Renault Austral', aliases: ['Renault Austral', 'Austral'], family: 'Renault' },
  { type: 'model', canonical: 'Ford Kuga', aliases: ['Ford Kuga', 'Kuga'], family: 'Ford' },
  { type: 'model', canonical: 'Tesla Model Y', aliases: ['Tesla Model Y', 'Model Y'], family: 'Tesla' },
  { type: 'model', canonical: 'Tesla Model 3', aliases: ['Tesla Model 3', 'Model 3'], family: 'Tesla' },
  { type: 'model', canonical: 'Hyundai Tucson', aliases: ['Hyundai Tucson', 'Tucson'], family: 'Hyundai' },
  { type: 'model', canonical: 'Kia Sportage', aliases: ['Kia Sportage', 'Sportage'], family: 'Kia' },
  { type: 'model', canonical: 'Volvo XC60', aliases: ['Volvo XC60', 'XC60'], family: 'Volvo' },
  { type: 'model', canonical: 'Opel Astra', aliases: ['Opel Astra', 'Astra'], family: 'Opel' },

  { type: 'institution', canonical: 'Narodowy Bank Polski (NBP)', aliases: ['Narodowy Bank Polski', 'NBP'] },
  { type: 'institution', canonical: 'Rada Polityki Pieniężnej (RPP)', aliases: ['Rada Polityki Pieniężnej', 'RPP'] },
  { type: 'institution', canonical: 'Europejski Bank Centralny (EBC)', aliases: ['Europejski Bank Centralny', 'EBC', 'ECB'] },
  { type: 'institution', canonical: 'Komisja Nadzoru Finansowego (KNF)', aliases: ['Komisja Nadzoru Finansowego', 'KNF'] },
  { type: 'institution', canonical: 'Bank Gospodarstwa Krajowego (BGK)', aliases: ['Bank Gospodarstwa Krajowego', 'BGK'] },
  { type: 'institution', canonical: 'Główny Urząd Statystyczny (GUS)', aliases: ['Główny Urząd Statystyczny', 'GUS'] },
  { type: 'institution', canonical: 'Zakład Ubezpieczeń Społecznych (ZUS)', aliases: ['Zakład Ubezpieczeń Społecznych', 'ZUS'] },
  { type: 'institution', canonical: 'Urząd Ochrony Konkurencji i Konsumentów (UOKiK)', aliases: ['Urząd Ochrony Konkurencji i Konsumentów', 'UOKiK'] },
  { type: 'institution', canonical: 'Ministerstwo Finansów', aliases: ['Ministerstwo Finansów', 'Minister Finansów'] },
  { type: 'institution', canonical: 'Krajowa Administracja Skarbowa (KAS)', aliases: ['Krajowa Administracja Skarbowa', 'KAS'] },
  { type: 'institution', canonical: 'PKO Bank Polski', aliases: ['PKO Bank Polski', 'PKO BP', 'PKOBP'] },
  { type: 'institution', canonical: 'Bank Pekao', aliases: ['Bank Pekao', 'Pekao SA', 'Pekao S.A.'] },
  { type: 'institution', canonical: 'Santander Bank Polska', aliases: ['Santander Bank Polska', 'Santander'] },
  { type: 'institution', canonical: 'mBank', aliases: ['mBank'] },
  { type: 'institution', canonical: 'ING Bank Śląski', aliases: ['ING Bank Śląski', 'ING Bank Slaski', 'ING'] },
  { type: 'institution', canonical: 'Alior Bank', aliases: ['Alior Bank', 'Alior'] },
  { type: 'institution', canonical: 'Bank Millennium', aliases: ['Bank Millennium', 'Millennium Bank'] },
  { type: 'institution', canonical: 'BNP Paribas Bank Polska', aliases: ['BNP Paribas Bank Polska', 'BNP Paribas'] },
  { type: 'institution', canonical: 'Narodowy Fundusz Zdrowia (NFZ)', aliases: ['Narodowy Fundusz Zdrowia', 'NFZ'] },
  { type: 'institution', canonical: 'Polski Fundusz Rozwoju (PFR)', aliases: ['Polski Fundusz Rozwoju', 'PFR'] },
  { type: 'institution', canonical: 'Bankowy Fundusz Gwarancyjny (BFG)', aliases: ['Bankowy Fundusz Gwarancyjny', 'BFG'] },
  { type: 'institution', canonical: 'Agencja Restrukturyzacji i Modernizacji Rolnictwa (ARiMR)', aliases: ['Agencja Restrukturyzacji i Modernizacji Rolnictwa', 'ARiMR'] },

  { type: 'product', canonical: 'Bezpieczny Kredyt 2%', aliases: ['Bezpieczny Kredyt 2%', 'Bezpieczny Kredyt'] },
  { type: 'product', canonical: 'Rodzinny Kredyt Mieszkaniowy', aliases: ['Rodzinny Kredyt Mieszkaniowy'] },
  { type: 'product', canonical: 'Konto Mieszkaniowe', aliases: ['Konto Mieszkaniowe'] },
  { type: 'product', canonical: 'IKE', aliases: ['Indywidualne Konto Emerytalne', 'IKE'] },
  { type: 'product', canonical: 'IKZE', aliases: ['Indywidualne Konto Zabezpieczenia Emerytalnego', 'IKZE'] },
  { type: 'product', canonical: 'Pracownicze Plany Kapitałowe (PPK)', aliases: ['Pracownicze Plany Kapitałowe', 'PPK'] },
  { type: 'product', canonical: 'Pracowniczy Program Emerytalny (PPE)', aliases: ['Pracowniczy Program Emerytalny', 'PPE'] },
  { type: 'product', canonical: 'Obligacje Skarbowe', aliases: ['Obligacje Skarbowe', 'obligacje skarbowe'] }
];

function normalize(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function containsAlias(text: string, alias: string): boolean {
  const normalizedText = ' ' + normalize(text) + ' ';
  const normalizedAlias = normalize(alias);
  return Boolean(normalizedAlias) && normalizedText.includes(' ' + normalizedAlias + ' ');
}

function uniqueEntities(entities: ArticleVisualEntity[]): ArticleVisualEntity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = entity.type + ':' + normalize(entity.canonical);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractArticleVisualEntities(articleText: string): ArticleVisualEntity[] {
  const source = String(articleText || '').slice(0, 24000);
  if (!source.trim()) return [];

  const detected = ENTITY_CATALOG.filter((entity) =>
    entity.aliases.some((alias) => containsAlias(source, alias))
  );

  // Catch explicitly named retail products that are not in the fixed catalog.
  // Only accept a capitalized name immediately following a product-type marker.
  const labelledProductPattern = /\b(?:produkt|program|konto|lokata|polisa|fundusz|ubezpieczenie)\s+([A-ZŁŚŻŹĆŃÓĄĘ][\p{L}\p{N}.-]*(?:\s+[A-ZŁŚŻŹĆŃÓĄĘ][\p{L}\p{N}.-]*){0,3})/gu;
  for (const match of source.matchAll(labelledProductPattern)) {
    const name = String(match[1] || '').trim();
    if (name.length >= 3 && !['Bank Polski', 'Bank Centralny'].includes(name)) {
      detected.push({ type: 'product', canonical: name, aliases: [name] });
    }
  }

  return uniqueEntities(detected).slice(0, 16);
}

const VEHICLE_CUES = /\b(?:samochod\w*|auto\w*|suv\w*|crossover\w*|pojazd\w*|silnik\w*|motoryzac\w*|jazd\w*|terenow\w*|kierowc\w*)\b/;
const INSTITUTION_CUES = /\b(?:bank\w*|instytucj\w*|urzad\w*|minister\w*|regulator\w*|nadzor\w*|stop\w* procentow\w*|polityk\w* pieniez\w*|skladk\w*|emerytur\w*)\b/;
const PRODUCT_CUES = /\b(?:produkt\w*|ofert\w*|kont\w*|kredyt\w*|lokat\w*|polis\w*|ubezpieczen\w*|program\w*|obligacj\w*|oszczedzan\w*)\b/;

export function selectRelevantArticleVisualEntities(articleText: string, sceneText: string): ArticleVisualEntity[] {
  const entities = extractArticleVisualEntities(articleText);
  if (!entities.length) return [];

  const direct = entities.filter((entity) => entity.aliases.some((alias) => containsAlias(sceneText, alias)));
  const scene = normalize(sceneText);
  const hasVehicleCue = VEHICLE_CUES.test(scene);
  const hasInstitutionCue = INSTITUTION_CUES.test(scene);
  const hasProductCue = PRODUCT_CUES.test(scene);

  const relevant = [...direct];
  const models = entities.filter((entity) => entity.type === 'model');
  const institutions = entities.filter((entity) => entity.type === 'institution');
  const products = entities.filter((entity) => entity.type === 'product');
  const brands = entities.filter((entity) => entity.type === 'brand');

  if (hasVehicleCue && models.length === 1) relevant.push(models[0]);
  if (hasVehicleCue && models.length === 0 && brands.length === 1) relevant.push(brands[0]);
  if (hasInstitutionCue && institutions.length === 1) relevant.push(institutions[0]);
  if (hasProductCue && products.length === 1) relevant.push(products[0]);

  const deduped = uniqueEntities(relevant);
  const modelFamilies = new Set(deduped.filter((entity) => entity.type === 'model').map((entity) => entity.family).filter(Boolean));
  const withoutRedundantBrands = deduped.filter((entity) =>
    entity.type !== 'brand' || !modelFamilies.has(entity.canonical)
  );

  return withoutRedundantBrands
    .sort((a, b) => {
      const rank = (type: ArticleVisualEntityType) => type === 'model' ? 0 : type === 'institution' ? 1 : type === 'product' ? 2 : 3;
      return rank(a.type) - rank(b.type);
    })
    .slice(0, 4);
}

export function toRequiredVisualEntityChecks(entities: ArticleVisualEntity[]): Array<{
  type: ArticleVisualEntityType;
  canonical: string;
  aliases: string[];
}> {
  return entities.map(({ type, canonical, aliases }) => ({ type, canonical, aliases }));
}

export function visibleEntityNamesMatch(
  expected: Array<{ canonical: string; aliases: string[] }>,
  visibleEntities: string[]
): boolean {
  if (!expected.length) return true;
  const visibleText = ' ' + normalize(visibleEntities.join(' ')) + ' ';
  return expected.every((entity) =>
    entity.aliases.some((alias) => {
      const normalizedAlias = normalize(alias);
      return Boolean(normalizedAlias) && visibleText.includes(' ' + normalizedAlias + ' ');
    })
  );
}
