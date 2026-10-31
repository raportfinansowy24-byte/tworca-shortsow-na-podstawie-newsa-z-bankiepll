import fs from 'node:fs';
import path from 'node:path';
import { motionSoundSpecForBeat, type MotionSoundSpec } from './motionSoundRenderer';

export interface CreativeDirectorArticle {
  title: string;
  description?: string;
  summary?: string;
  link?: string;
  category?: string;
  keyTakeaway?: string;
  suggestedHook?: string;
}

export interface CreativeDirectorScene {
  start: number;
  end: number;
  purpose: string;
  voiceover: string;
  caption: string;
  visualQuery: string;
  visualMood: string;
  camera: string;
}

export interface CreativeDirectorPlan {
  title: string;
  hook: string;
  body: string;
  cta: string;
  ctaDestination?: string;
  ctaUrl?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  hashtags: string[];
  voice: string;
  voiceSpeed: number;
  platform: string;
  duration: number;
  directorBrief: string;
  scenes: CreativeDirectorScene[];
  riskFlags: string[];
  brandFilesUsed: string[];
  modelUsed?: string;
  generatedAt: string;
}

export interface CreativeDirectorRenderScene {
  duration: number;
  voiceover_text: string;
  subtitles: string;
  visualQuery: string;
  camera: string;
  visualMood: string;
  directorPurpose: string;
  motionSound: MotionSoundSpec;
}

const BRAND_FILES = ['brand-identity.md', 'ICP.md', 'messaging.md'] as const;

export function loadBrandContext(rootDir = process.cwd()): { context: string; filesUsed: string[] } {
  const locations = [rootDir, path.join(rootDir, 'brand')];
  const chunks: string[] = [];
  const filesUsed: string[] = [];

  for (const file of BRAND_FILES) {
    const location = locations.map((dir) => path.join(dir, file)).find((candidate) => fs.existsSync(candidate));
    if (!location) continue;
    const content = fs.readFileSync(location, 'utf8').trim();
    if (content) {
      chunks.push(`### ${file}\n${content.slice(0, 12000)}`);
      filesUsed.push(file);
    }
  }

  return {
    context: chunks.join('\n\n') || 'Brak plików marki. Użyj profesjonalnego, rzeczowego tonu polskiego medium finansowego.',
    filesUsed
  };
}

export function buildCreativeDirectorPrompt(params: {
  article: CreativeDirectorArticle;
  brandContext: string;
  ctaText?: string;
  platform?: string;
  duration?: number;
  sceneCount?: number;
  language?: string;
}): string {
  const { article, brandContext, ctaText, platform = 'youtube-shorts', duration = 18, sceneCount = 8, language = 'Polski' } = params;
  return `Jesteś Creative Directorem marki RaportFinansowy24. Przygotuj plan pionowego Shorta na podstawie wyłącznie faktów z przekazanego newsa.

ZASADY RZETELNOŚCI:
- Nie dopisuj liczb, dat, decyzji ani twierdzeń, których nie ma w źródle.
- Jeśli fakt wymaga potwierdzenia, dodaj go do riskFlags.
- Hook ma być mocny, ale nie może sugerować spisku ani wprowadzać w błąd.
- Odpowiedź zwróć wyłącznie jako poprawny JSON zgodny z wymaganym kształtem.

KONTEKST MARKI:
${brandContext}

NEWS:
Tytuł: ${article.title}
Opis: ${article.description || article.summary || ''}
Kategoria: ${article.category || 'Finanse'}
Kluczowy wniosek: ${article.keyTakeaway || ''}
Sugerowany hook: ${article.suggestedHook || ''}
Źródło: ${article.link || ''}
CTA wymagane przez politykę redakcyjną: ${ctaText || 'Sprawdź pełny kontekst.'}

PARAMETRY:
Platforma: ${platform}
Język: ${language}
Długość: ${duration} sekund
Liczba beatów/scen: ${sceneCount}

WYMAGANY JSON:
{
  "title": "krótki tytuł",
  "hook": "jedno zdanie zatrzymujące uwagę",
  "body": "3-5 zdań narracji",
  "cta": "użyj dokładnie wymaganego krótkiego CTA do wypowiedzenia",
  "hashtags": ["#shorts"],
  "voice": "pl-PL-MarekNeural",
  "voiceSpeed": 1.05,
  "directorBrief": "techniczny brief: scena, światło, obiektyw, ruch kamery, grading i dźwięk",
  "scenes": [
    {
      "start": 0,
      "end": 2.25,
      "purpose": "hook",
      "voiceover": "tekst lektora tej sceny",
      "caption": "NAPIS NA EKRANIE",
      "visualQuery": "English dynamic stock-video query for Pexels",
      "visualMood": "technical visual mood",
      "camera": "specific camera movement and lens"
    }
  ],
  "riskFlags": ["opcjonalne ostrzeżenia redakcyjne"]
}

Sceny powinny tworzyć logiczną sekwencję: hook, fakt, znaczenie dla odbiorcy, kontekst, konsekwencja, praktyczny wniosek, CTA. Używaj technicznych określeń wizualnych zamiast ogólnych przymiotników.`;
}

function cleanJsonText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced?.[1] || text).trim();
}

export function parseCreativeDirectorPlan(text: string, params: { platform?: string; duration?: number; filesUsed?: string[]; modelUsed?: string; article?: CreativeDirectorArticle; ctaText?: string; ctaDestination?: string; ctaUrl?: string }): CreativeDirectorPlan {
  const parsed = JSON.parse(cleanJsonText(text)) as Partial<CreativeDirectorPlan>;
  if (!parsed.title || !parsed.hook || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error('Creative Director zwrócił niepełny plan.');
  }
  const duration = params.duration || 18;
  return {
    title: String(parsed.title).slice(0, 240),
    hook: String(parsed.hook).slice(0, 600),
    body: String(parsed.body || '').slice(0, 3000),
    cta: String(params.ctaText || parsed.cta || 'Sprawdź pełny kontekst.').slice(0, 500),
    ctaDestination: params.ctaDestination,
    ctaUrl: params.ctaUrl,
    sourceTitle: params.article?.title,
    sourceUrl: params.article?.link,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 8) : ['#shorts', '#finanse'],
    voice: String(parsed.voice || 'pl-PL-MarekNeural'),
    voiceSpeed: Math.max(0.7, Math.min(Number(parsed.voiceSpeed) || 1.05, 1.2)),
    platform: params.platform || 'youtube-shorts',
    duration,
    directorBrief: String(parsed.directorBrief || '').slice(0, 5000),
    scenes: parsed.scenes.slice(0, 8).map((scene: any, index) => ({
      start: Number.isFinite(Number(scene.start)) ? Number(scene.start) : index * (duration / 8),
      end: Number.isFinite(Number(scene.end)) ? Number(scene.end) : (index + 1) * (duration / 8),
      purpose: String(scene.purpose || `beat-${index + 1}`),
      voiceover: String(scene.voiceover || scene.voiceover_text || '').slice(0, 700),
      caption: String(scene.caption || '').slice(0, 180),
      visualQuery: String(scene.visualQuery || 'dynamic financial market data').slice(0, 220),
      visualMood: String(scene.visualMood || 'high-contrast editorial finance').slice(0, 220),
      camera: String(scene.camera || 'steady medium push-in, 35mm lens').slice(0, 220)
    })),
    riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.map(String).slice(0, 10) : [],
    brandFilesUsed: params.filesUsed || [],
    modelUsed: params.modelUsed,
    generatedAt: new Date().toISOString()
  };
}

export function buildCreativeDirectorFallback(article: CreativeDirectorArticle, params: { platform?: string; duration?: number; filesUsed?: string[]; ctaText?: string; ctaDestination?: string; ctaUrl?: string }): CreativeDirectorPlan {
  const title = article.title.trim().slice(0, 180);
  const summary = (article.keyTakeaway || article.description || article.summary || 'Najważniejsze fakty z rynku.').trim();
  const hook = article.suggestedHook || `Co najnowsza wiadomość oznacza dla Twoich pieniędzy?`;
  const cta = params.ctaText || 'Sprawdź pełny kontekst.';
  const sceneCount = 8;
  const segmentDuration = (params.duration || 18) / sceneCount;
  const queries = ['financial market chart dynamic', 'central bank building aerial', 'counting Polish zloty banknotes', 'business people city timelapse', 'close up market data screen', 'consumer checking household budget', 'financial analysis desk macro', 'financial news editorial background'];
  const purposes = ['hook', 'fakt', 'kontekst', 'mechanizm', 'wpływ', 'praktyczny wniosek', 'podsumowanie', 'cta'];
  const scenes = Array.from({ length: sceneCount }, (_, index) => ({
    start: Number((index * segmentDuration).toFixed(2)),
    end: Number(((index + 1) * segmentDuration).toFixed(2)),
    purpose: purposes[index],
    voiceover: index === 0 ? hook : index === 7 ? cta : (index === 1 ? summary : `Zobacz, jak ten temat może przełożyć się na codzienne decyzje finansowe.`),
    caption: index === 0 ? hook.toUpperCase() : index === 7 ? cta.toUpperCase() : title.toUpperCase().slice(0, 80),
    visualQuery: queries[index],
    visualMood: 'high-contrast editorial finance, navy and lime accents',
    camera: index === 0 ? 'fast push-in, 24mm lens' : 'smooth lateral tracking, 35mm lens'
  }));
  return {
    title,
    hook,
    body: `${summary} Ten materiał porządkuje najważniejsze informacje i ich praktyczne znaczenie.`,
    cta,
    ctaDestination: params.ctaDestination,
    ctaUrl: params.ctaUrl,
    sourceTitle: article.title,
    sourceUrl: article.link,
    hashtags: ['#shorts', '#finanse', '#wiadomości', '#RaportFinansowy24'],
    voice: 'pl-PL-MarekNeural',
    voiceSpeed: 1.05,
    platform: params.platform || 'youtube-shorts',
    duration: params.duration || 18,
    directorBrief: 'Pionowy format 9:16, kontrastowy grading granat/lime, szybki hook w pierwszych 2 sekundach, dynamiczne lecz czytelne przejścia, ambientowy beat newsroomowy i subtelne dźwięki interfejsu.',
    scenes,
    riskFlags: ['Plan utworzony przez fallback; przed publikacją zweryfikuj liczby, daty i nazwy własne w źródle.'],
    brandFilesUsed: params.filesUsed || [],
    modelUsed: 'heuristic-fallback',
    generatedAt: new Date().toISOString()
  };
}

/** Convert a validated eight-beat storyboard into timed scenes accepted by the current renderer. */
export function mapCreativeDirectorPlanToRenderScenes(
  plan: CreativeDirectorPlan,
  ctaText = plan.cta,
  ctaCaption = plan.cta
): CreativeDirectorRenderScene[] {
  if (!plan || !Array.isArray(plan.scenes) || plan.scenes.length !== 8) {
    throw new Error('Storyboard do renderu musi zawierać dokładnie 8 scen.');
  }
  const targetDuration = Number(plan.duration) || 18;
  if (Math.abs(targetDuration - 18) > 0.01) {
    throw new Error('Storyboard do renderu musi trwać 18 sekund.');
  }

  let previousEnd = 0;
  const sourceDurations = plan.scenes.map((scene, index) => {
    const start = Number(scene.start);
    const end = Number(scene.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < -0.1 || end <= start || end > 18.1) {
      throw new Error(`Storyboard zawiera nieprawidłowy zakres czasu w scenie ${index + 1}.`);
    }
    if (start < previousEnd - 0.1) {
      throw new Error(`Storyboard ma nakładające się sceny przy scenie ${index + 1}.`);
    }
    previousEnd = end;
    const seconds = end - start;
    if (seconds < 0.5) throw new Error(`Scena ${index + 1} jest zbyt krótka do renderu.`);
    return seconds;
  });

  const sourceTotal = sourceDurations.reduce((sum, seconds) => sum + seconds, 0);
  if (Math.abs(previousEnd - 18) > 0.5 || sourceTotal < 14 || sourceTotal > 20) {
    throw new Error('Zakresy scen storyboardu muszą obejmować około 18 sekund. Wygeneruj storyboard ponownie.');
  }
  const scale = 18 / sourceTotal;
  const normalizedDurations = sourceDurations.map((seconds) => Number((seconds * scale).toFixed(3)));
  normalizedDurations[normalizedDurations.length - 1] = Number((18 - normalizedDurations.slice(0, -1).reduce((sum, seconds) => sum + seconds, 0)).toFixed(3));

  return plan.scenes.map((scene, index) => {
    const isFirst = index === 0;
    const isLast = index === plan.scenes.length - 1;
    const voiceover = String(isFirst ? (scene.voiceover || plan.hook) : isLast ? ctaText : (scene.voiceover || scene.caption)).trim();
    if (!voiceover) throw new Error(`Storyboard nie zawiera tekstu lektora dla sceny ${index + 1}.`);
    const caption = isLast ? ctaCaption : String(scene.caption || voiceover).trim();
    const visualQuery = String(scene.visualQuery || '').trim();
    if (!visualQuery) throw new Error(`Storyboard nie zawiera zapytania wizualnego dla sceny ${index + 1}.`);
    const purpose = String(scene.purpose || '').toLocaleLowerCase('pl-PL');
    const beat = isFirst ? 'hook' : isLast ? 'cta'
      : /contrast|kontrast/.test(purpose) ? 'contrast'
        : /leader|lider|wzrost/.test(purpose) ? 'leader'
          : /loser|spad|problem/.test(purpose) ? 'loser'
            : /takeaway|wniosek|practical|prakty/.test(purpose) ? 'takeaway'
              : /meaning|znaczen|wpływ|wplyw/.test(purpose) ? 'meaning'
                : index === 1 ? 'market_snapshot' : 'meaning';
    return {
      duration: normalizedDurations[index],
      voiceover_text: voiceover,
      subtitles: caption,
      visualQuery,
      camera: String(scene.camera || '').trim(),
      visualMood: String(scene.visualMood || '').trim(),
      directorPurpose: String(scene.purpose || `beat-${index + 1}`).trim(),
      motionSound: motionSoundSpecForBeat(beat)
    };
  });
}
