package com.example.bankiershorts.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.bankiershorts.data.models.*
import com.example.bankiershorts.data.repository.BankierShortsRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class AppTab(val title: String) {
    AUTOPILOT("Autopilot"),
    NEWS("Bankier News"),
    COMBINER("Kreator Shorta"),
    QUEUE("Kolejka"),
    PROFIT("Zyski 10k €"),
    WEBHOOKS("Integracje")
}

data class UiSnackbar(
    val message: String,
    val isError: Boolean = false
)

class MainViewModel(
    private val repository: BankierShortsRepository = BankierShortsRepository()
) : ViewModel() {

    private val _currentTab = MutableStateFlow(AppTab.AUTOPILOT)
    val currentTab: StateFlow<AppTab> = _currentTab.asStateFlow()

    val scenes: StateFlow<List<Scene>> = repository.scenes
    val articles: StateFlow<List<BankierArticle>> = repository.articles
    val trends: StateFlow<List<BankierTrendKeyword>> = repository.trends
    val autopilotState: StateFlow<AutopilotSchedulerState> = repository.autopilotState
    val jobs: StateFlow<List<JobStatus>> = repository.jobs
    val profitState: StateFlow<ProfitMonitorState> = repository.profitState
    val webhookLogs: StateFlow<List<WebhookLog>> = repository.webhookLogs

    private val _snackbarEvent = MutableSharedFlow<UiSnackbar>()
    val snackbarEvent: SharedFlow<UiSnackbar> = _snackbarEvent.asSharedFlow()

    private val _selectedCategory = MutableStateFlow("Wszystkie")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _isRendering = MutableStateFlow(false)
    val isRendering: StateFlow<Boolean> = _isRendering.asStateFlow()

    fun setTab(tab: AppTab) {
        _currentTab.value = tab
    }

    fun setCategory(category: String) {
        _selectedCategory.value = category
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun toggleAutopilot() {
        repository.toggleAutopilot()
        viewModelScope.launch {
            val enabled = repository.autopilotState.value.enabled
            _snackbarEvent.emit(
                UiSnackbar(
                    message = if (enabled) "Harmonogram 4x dziennie został włączony" else "Harmonogram wstrzymany",
                    isError = false
                )
            )
        }
    }

    fun runAutopilotOnce() {
        if (_isRendering.value) return
        _isRendering.value = true
        viewModelScope.launch {
            try {
                _snackbarEvent.emit(UiSnackbar("Uruchomiono render jednego shorta z newsu Bankier.pl"))
                val jobId = repository.runAutopilotOnce()
                _snackbarEvent.emit(UiSnackbar("Short ukończony! Zapisano do kolejki renderów."))
            } catch (e: Exception) {
                _snackbarEvent.emit(UiSnackbar("Błąd renderowania: ${e.message}", isError = true))
            } finally {
                _isRendering.value = false
            }
        }
    }

    fun selectArticle(article: BankierArticle) {
        repository.selectArticleForShort(article)
        _currentTab.value = AppTab.COMBINER
        viewModelScope.launch {
            _snackbarEvent.emit(UiSnackbar("Wczytano scenariusz na podstawie: ${article.title.take(30)}..."))
        }
    }

    fun updateScene(scene: Scene) {
        repository.updateScene(scene)
    }

    fun startManualRender() {
        if (_isRendering.value) return
        _isRendering.value = true
        _currentTab.value = AppTab.QUEUE
        viewModelScope.launch {
            try {
                _snackbarEvent.emit(UiSnackbar("Rozpoczęto łączenie 4 scen i renderowanie audio TTS..."))
                repository.startManualRender()
                _snackbarEvent.emit(UiSnackbar("Montaż zakończony sukcesem!"))
            } catch (e: Exception) {
                _snackbarEvent.emit(UiSnackbar("Błąd renderowania: ${e.message}", isError = true))
            } finally {
                _isRendering.value = false
            }
        }
    }

    fun cancelJob(jobId: String) {
        repository.cancelJob(jobId)
        viewModelScope.launch {
            _snackbarEvent.emit(UiSnackbar("Zadanie $jobId zostało zatrzymane"))
        }
    }
}
