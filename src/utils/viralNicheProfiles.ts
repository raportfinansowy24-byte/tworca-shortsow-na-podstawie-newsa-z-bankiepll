// src/utils/viralNicheProfiles.ts
// Profiles for automated Gemini prompt adjustment based on specific viral niches

export interface ViralNicheProfile {
  id: string;
  name: string;
  icon: string;
  aliases: string[];
  targetAudience: string;
  editorialTone: string;
  energyLevel: 'ultra-high' | 'high' | 'measured-urgent' | 'authoritative-calm' | 'thoughtful';
  hookFormula: string;
  sampleHookExample: string;
  visualPacingStyle: string;
  suggestedPexelsKeywords: string[];
  recommendedHashtags: string[];
  ctaFocus: string;
  forbiddenTropes: string[];
  promptRoleDescription: string;
  toneGuidelines: string[];
}

export const VIRAL_NICHE_PROFILES: ViralNicheProfile[] = [
  {
    id: 'finanse-inwestycje',
    name: 'Finanse & Inwestycje',
    icon: '📊',
    aliases: [
      'finanse & biznes',
      'finanse',
      'finanse & sukces',
      'inwestycje',
      'gielda',
      'giełda & akcje gpw',
      'rynki i inwestycje'
    ],
    targetAudience: 'Inwestorzy indywidualni, osoby budujące portfel kapitałowy, czytelnicy giełdowi i analitycy szukający rynkowej asymetrii informacji.',
    editorialTone: 'Chłodny, bezwzględnie merytoryczny analityk finansowy (standard: Bloomberg Quicktake, Morning Brew, Wall Street Journal). Zero tanich obietnic, bezkompromisowe liczby, wyliczenia zysków/strat i twarde realia rynkowe.',
    energyLevel: 'measured-urgent',
    hookFormula: 'Pattern Interrupt oparty o asymetrię informacji lub kosztowny błąd w wycenie kapitału (0-3s)',
    sampleHookExample: 'Większość inwestorów myśli, że ten spadek to okazja. W rzeczywistości fundusze po cichu zamykają pozycje.',
    visualPacingStyle: 'Szybkie cięcia terminali giełdowych, wykresy świecowe (candlestick chart timelapse), wieżowce centrów finansowych nocą, szybkie przeliczanie banknotów.',
    suggestedPexelsKeywords: [
      'stock exchange screen numbers flashing',
      'fast stock market trading chart timelapse',
      'city skyscrapers night financial district',
      'corporate boardroom financial discussion glass office',
      'counting cash money bills dynamic'
    ],
    recommendedHashtags: ['#shorts', '#finanse', '#inwestowanie', '#gielda', '#gpw', '#pieniadze', '#inwestycje'],
    ctaFocus: 'Kieruj do raport-finansowy24.pl po pełne wskaźniki rynkowe, wyceny i analizę fundamentalną.',
    forbiddenTropes: [
      'gwarantowany zysk',
      'jak zarobić milion w tydzień',
      'tajna metoda',
      'bankierzy go nienawidzą'
    ],
    promptRoleDescription: 'Działasz jako elitarny analityk rynków kapitałowych i strateg makroekonomiczny portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Pisz krótkimi, precyzyjnymi zdaniami w tempie staccato.',
      'Operuj konkretnymi liczbami z artykułu (procenty, kapitalizacja, wolumen).',
      'Uderzaj w dysonans poznawczy inwestora – pokaż, dlaczego tłum na rynku zazwyczaj podejmuje decyzję zbyt późno.',
      'Zachowaj rygor faktograficzny – żadnych obietnic stóp zwrotu bez pokrycia.'
    ]
  },
  {
    id: 'bankowosc-kredyty',
    name: 'Bankowość & Budżet Domowy',
    icon: '💳',
    aliases: [
      'kredyty & stopy procentowe',
      'bankowość & oszczędzanie',
      'podatki & finanse osobiste',
      'inflacja & koszty życia',
      'kredyty',
      'banki'
    ],
    targetAudience: 'Zwykli konsumenci, kredytobiorcy hipoteczni i gotówkowi, posiadacze lokat oraz gospodarstwa domowe walczące z kosztami życia i opłatami bankowymi.',
    editorialTone: 'Bezpośredni, demaskatorski obrońca interesów konsumenta (styl doradcy portfela). Prosty język bez bankowego żargonu, wysoka empatia połączona z natychmiastowym alertem portfela.',
    energyLevel: 'high',
    hookFormula: 'Direct Wallet Threat / Alert Tabeli Opłat (0-3s): natychmiastowe wskazanie, skąd uciekają pieniądze widza.',
    sampleHookExample: 'Jeśli masz kredyt lub konto w banku, sprawdź ten jeden zapis w umowie zanim potrącą Ci nową prowizję.',
    visualPacingStyle: 'Karty płatnicze, bankomaty, skanowanie produktów w sklepie, paragony, smartfon z powiadomieniem bankowym, kalkulator rat.',
    suggestedPexelsKeywords: [
      'credit card payment terminal pos',
      'atm cash withdrawal money machine',
      'grocery store shopping cart inflation receipt',
      'smartphone banking mobile app notification',
      'person calculating budget home desk stressful'
    ],
    recommendedHashtags: ['#shorts', '#kredyt', '#banki', '#oszczedzanie', '#pieniadze', '#portfel', '#budzet'],
    ctaFocus: 'Kieruj do kalkulatorów rat, porównywarek kont i rankingów opłat na raport-finansowy24.pl.',
    forbiddenTropes: [
      'kredyt za darmo',
      'decyzja w 5 minut bez bik',
      'banki ukrywają ten trik'
    ],
    promptRoleDescription: 'Działasz jako bezkompromisowy ekspert finansów osobistych i rzecznik praw konsumenta portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Mów wprost do widza: "Twój portfel", "Twoja rata", "Twoje oszczędności".',
      'Wytłumacz skomplikowany mechanizm bankowy w jednym jasnym zdaniu zrozumiałym dla każdego.',
      'Wskaż konkretną kwotę lub różnicę w opłatach wynikającą z newsa.',
      'Daj praktyczną radę: co widz ma teraz sprawdzić w swojej bankowości.'
    ]
  },
  {
    id: 'krypto-web3',
    name: 'Kryptowaluty & Web3',
    icon: '🪙',
    aliases: [
      'kryptowaluty',
      'krypto & web3',
      'krypto',
      'bitcoin',
      'web3'
    ],
    targetAudience: 'Traderzy kryptowalut, entuzjaści Bitcoina, Ethereum i Web3, szukający analizy on-chain, ruchów wielorybów i nagłych skoków zmienności.',
    editorialTone: 'Dynamiczny, technologiczny, wyostrzony na zmienność i sygnały płynności (styl CoinDesk, Bankless). Śledzenie przepływów kapitału między giełdami a portfelami cold storage.',
    energyLevel: 'ultra-high',
    hookFormula: 'Whale Alert / Critical Liquidity Breakout (0-3s): powiadomienie o nagłym ruchu kapitału przed reakcją tłumu.',
    sampleHookExample: 'Wieloryby właśnie przerzuciły 40 000 Bitcoinów tuż przed tą jedną decyzją regulatora.',
    visualPacingStyle: 'Neonowe wykresy giełd krypto, cyfrowy kod binarny, serwerownie, animacje blockchain, cyberpunkowe stanowiska tradingowe.',
    suggestedPexelsKeywords: [
      'cryptocurrency trading chart screen neon',
      'bitcoin physical coin gold crypto mining',
      'digital server room glowing blue lights',
      'futuristic cyberpunk trading monitor data'
    ],
    recommendedHashtags: ['#shorts', '#krypto', '#bitcoin', '#btc', '#ethereum', '#web3', '#trading'],
    ctaFocus: 'Kieruj do analizy zmienności i aktualnych kursów krypto na raport-finansowy24.pl.',
    forbiddenTropes: [
      'to wystrzeli do 100x',
      'gwarantowany moon',
      'kupuj zanim będzie za późno',
      'porada finansowa 100%'
    ],
    promptRoleDescription: 'Działasz jako analityk rynków cyfrowych aktywów i danych on-chain dla portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Maksymalna energia od pierwszego ułamka sekundy – brak wstępów.',
      'Używaj precyzyjnych pojęć rynkowych: wieloryby, płynność, wolumen, dominacja BTC, opór.',
      'Podkreślaj ryzyko zmienności i brak emocjonalnych wejść na górkach.',
      'Wyjaśnij makroekonomiczny kontekst ruchu kapitału.'
    ]
  },
  {
    id: 'ai-tech',
    name: 'AI & Nowe Technologie',
    icon: '🤖',
    aliases: [
      'ai & tech',
      'ai & nowe technologie',
      'architektura ai',
      'sztuczna inteligencja',
      'technologia'
    ],
    targetAudience: 'Przedsiębiorcy, programiści, innowatorzy i osoby poszukujące dźwigni produktywności oraz zrozumienia gospodarczych skutków automatyzacji.',
    editorialTone: 'Futurystyczny, rygorystyczny, zorientowany na namacalną produktywność i modele biznesowe (styl Lex Fridman, The Information, MIT Tech Review). Zero powierzchownego sci-fi, 100% realnego wpływu na rynek.',
    energyLevel: 'high',
    hookFormula: 'Paradox of Automation / Sudden Productivity Shift (0-3s): wskazanie, jak nowa technologia deklasuje stary proces.',
    sampleHookExample: 'Ten nowy model autonomiczny właśnie zredukował koszty operacyjne o 80 procent w jednej branży.',
    visualPacingStyle: 'Zaawansowane chipy półprzewodnikowe, kod w terminalu, robotyka, interfejsy AI, dynamiczne animacje sieci neuronowych.',
    suggestedPexelsKeywords: [
      'artificial intelligence neural network glowing',
      'matrix digital code computer screen terminal',
      'semiconductor computer microchip macro tech',
      'futuristic robotic arm automation factory'
    ],
    recommendedHashtags: ['#shorts', '#ai', '#sztucznainteligencja', '#technologia', '#automatyzacja', '#przyszlosc'],
    ctaFocus: 'Kieruj do raportów technologicznych i analizy rynku innowacji na raport-finansowy24.pl.',
    forbiddenTropes: [
      'koniec ludzkości za miesiąc',
      'sekretny bot do zarabiania',
      'magiczny prompt'
    ],
    promptRoleDescription: 'Działasz jako technologiczny analityk trendów AI i gospodarki cyfrowej portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Skup się na ekonomicznym i praktycznym wymiarze AI: oszczędność czasu, marże, produktywność.',
      'Pokaż kontrast między starym sposobem pracy a nowym standardem.',
      'Używaj terminologii inżynieryjnej w przystępny sposób (modele, agenty, inference, API).',
      'Zakończ refleksją o tym, kto zyska przewagę rynkową.'
    ]
  },
  {
    id: 'makroekonomia',
    name: 'Makroekonomia & Rynki',
    icon: '🌍',
    aliases: [
      'makroekonomia',
      'ekonomia',
      'gospodarka',
      'geopolityka'
    ],
    targetAudience: 'Menedżerowie, inwestorzy strategiczni, przedsiębiorcy oraz obywatele śledzący decyzje banków centralnych, łańcuchy dostaw i cykle koniunkturalne.',
    editorialTone: 'Strategiczny, perspektywiczny komentator globalnych powiązań (styl Ray Dalio, Financial Times). Pokazywanie niewidocznego efektu domina łączącego globalne decyzje z lokalnym rynkiem.',
    energyLevel: 'measured-urgent',
    hookFormula: 'The Domino Effect (0-3s): pokazanie, jak jedna odległa decyzja makro uderza w łańcuch gospodarczy.',
    sampleHookExample: 'Jedna decyzja banku centralnego właśnie uruchomiła globalny efekt domina na rynku surowców.',
    visualPacingStyle: 'Kontenerowce w portach morskich, sale konferencyjne banków centralnych, sztabki złota w skarbcach, nocne mapy satelitarne.',
    suggestedPexelsKeywords: [
      'cargo container ship sea port logistics',
      'central bank press conference microphone podium',
      'gold bullion bars vault reserve treasury',
      'world globe satellite night lights economy'
    ],
    recommendedHashtags: ['#shorts', '#ekonomia', '#makro', '#gospodarka', '#nbp', '#geopolityka', '#pieniadze'],
    ctaFocus: 'Kieruj do zestawień makroekonomicznych i analiz rynkowych na raport-finansowy24.pl.',
    forbiddenTropes: [
      'świat upadnie w piątek',
      'tajny rząd światowy',
      'upadek wszystkich walut'
    ],
    promptRoleDescription: 'Działasz jako główny analityk makroekonomiczny i strateg geopolityczny portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Pokaż mechanizm przyczynowo-skutkowy: przyczyna A wywołuje skutek B, który zmienia cenę C.',
      'Unikaj panikarstwa, skup się na chłodnej ocenie bilansu ryzyk.',
      'Przywołuj instytucje: NBP, Fed, EBC, MFW, GUS.',
      'Uświadom widzowi, dlaczego ten wskaźnik makro zmieni jego koszty w perspektywie miesięcy.'
    ]
  },
  {
    id: 'psychologia-decyzje',
    name: 'Psychologia & Decyzje',
    icon: '🧠',
    aliases: [
      'psychologia',
      'kognitywistyka i mózg',
      'behawiorystyka',
      'psychologia & behawiorystyka'
    ],
    targetAudience: 'Osoby pragnące opanować emocje w finansach, zrozumieć pułapki myślenia (heurystyki, FOMO, efekt utopionych kosztów) i podejmować racjonalne wybory.',
    editorialTone: 'Wnikliwy, kognitywny mentor behawioralny (styl Daniel Kahneman, Thinking Fast and Slow). Spokojna, lecz elektryzująca diagnoza mechanizmów podświadomości.',
    energyLevel: 'thoughtful',
    hookFormula: 'Cognitive Trap Reveal (0-3s): wskazanie błędu poznawczego, w który mózg widza wpada każdego dnia.',
    sampleHookExample: 'Twój mózg systematycznie oszukuje Cię przy każdej większej transakcji. Oto mechanizm, który to udowadnia.',
    visualPacingStyle: 'Zbliżenia na skupione oczy, animacje synaps mózgowych, tykający stary zegar, fale oceanu, samotny człowiek w nowoczesnej przestrzeni.',
    suggestedPexelsKeywords: [
      'human eye close up iris thinking focus',
      'brain neuron synapse glowing electrical firing',
      'vintage ticking clock time lapse pendulum',
      'ocean waves slow motion cliff calm deep'
    ],
    recommendedHashtags: ['#shorts', '#psychologia', '#umysl', '#decyzje', '#nawyki', '#kognitywistyka'],
    ctaFocus: 'Kieruj do analiz dyscypliny decyzyjnej i narzędzi racjonalnego inwestowania na raport-finansowy24.pl.',
    forbiddenTropes: [
      'zaprogramuj swój mózg na miliony',
      'sekretne prawo przyciągania',
      'magiczna afirmacja'
    ],
    promptRoleDescription: 'Działasz jako ekspert psychologii behawioralnej i kognitywnych procesów decyzyjnych portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Wyjaśnij biologiczny powód zachowania (kora przedczołowa, dopamina, ewolucyjna awersja do straty).',
      'Pokaż, jak emocje niszczą zyski i planowanie długoterminowe.',
      'Używaj pytań retorycznych, które zmuszają widza do zatrzymania i refleksji.',
      'Zaproponuj jedną konkretną mikro-regułę decyzyjną.'
    ]
  },
  {
    id: 'motywacja-stoicyzm',
    name: 'Motywacja & Stoicyzm',
    icon: '🏛️',
    aliases: [
      'motywacja',
      'motywacja & stoicyzm',
      'filozofia strategii',
      'stoicyzm',
      'dyscyplina'
    ],
    targetAudience: 'Osoby szukające twardej dyscypliny, odporności psychicznej w kryzysie, etyki pracy i stoickiego spokoju w obliczu chaosu rynkowego.',
    editorialTone: 'Surowy, bezkompromisowy mentor dyscypliny (styl Marek Aureliusz, Seneca, David Goggins). Zero taniego pocieszenia, absolutny nacisk na odpowiedzialność i chłodną kalkulację.',
    energyLevel: 'authoritative-calm',
    hookFormula: 'The Harsh Truth / Excuse Destroyer (0-3s): natychmiastowe obalenie popularnej wymówki i konfrontacja z rzeczywistością.',
    sampleHookExample: 'Motywacja to złudzenie. Liczy się tylko ta jedna zasada, która odróżnia amatorów od liderów.',
    visualPacingStyle: 'Marmurowe posągi rzymskie, samotny biegacz o świcie w deszczu, surowe szczyty górskie we mgle, ciemna siłownia, wzburzone fale.',
    suggestedPexelsKeywords: [
      'classical marble statue roman greek stoic',
      'man running dawn misty rain discipline solitary',
      'mountain peak clouds stormy dramatic moody',
      'stormy rough sea crashing dark waves strength'
    ],
    recommendedHashtags: ['#shorts', '#motywacja', '#stoicyzm', '#dyscyplina', '#sukces', '#determinacja'],
    ctaFocus: 'Kieruj do przewodników odporności rynkowej i planowania celów na raport-finansowy24.pl.',
    forbiddenTropes: [
      'uśmiechnij się a wszystko będzie dobrze',
      'łatwy sukces bez wysiłku',
      'wszystko dzieje się z jakiegoś powodu'
    ],
    promptRoleDescription: 'Działasz jako stoicki strateg i mentor dyscypliny charakteru portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Pisz twardo, bezpośrednio i z autorytetem.',
      'Zastąp "musisz chcieć" zwrotem "musisz wykonać".',
      'Podkreślaj kontrolę nad własnymi reakcjami w obliczu niesprzyjających okoliczności rynkowych.',
      'Każde zdanie ma brzmieć jak wyryte w kamieniu.'
    ]
  },
  {
    id: 'strategia-biznes',
    name: 'Strategia & Biznes',
    icon: '📈',
    aliases: [
      'strategia',
      'przewaga konkurencyjna',
      'biznes & przedsiębiorczość',
      'biznes',
      'przedsiebiorczosc'
    ],
    targetAudience: 'Przedsiębiorcy, założyciele firm, freelancerzy i menedżerowie poszukujący przewagi konkurencyjnej, dźwigni marżowej i skalowania procesów.',
    editorialTone: 'Doświadczony strateg biznesowy (styl Alex Hormozi, Charlie Munger). Brutalna prawda o marżach, kosztach pozyskania klienta (CAC) i jednostkowej rentowności.',
    energyLevel: 'high',
    hookFormula: 'The Margin Paradox (0-3s): obnażenie błędu, przez który 90% firm walczy o przetrwanie zamiast zarabiać.',
    sampleHookExample: 'Większość firm nie upada przez brak klientów. Upadają przez ten jeden błąd w kalkulacji marży.',
    visualPacingStyle: 'Szklane sale konferencyjne zarządów, podpisywanie kluczowych umów, nowoczesne wieżowce biurowe, szybka praca analityków.',
    suggestedPexelsKeywords: [
      'modern corporate boardroom glass office meeting',
      'business executives signing contract agreement',
      'modern tech office teamwork dynamic workflow',
      'luxury office penthouse city view success'
    ],
    recommendedHashtags: ['#shorts', '#biznes', '#strategia', '#przedsiebiorczosc', '#zarzadzanie', '#marza'],
    ctaFocus: 'Kieruj do analiz modeli biznesowych i kalkulatorów rentowności na raport-finansowy24.pl.',
    forbiddenTropes: [
      'pasywny dochód bez pracy',
      'zostań milionerem z kanapy',
      'tajna metoda na klientów'
    ],
    promptRoleDescription: 'Działasz jako strateg biznesowy i doradca skalowania przedsiębiorstw portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Skup się na mechanizmach dźwigni (oferta, marża, asymetria, procesy).',
      'Obal mit, że więcej pracy fizycznej równa się większy zysk.',
      'Pokaż konkretny błąd w modelu operacyjnym i natychmiastowe rozwiązanie.',
      'Zachowaj maksymalny szacunek dla kapitału i czasu przedsiębiorcy.'
    ]
  },
  {
    id: 'ciekawostki-historia',
    name: 'Ciekawostki & Historia',
    icon: '📜',
    aliases: [
      'ciekawostki',
      'ciekawostki i fakty',
      'historia',
      'historia & tajemnice',
      'kosmos'
    ],
    targetAudience: 'Widzowie poszukujący fascynujących faktów, nieznanych kryzysów gospodarczych, niezwykłych zwrotów akcji w historii i zdumiewających tajemnic świata.',
    editorialTone: 'Magnetyczny narrator dokumentalny (standard: Vox Earworm, Johnny Harris, Kurzgesagt). Budowanie narastającego napięcia i dostarczenie zaskakującej puenty.',
    energyLevel: 'high',
    hookFormula: 'The Unknown Historical Catalyst (0-3s): ujawnienie mało znanego faktu, który zmienił bieg historii.',
    sampleHookExample: 'W 1923 roku ten banknot stracił wartość szybciej, niż zdążono go wydrukować. Oto dlaczego.',
    visualPacingStyle: 'Archiwalne dokumenty, dawne sejfy bankowe, dramatyczne ujęcia miast, teleskopy, stare mapy, zegary kieszonkowe.',
    suggestedPexelsKeywords: [
      'vintage old historical paper documents archives',
      'antique bank vault safe heavy iron door',
      'dramatic ancient architectural ruins cinematic',
      'telescope deep space stars galaxy night sky'
    ],
    recommendedHashtags: ['#shorts', '#ciekawostki', '#historia', '#fakty', '#wiedza', '#tajemnice', '#nauka'],
    ctaFocus: 'Kieruj do archiwum niezwykłych historii gospodarczych i analiz na raport-finansowy24.pl.',
    forbiddenTropes: [
      'naukowcy są w szoku',
      'to ukrywają przed nami',
      'niewiarygodne rzeczy'
    ],
    promptRoleDescription: 'Działasz jako narrator historii gospodarczej i dociekliwy badacz faktów portalu raport-finansowy24.pl.',
    toneGuidelines: [
      'Zacznij od intrygującego punktu zwrotnego w czasie.',
      'Podaj dokładną datę, nazwisko lub kwotę, która uwiarygadnia opowieść.',
      'Zbuduj krótką pętlę ciekawości i rozwiąż ją przed upływem 18 sekund.',
      'Zakończ wnioskiem, który łączy przeszłość z dzisiejszymi finansami.'
    ]
  }
];

/**
 * Resolves a given niche name or alias to the corresponding ViralNicheProfile.
 * Defaults to 'finanse-inwestycje' if not matched.
 */
export function getNicheProfile(nicheInput?: string): ViralNicheProfile {
  if (!nicheInput || typeof nicheInput !== 'string') {
    return VIRAL_NICHE_PROFILES[0];
  }

  const clean = nicheInput.trim().toLowerCase();

  // 1. Direct ID match
  const byId = VIRAL_NICHE_PROFILES.find((p) => p.id === clean);
  if (byId) return byId;

  // 2. Direct name match
  const byName = VIRAL_NICHE_PROFILES.find((p) => p.name.toLowerCase() === clean);
  if (byName) return byName;

  // 3. Match aliases
  const byAlias = VIRAL_NICHE_PROFILES.find((p) =>
    p.aliases.some((alias) => clean === alias || clean.includes(alias) || alias.includes(clean))
  );
  if (byAlias) return byAlias;

  // 4. Keyword fuzzy detection
  if (clean.includes('kredyt') || clean.includes('bank') || clean.includes('portfel') || clean.includes('inflacj') || clean.includes('podat')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'bankowosc-kredyty')!;
  }
  if (clean.includes('krypto') || clean.includes('bitcoin') || clean.includes('btc') || clean.includes('web3')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'krypto-web3')!;
  }
  if (clean.includes('ai') || clean.includes('tech') || clean.includes('sztuczn') || clean.includes('kod') || clean.includes('model')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'ai-tech')!;
  }
  if (clean.includes('makro') || clean.includes('ekonom') || clean.includes('nbp') || clean.includes('fed') || clean.includes('geopol')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'makroekonomia')!;
  }
  if (clean.includes('mózg') || clean.includes('psychol') || clean.includes('decyzj') || clean.includes('behawior')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'psychologia-decyzje')!;
  }
  if (clean.includes('stoic') || clean.includes('motywac') || clean.includes('dyscyplin') || clean.includes('zasad')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'motywacja-stoicyzm')!;
  }
  if (clean.includes('strateg') || clean.includes('biznes') || clean.includes('przedsięb') || clean.includes('marż')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'strategia-biznes')!;
  }
  if (clean.includes('histori') || clean.includes('ciekawost') || clean.includes('tajemn') || clean.includes('kosmos')) {
    return VIRAL_NICHE_PROFILES.find((p) => p.id === 'ciekawostki-historia')!;
  }

  // Default fallback
  return VIRAL_NICHE_PROFILES[0];
}

/**
 * Builds niche-adapted Gemini prompt instructions tailored specifically to the selected audience.
 */
export function buildNichePromptInstructions(
  profile: ViralNicheProfile,
  sceneCount: number = 4,
  sceneDuration: number = 4.5
): string {
  const guidelinesText = profile.toneGuidelines.map((g) => `- ${g}`).join('\n');
  const forbiddenText = profile.forbiddenTropes.map((f) => `"${f}"`).join(', ');
  const samplePexels = profile.suggestedPexelsKeywords.slice(0, 3).map((k) => `"${k}"`).join(', ');

  return `
================================================================================
🌟 AUTOMATYCZNA KALIBRACJA PROMPTU DLA NISZY: "${profile.name.toUpperCase()}" (${profile.icon})
================================================================================
ROLA PROWADZĄCEGO:
${profile.promptRoleDescription}

GRUPA DOCELOWA (TARGET AUDIENCE):
${profile.targetAudience}

TON NARRACJI I ENERGIA (EDITORIAL VOICE):
${profile.editorialTone}
Poziom energii: ${profile.energyLevel.toUpperCase()}

DEDYKOWANA STRATEGIA HOOKA NA PIERWSZE 3 SEKUNDY DLA TEJ NISZY:
Formuła: ${profile.hookFormula}
Wzorcowy przykład otwarcia: "${profile.sampleHookExample}"

SPECYFICZNE WYTYCZNE DLA TEJ NISZY:
${guidelinesText}

ZAKAZANE WYPEŁNIACZE I BANAŁY W TEJ NISZY:
Całkowity zakaz zwrotów: ${forbiddenText}.

STYL WIZUALNY I KADRY PEXELS:
${profile.visualPacingStyle}
Sugerowane przykłady zapytań: ${samplePexels}.

CALL TO ACTION I HASHTAGI DLA GRUPY DOCELOWEJ:
- Rekomendowany cel CTA: ${profile.ctaFocus}
- Domyślne hashtagi publikacyjne: ${profile.recommendedHashtags.join(' ')}
================================================================================`;
}
