package com.example.bankiershorts.data.repository

import com.example.bankiershorts.data.models.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class BankierShortsRepository {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())

    private val defaultScenes = listOf(
        Scene(
            id = "scene-1",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            duration = 4.5,
            subtitles = "PILNA DECYZJA RPP DOTYCZĄCA STÓP!",
            voiceoverText = "Rada Polityki Pieniężnej ogłosiła najnowszą decyzję o stopach procentowych w Polsce.",
            captionStyle = CaptionStyle(fontSize = 68, highlightColor = "red", animation = "single-word"),
            searchKeyword = "warsaw financial district stock market"
        ),
        Scene(
            id = "scene-2",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            duration = 4.5,
            subtitles = "CO TO OZNACZA DLA TWOICH RAT?",
            voiceoverText = "Dla tysięcy kredytobiorców oznacza to zmianę comiesięcznych obciążeń domowego budżetu.",
            captionStyle = CaptionStyle(fontSize = 64, highlightColor = "yellow", animation = "word-by-word"),
            searchKeyword = "mortgage calculator family stress money"
        ),
        Scene(
            id = "scene-3",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            duration = 4.5,
            subtitles = "ZYSKAJĄ OSZCZĘDZAJĄCY NA LOKATACH",
            voiceoverText = "Jednocześnie banki zapowiadają aktualizację oprocentowania kont oszczędnościowych i obligacji.",
            captionStyle = CaptionStyle(fontSize = 64, highlightColor = "lime", animation = "karaoke"),
            searchKeyword = "piggy bank savings coins investment"
        ),
        Scene(
            id = "scene-4",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyflights.mp4",
            duration = 4.5,
            subtitles = "SPRAWDŹ AKTUALNY RANKING W OPISIE",
            voiceoverText = "Zobacz w linku w profilu, które lokaty dają teraz ponad siedem procent rocznie bez ryzyka.",
            captionStyle = CaptionStyle(fontSize = 70, highlightColor = "cyan", animation = "classic"),
            searchKeyword = "smartphone mobile banking app success"
        )
    )

    private val sampleArticles = listOf(
        BankierArticle(
            id = "art-1",
            title = "RPP podjęła decyzję w sprawie stóp procentowych. Jest oficjalny komunikat",
            link = "https://www.bankier.pl/wiadomosc/Stopy-procentowe-RPP-listopad-2026",
            description = "Rada Polityki Pieniężnej zakończyła dwudniowe posiedzenie decyzyjne. Sprawdź jak zareagował złoty i kursy walut.",
            pubDate = "Dzisiaj, 14:30",
            category = "Wiadomości",
            keyTakeaway = "Stopy utrzymane na stabilnym poziomie, presja na marże kredytowe.",
            suggestedKeywords = listOf("RPP", "stopy procentowe", "złoty", "inflacja"),
            suggestedHook = "Jeśli masz kredyt w złotówkach, ten komunikat NBP decyduje o twojej racie!"
        ),
        BankierArticle(
            id = "art-2",
            title = "GPW: WIG20 bije kolejne rekordy! Banki i spółki energetyczne na fali",
            link = "https://www.bankier.pl/wiadomosc/GPW-WIG20-rekord-sesja-2026",
            description = "Inwestorzy z zagranicy masowo kupują polskie akcje. Indeks blue chipów przebił kolejny psychologiczny opór.",
            pubDate = "Dzisiaj, 12:15",
            category = "Giełda",
            keyTakeaway = "Najwyższy wolumen obrotów na warszawskim parkiecie od dwóch lat.",
            suggestedKeywords = listOf("GPW", "WIG20", "akcje", "inwestowanie"),
            suggestedHook = "Polska giełda w ścisłej światowej czołówce zysków – dlaczego zagranica kupuje polskie akcje?"
        ),
        BankierArticle(
            id = "art-3",
            title = "Kurs euro i dolara ostro w dół. Polacy masowo wymieniają waluty na wakacje",
            link = "https://www.bankier.pl/wiadomosc/Kursy-walut-euro-dolar-spadek-2026",
            description = "Złoty umacnia się względem głównych walut rezerwowych. Notowania dolara najniżej od 18 miesięcy.",
            pubDate = "Dzisiaj, 10:00",
            category = "Waluty",
            keyTakeaway = "Tani dolar sprzyja spadkom cen paliw i elektroniki w Polsce.",
            suggestedKeywords = listOf("kurs euro", "kurs dolara", "kantor", "NBP"),
            suggestedHook = "Dolar i euro tanieją najszybciej od roku – czy warto kupić walutę już teraz?"
        ),
        BankierArticle(
            id = "art-4",
            title = "Nowe obligacje skarbowe z premią antyinflacyjną. Ministerstwo Finansów kusi zyskiem",
            link = "https://www.bankier.pl/wiadomosc/Obligacje-skarbowe-oferta-listopad-2026",
            description = "Resort finansów podnosi gwarantowane marże w pierwszym roku oszczędzania dla klientów detalicznych.",
            pubDate = "Wczoraj, 18:45",
            category = "Wiadomości",
            keyTakeaway = "Bezpieczna alternatywa dla nisko oprocentowanych lokat bankowych.",
            suggestedKeywords = listOf("obligacje skarbowe", "oszczędności", "inflacja"),
            suggestedHook = "Nie trzymaj gotówki na zerowym koncie – Skarb Państwa podnosi zysk!"
        )
    )

    private val trendKeywords = listOf(
        BankierTrendKeyword("Stopy procentowe NBP", 42, 28.5, "Wiadomości", "alert", "Wpływ decyzji na raty kredytów w Polsce", "Konta oszczędnościowe i refinansowanie"),
        BankierTrendKeyword("Inflacja w Polsce", 38, 24.2, "Wiadomości", "alert", "Ochrona siły nabywczej oszczędności", "Obligacje skarbowe indeksowane inflacją"),
        BankierTrendKeyword("GPW WIG20 Rekord", 29, 18.0, "Giełda", "positive", "Napływ kapitału zagranicznego na GPW", "Rachunki maklerskie i IKE/IKZE"),
        BankierTrendKeyword("Kurs dolara i euro", 24, 15.3, "Waluty", "positive", "Najlepszy moment na zakupy walut", "Konta walutowe i karty wielowalutowe"),
        BankierTrendKeyword("Ceny mieszkań i kredyt", 21, 14.0, "Wiadomości", "neutral", "Sytuacja młodych na rynku nieruchomości", "Kredyty hipoteczne z dopłatą")
    )

    private val _scenes = MutableStateFlow(defaultScenes)
    val scenes = _scenes.asStateFlow()

    private val _articles = MutableStateFlow(sampleArticles)
    val articles = _articles.asStateFlow()

    private val _trends = MutableStateFlow(trendKeywords)
    val trends = _trends.asStateFlow()

    private val _autopilotState = MutableStateFlow(
        AutopilotSchedulerState(
            enabled = true,
            candidateArticle = sampleArticles[0],
            candidateViralityScore = ViralityScore(
                totalScore = 87,
                rating = "VIRAL_EXPLOSION",
                sentimentLabel = "Pilny alert finansowy",
                matchedKeyword = "Stopy procentowe NBP",
                targetAudience = "Kredytobiorcy i oszczędzający",
                projectedCpaEur = 48.0,
                rationale = "Decyzje RPP generują natychmiastowe wyszukiwania i dyskusje w mediach społecznościowych. Gwarantowany wysoki CTR."
            ),
            history = listOf(
                AutopilotRunRecord(
                    id = "run-1",
                    timestamp = "2026-11-09 11:00:15",
                    slot = "11:00",
                    articleTitle = "RPP podjęła decyzję w sprawie stóp procentowych. Jest oficjalny komunikat",
                    articleLink = "https://www.bankier.pl/wiadomosc/Stopy-procentowe-RPP-listopad-2026",
                    jobId = "job_1788811431515_sjsxy4",
                    status = "completed",
                    videoUrl = "/exports/combined_video_job_1788811431515_sjsxy4.mp4",
                    duration = 18.0,
                    projectedEur = 72.50
                ),
                AutopilotRunRecord(
                    id = "run-2",
                    timestamp = "2026-11-09 06:00:08",
                    slot = "06:00",
                    articleTitle = "Kurs euro i dolara ostro w dół. Polacy masowo wymieniają waluty",
                    articleLink = "https://www.bankier.pl/wiadomosc/Kursy-walut-euro-dolar-spadek-2026",
                    jobId = "job_1788811380482_23q1m5",
                    status = "completed",
                    videoUrl = "/exports/combined_video_job_1788811380482_23q1m5.mp4",
                    duration = 18.0,
                    projectedEur = 58.00
                )
            )
        )
    )
    val autopilotState = _autopilotState.asStateFlow()

    private val _jobs = MutableStateFlow<List<JobStatus>>(
        listOf(
            JobStatus(
                id = "job_1788811431515_sjsxy4",
                status = "completed",
                progress = 100,
                step = "Wideo wyrenderowane pomyślnie",
                duration = 18.0,
                outputUrl = "/exports/combined_video_job_1788811431515_sjsxy4.mp4",
                title = "RPP Decyzja Stopy Procentowe Short",
                createdAt = "11:02:14"
            ),
            JobStatus(
                id = "job_1788811380482_23q1m5",
                status = "completed",
                progress = 100,
                step = "Eksport zakończony",
                duration = 18.0,
                outputUrl = "/exports/combined_video_job_1788811380482_23q1m5.mp4",
                title = "Kursy Walut Euro Dolar Poranny Short",
                createdAt = "06:03:02"
            )
        )
    )
    val jobs = _jobs.asStateFlow()

    private val _profitState = MutableStateFlow(
        ProfitMonitorState(
            targetGoalEur = 10000.0,
            totalProjectedEur = 3560.00,
            progressPercent = 35.6,
            remainingEur = 6440.00,
            totalCompletedVideos = 19,
            dailyProjectedEur = 285.0,
            avgEurPerVideo = 187.36,
            videosNeededToGoal = 34,
            logs = listOf(
                VideoProfitLog(
                    id = "plog-1",
                    timestamp = "Dzisiaj, 11:05",
                    videoTitle = "RPP Decyzja Stopy Procentowe Short",
                    slot = "11:00",
                    jobId = "job_1788811431515_sjsxy4",
                    status = "completed",
                    estViews = 38400,
                    estClicksToBio = 576,
                    estApplications = 8,
                    avgCpaEur = 45.0,
                    projectedEur = 360.0,
                    productCategory = "Kredyt hipoteczny / Refinansowanie"
                ),
                VideoProfitLog(
                    id = "plog-2",
                    timestamp = "Dzisiaj, 06:10",
                    videoTitle = "Kursy Walut Euro Dolar Poranny Short",
                    slot = "06:00",
                    jobId = "job_1788811380482_23q1m5",
                    status = "completed",
                    estViews = 24600,
                    estClicksToBio = 369,
                    estApplications = 5,
                    avgCpaEur = 35.0,
                    projectedEur = 175.0,
                    productCategory = "Konto wielowalutowe"
                )
            )
        )
    )
    val profitState = _profitState.asStateFlow()

    private val _webhookLogs = MutableStateFlow<List<WebhookLog>>(
        listOf(
            WebhookLog(
                id = "wh-1",
                timestamp = "11:00:01",
                event = "make.trigger_run",
                method = "POST",
                status = 200,
                payloadPreview = "{\"trigger\": \"autopilot_slot\", \"slot\": \"11:00\", \"scenes\": 4}"
            ),
            WebhookLog(
                id = "wh-2",
                timestamp = "11:03:15",
                event = "render.completed",
                method = "POST",
                status = 200,
                payloadPreview = "{\"jobId\": \"job_1788811431515_sjsxy4\", \"status\": \"completed\", \"duration\": 18.0}"
            )
        )
    )
    val webhookLogs = _webhookLogs.asStateFlow()

    fun toggleAutopilot() {
        _autopilotState.update { current ->
            current.copy(enabled = !current.enabled)
        }
    }

    suspend fun runAutopilotOnce(): String {
        val newJobId = "job_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(6)
        val candidate = _autopilotState.value.candidateArticle ?: sampleArticles[0]
        
        val newJob = JobStatus(
            id = newJobId,
            status = "processing",
            progress = 5,
            step = "Pobieranie materiałów wideo z Pexels dla newsu...",
            title = candidate.title.take(35) + "...",
            createdAt = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        )
        
        _jobs.update { listOf(newJob) + it }
        
        _autopilotState.update { current ->
            current.copy(
                lastRunStatus = "running",
                lastRunJobId = newJobId,
                lastRunTime = dateFormat.format(Date()),
                runsCount = current.runsCount + 1
            )
        }

        // Simulate multi-stage video render pipeline
        simulatePipeline(newJobId, candidate.title)
        return newJobId
    }

    fun selectArticleForShort(article: BankierArticle) {
        // Build 4 viral scenes based on the selected Bankier.pl article
        val newScenes = listOf(
            Scene(
                id = "scene-1",
                videoUrl = defaultScenes[0].videoUrl,
                duration = 4.5,
                subtitles = article.suggestedHook?.take(40)?.uppercase() ?: article.title.take(40).uppercase(),
                voiceoverText = article.title + ".",
                captionStyle = CaptionStyle(fontSize = 66, highlightColor = "red", animation = "single-word"),
                searchKeyword = article.suggestedKeywords.firstOrNull() ?: "warsaw stock exchange finance"
            ),
            Scene(
                id = "scene-2",
                videoUrl = defaultScenes[1].videoUrl,
                duration = 4.5,
                subtitles = "KLUCZOWE FAKTY DLA CIEBIE",
                voiceoverText = article.description,
                captionStyle = CaptionStyle(fontSize = 62, highlightColor = "yellow", animation = "word-by-word"),
                searchKeyword = "poland economy data chart"
            ),
            Scene(
                id = "scene-3",
                videoUrl = defaultScenes[2].videoUrl,
                duration = 4.5,
                subtitles = article.keyTakeaway?.take(36)?.uppercase() ?: "JAK TO WPŁYNIE NA RYNEK?",
                voiceoverText = (article.keyTakeaway ?: "Eksperci przewidują dynamiczne zmiany w kolejnych tygodniach.") + ".",
                captionStyle = CaptionStyle(fontSize = 64, highlightColor = "lime", animation = "karaoke"),
                searchKeyword = "investment money growth profit"
            ),
            Scene(
                id = "scene-4",
                videoUrl = defaultScenes[3].videoUrl,
                duration = 4.5,
                subtitles = "ZOBACZ ANALIZĘ W PROFILU",
                voiceoverText = "Obserwuj profil i sprawdź szczegółowy raport oraz porównanie w linku w opisie.",
                captionStyle = CaptionStyle(fontSize = 68, highlightColor = "cyan", animation = "classic"),
                searchKeyword = "success business smartphone call to action"
            )
        )
        _scenes.value = newScenes
        _autopilotState.update { it.copy(candidateArticle = article) }
    }

    fun updateScene(scene: Scene) {
        _scenes.update { list ->
            list.map { if (it.id == scene.id) scene else it }
        }
    }

    suspend fun startManualRender(): String {
        val newJobId = "job_make_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(5)
        val firstSubtitle = _scenes.value.firstOrNull()?.subtitles ?: "Bankier Short Video"
        
        val newJob = JobStatus(
            id = newJobId,
            status = "processing",
            progress = 5,
            step = "Inicjalizacja 4-scenowego renderera wideo (18.0s)...",
            title = firstSubtitle.take(35),
            createdAt = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        )
        _jobs.update { listOf(newJob) + it }
        simulatePipeline(newJobId, firstSubtitle)
        return newJobId
    }

    private suspend fun simulatePipeline(jobId: String, title: String) {
        val steps = listOf(
            15 to "Pobieranie tła wideo HD z Pexels dla scen 1-4...",
            35 to "Synteza mowy TTS (Polski Lektor Neuralny pl-PL)...",
            60 to "Generowanie animowanych napisów ASS (word-by-word)...",
            85 to "Montaż i miksowanie audio FFmpeg (filtr H.264 ultrafast)...",
            100 to "Short gotowy! Zapisano do katalogu eksportu."
        )

        for ((progress, stepText) in steps) {
            delay(1200)
            _jobs.update { currentJobs ->
                currentJobs.map { job ->
                    if (job.id == jobId) {
                        job.copy(
                            progress = progress,
                            step = stepText,
                            status = if (progress == 100) "completed" else "processing",
                            outputUrl = if (progress == 100) "/exports/combined_video_${jobId}.mp4" else null
                        )
                    } else job
                }
            }
        }

        // Add to history and profit
        val newRecord = AutopilotRunRecord(
            id = "run-" + UUID.randomUUID().toString().take(6),
            timestamp = dateFormat.format(Date()),
            slot = "Ręczny",
            articleTitle = title,
            articleLink = "https://www.bankier.pl",
            jobId = jobId,
            status = "completed",
            videoUrl = "/exports/combined_video_${jobId}.mp4",
            duration = 18.0,
            projectedEur = 65.0
        )
        _autopilotState.update { it.copy(history = listOf(newRecord) + it.history) }

        _profitState.update { curr ->
            val added = 65.0
            val newTotal = curr.totalProjectedEur + added
            curr.copy(
                totalProjectedEur = newTotal,
                progressPercent = (newTotal / curr.targetGoalEur) * 100.0,
                remainingEur = maxOf(0.0, curr.targetGoalEur - newTotal),
                totalCompletedVideos = curr.totalCompletedVideos + 1,
                videosNeededToGoal = maxOf(0, curr.videosNeededToGoal - 1)
            )
        }
    }

    fun cancelJob(jobId: String) {
        _jobs.update { list ->
            list.map {
                if (it.id == jobId) it.copy(status = "cancelled", step = "Zadanie anulowane przez użytkownika") else it
            }
        }
    }
}
