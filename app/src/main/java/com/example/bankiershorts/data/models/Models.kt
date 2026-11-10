package com.example.bankiershorts.data.models

data class CaptionStyle(
    val fontSize: Int = 64,
    val fontColor: String = "white",
    val outlineColor: String = "black",
    val outlineWidth: Int = 8,
    val boxColor: String = "black@0.6",
    val position: String = "center", // top, center, bottom
    val alignment: String = "center",
    val animation: String = "single-word", // word-by-word, single-word, karaoke, classic
    val highlightColor: String = "yellow" // yellow, green, lime, cyan, red, white
)

data class Scene(
    val id: String,
    val videoUrl: String,
    val thumbnailUrl: String = "",
    val duration: Double = 4.5,
    val subtitles: String,
    val voiceoverText: String,
    val captionStyle: CaptionStyle = CaptionStyle(),
    val searchKeyword: String = "business finance"
)

data class BankierArticle(
    val id: String,
    val title: String,
    val link: String,
    val description: String,
    val pubDate: String,
    val category: String = "Wiadomości",
    val keyTakeaway: String? = null,
    val suggestedKeywords: List<String> = emptyList(),
    val suggestedHook: String? = null
)

data class BankierTrendKeyword(
    val keyword: String,
    val count: Int,
    val sharePercent: Double,
    val category: String,
    val sentiment: String, // alert, positive, neutral, negative
    val narrativeAngle: String,
    val monetizationHook: String
)

data class ViralityScore(
    val totalScore: Int = 84,
    val rating: String = "VIRAL_EXPLOSION",
    val sentimentLabel: String = "Pilny komunikat rynkowy",
    val matchedKeyword: String = "Stopy procentowe NBP",
    val targetAudience: String = "Kredytobiorcy i oszczędzający",
    val projectedCpaEur: Double = 45.0,
    val rationale: String = "Temat bezpośrednio wpływa na finanse osobiste Polaków. Wysoki potencjał udostępnień w pierwszych 3 sekundach."
)

data class AutopilotRunRecord(
    val id: String,
    val timestamp: String,
    val slot: String,
    val articleTitle: String,
    val articleLink: String,
    val jobId: String,
    val status: String, // queued, processing, completed, failed
    val videoUrl: String? = null,
    val duration: Double = 18.0,
    val error: String? = null,
    val viralityScore: ViralityScore? = null,
    val projectedEur: Double = 45.0
)

data class AutopilotSchedulerState(
    val enabled: Boolean = false,
    val dailySlots: List<String> = listOf("06:00", "11:00", "16:00", "21:00"),
    val timeZone: String = "Europe/Warsaw",
    val lastExecutedSlot: String? = "11:00",
    val lastRunTime: String? = "2026-11-09 11:00:23",
    val lastRunStatus: String = "completed",
    val lastRunJobId: String? = "job_1788811431515_sjsxy4",
    val runsCount: Int = 14,
    val candidateArticle: BankierArticle? = null,
    val candidateViralityScore: ViralityScore? = null,
    val history: List<AutopilotRunRecord> = emptyList()
)

data class JobStatus(
    val id: String,
    val status: String, // queued, processing, completed, failed, cancelled
    val progress: Int,
    val step: String,
    val frame: Int = 0,
    val fps: Double = 29.97,
    val speed: String = "1.8x",
    val duration: Double = 18.0,
    val outputUrl: String? = null,
    val outputFilename: String? = null,
    val thumbnailUrl: String? = null,
    val title: String = "",
    val error: String? = null,
    val createdAt: String = ""
)

data class VideoProfitLog(
    val id: String,
    val timestamp: String,
    val videoTitle: String,
    val slot: String,
    val jobId: String,
    val status: String,
    val estViews: Int,
    val estClicksToBio: Int,
    val estApplications: Int,
    val avgCpaEur: Double,
    val projectedEur: Double,
    val productCategory: String
)

data class ProfitMonitorState(
    val targetGoalEur: Double = 10000.0,
    val totalProjectedEur: Double = 3420.50,
    val progressPercent: Double = 34.2,
    val remainingEur: Double = 6579.50,
    val totalCompletedVideos: Int = 18,
    val dailyProjectedEur: Double = 245.0,
    val avgEurPerVideo: Double = 190.0,
    val videosNeededToGoal: Int = 35,
    val logs: List<VideoProfitLog> = emptyList()
)

data class WebhookLog(
    val id: String,
    val timestamp: String,
    val event: String,
    val method: String,
    val status: Int,
    val payloadPreview: String
)
