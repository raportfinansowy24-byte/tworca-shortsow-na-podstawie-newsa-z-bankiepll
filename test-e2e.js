// test-e2e.js
// Comprehensive End-to-End Test for RaportFinansowy24 Shorts Pipeline

const BASE_URL = 'http://localhost:3000';

async function runStep(name, fn) {
  process.stdout.write(`\n=== [TEST] ${name} ===\n`);
  const start = Date.now();
  try {
    const result = await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[PASS] ${name} (${duration}s)`);
    return { success: true, result, duration };
  } catch (error) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.error(`[FAIL] ${name} (${duration}s):`, error.message);
    return { success: false, error: error.message, duration };
  }
}

async function main() {
  console.log('Rozpoczynam kompleksowy test End-to-End dla RaportFinansowy24 Shorts Pipeline...');
  console.log(`URL bazowy: ${BASE_URL}`);

  const report = [];

  // KROK 1: Test katalogu nisz wiralowych
  const step1 = await runStep('1. Katalog Nisz Wiralowych (/api/viral-niches)', async () => {
    const res = await fetch(`${BASE_URL}/api/viral-niches`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.niches) || data.niches.length < 5) {
      throw new Error('Nieprawidłowa odpowiedź katalogu nisz wiralowych');
    }
    console.log(`  Znaleziono ${data.niches.length} sprofilowanych nisz:`);
    data.niches.slice(0, 4).forEach(n => console.log(`  - [${n.icon}] ${n.name} (Energia: ${n.energyLevel})`));
    return data;
  });
  report.push({ name: 'Katalog Nisz Wiralowych', ...step1 });

  // KROK 2: Pobranie aktualnych newsów z Bankier.pl
  let bankierArticle = null;
  const step2 = await runStep('2. Pobieranie newsów z Bankier.pl (/api/news/bankier)', async () => {
    const res = await fetch(`${BASE_URL}/api/news/bankier`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const articles = data.articles || (Array.isArray(data) ? data : []);
    if (!articles || articles.length === 0) {
      throw new Error('Brak artykułów zwróconych z Bankier.pl');
    }
    bankierArticle = articles[0];
    console.log(`  Pobrano ${articles.length} newsów z Bankier.pl.`);
    console.log(`  Wybrany artykuł do testu E2E: "${bankierArticle.title}"`);
    console.log(`  Kategoria: "${bankierArticle.category || 'brak'}"`);
    return bankierArticle;
  });
  report.push({ name: 'Pobieranie newsów Bankier.pl', ...step2 });

  if (!bankierArticle) {
    bankierArticle = {
      title: 'Stopy procentowe NBP bez zmian. Co to oznacza dla kredytobiorców?',
      description: 'Rada Polityki Pieniężnej podjęła decyzję w sprawie stóp procentowych. Raty kredytów pozostaną na dotychczasowym poziomie.',
      category: 'Finanse & Inwestycje'
    };
  }

  // KROK 3: Analiza semantyczna newsa i dobór słów kluczowych Pexels
  const step3 = await runStep('3. Analiza scen i słów kluczowych Pexels (/api/news/analyze-scene-keywords)', async () => {
    const res = await fetch(`${BASE_URL}/api/news/analyze-scene-keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article: bankierArticle,
        sceneCount: 4,
        niche: 'Finanse & Inwestycje'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const keywords = data.sceneKeywords || (data.segments ? data.segments.map(s => s.primaryKeyword) : []);
    if (!keywords || keywords.length === 0) {
      throw new Error('Brak poprawnych słów kluczowych scen w odpowiedzi');
    }
    console.log(`  Wygenerowano ${keywords.length} słów kluczowych scen:`, keywords.join(', '));
    return data;
  });
  report.push({ name: 'Analiza słów kluczowych Pexels', ...step3 });

  // KROK 4: Generowanie wiralowego skryptu z dopasowaniem promptu do niszy
  let generatedScript = null;
  const step4 = await runStep('4. Generowanie skryptu 4 scen x 4.5s ze spersonalizowanym promptem (/api/generate-viral-script)', async () => {
    const res = await fetch(`${BASE_URL}/api/generate-viral-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: bankierArticle.title,
        niche: 'Finanse & Inwestycje',
        sceneCount: 4,
        bankierArticle: bankierArticle,
        articleContext: bankierArticle.description
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.scenes || data.scenes.length !== 4) {
      throw new Error(`Oczekiwano 4 scen, otrzymano ${data.scenes ? data.scenes.length : 0}`);
    }
    generatedScript = data;
    const totalDuration = data.scenes.reduce((acc, sc) => acc + (sc.duration || 0), 0);
    console.log(`  Tytuł (techniczny): "${data.title}"`);
    console.log(`  Hook: "${data.hook}"`);
    console.log(`  Łączny czas trwania: ${totalDuration}s (oczekiwane 18s)`);
    console.log(`  Decyzje SI: Głos: ${data.aiDecisions?.optimalVoice}, Tempo: ${data.aiDecisions?.voiceSpeed}x`);
    data.scenes.forEach((sc, i) => {
      console.log(`  - Scena ${i + 1} (${sc.duration}s): [Pexels: "${sc.searchKeyword}"]`);
      console.log(`    Lektor: "${sc.voiceover_text}"`);
    });
    return data;
  });
  report.push({ name: 'Generowanie skryptu AI', ...step4 });

  // KROK 5: Test statusu harmonogramu Auto-Pilota
  const step5 = await runStep('5. Status i konfiguracja harmonogramu Auto-Pilota (/api/autopilot/scheduler/status)', async () => {
    const res = await fetch(`${BASE_URL}/api/autopilot/scheduler/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const st = data.state || data;
    console.log(`  Auto-Pilot włączony: ${st.enabled}`);
    console.log(`  Liczba slotów dziennych: ${st.dailySlots?.length} (${st.dailySlots?.join(', ')})`);
    console.log(`  Domyślna liczba scen: ${st.sceneCount}`);
    console.log(`  Domyślna nisza: ${st.niche}`);
    return st;
  });
  report.push({ name: 'Status harmonogramu Auto-Pilota', ...step5 });

  // KROK 6: Test pobierania klipów wideo z Pexels dla wygenerowanych scen
  const step6 = await runStep('6. Wyszukiwanie klipów wideo stock Pexels (/api/stock/fetch-scene-footage)', async () => {
    const keyword = generatedScript?.scenes?.[0]?.searchKeyword || 'finance investment graph';
    const res = await fetch(`${BASE_URL}/api/stock/fetch-scene-footage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: keyword,
        duration: 4.5,
        orientation: 'portrait'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    console.log(`  Zapytanie: "${keyword}"`);
    console.log(`  Pobrany URL wideo: ${data.videoUrl ? 'Zwrócono wideo (' + data.source + ')' : 'Brak URL'}`);
    return data;
  });
  report.push({ name: 'Wyszukiwanie klipów Pexels', ...step6 });

  // KROK 7: Test generowania próbki audio TTS (Edge Neural)
  const step7 = await runStep('7. Próbka lektora Edge Neural TTS (/api/tts/preview)', async () => {
    const sampleText = generatedScript?.scenes?.[0]?.voiceover_text || 'Uwaga, stopy procentowe bez zmian.';
    const res = await fetch(`${BASE_URL}/api/tts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: sampleText,
        voice: generatedScript?.aiDecisions?.optimalVoice || 'pl-PL-MarekNeural',
        speed: generatedScript?.aiDecisions?.voiceSpeed || 1.15
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.audioUrl) throw new Error('Brak audioUrl w odpowiedzi TTS');
    console.log(`  Wygenerowano plik audio TTS: ${data.audioUrl}`);
    return data;
  });
  report.push({ name: 'Próbka TTS lektora', ...step7 });

  // Podsumowanie raportu
  console.log('\n======================================================');
  console.log('PODSUMOWANIE TESTU END-TO-END');
  console.log('======================================================');
  const allPassed = report.every(r => r.success);
  report.forEach(r => {
    const status = r.success ? '✓ PASS' : '✗ FAIL';
    console.log(`${status.padEnd(8)} | ${r.name.padEnd(40)} | ${r.duration}s`);
  });
  console.log('======================================================');
  console.log(`WYNIK OGÓLNY: ${allPassed ? 'SUKCES (Wszystkie testy zakończone pomyślnie)' : 'NIEPOWODZENIE'}`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Błąd krytyczny w test-e2e.js:', err);
  process.exit(1);
});
