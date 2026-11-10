package com.example.bankiershorts

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bankiershorts.ui.screens.*
import com.example.bankiershorts.ui.theme.*
import com.example.bankiershorts.ui.viewmodel.AppTab
import com.example.bankiershorts.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            BankierShortsTheme {
                MainAppShell(viewModel)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppShell(viewModel: MainViewModel) {
    val currentTab by viewModel.currentTab.collectAsState()
    val autopilotState by viewModel.autopilotState.collectAsState()
    val articles by viewModel.articles.collectAsState()
    val trends by viewModel.trends.collectAsState()
    val scenes by viewModel.scenes.collectAsState()
    val jobs by viewModel.jobs.collectAsState()
    val profitState by viewModel.profitState.collectAsState()
    val webhookLogs by viewModel.webhookLogs.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val isRendering by viewModel.isRendering.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.snackbarEvent.collect { event ->
            snackbarHostState.showSnackbar(
                message = event.message,
                duration = SnackbarDuration.Short
            )
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = DarkBackground,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "Bankier Shorts Creator",
                                fontWeight = FontWeight.Black,
                                fontSize = 17.sp,
                                color = TextPrimary
                            )
                            Text(
                                "Automatyzacja wideo z newsów finansowych",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }

                        Surface(
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
                            color = EmeraldPrimary.copy(alpha = 0.2f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.4f)),
                            modifier = Modifier.padding(end = 12.dp)
                        ) {
                            Text(
                                "10 000 € GOAL",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = EmeraldLight,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkBackground,
                    titleContentColor = TextPrimary
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = DarkSurface,
                tonalElevation = 8.dp
            ) {
                AppTab.values().forEach { tab ->
                    val isSelected = currentTab == tab
                    val (icon, label) = when (tab) {
                        AppTab.AUTOPILOT -> Icons.Default.SmartToy to "Autopilot"
                        AppTab.NEWS -> Icons.Default.Newspaper to "Newsy"
                        AppTab.COMBINER -> Icons.Default.Movie to "Kreator"
                        AppTab.QUEUE -> Icons.Default.Dvr to "Kolejka"
                        AppTab.PROFIT -> Icons.Default.TrendingUp to "Zyski"
                        AppTab.WEBHOOKS -> Icons.Default.Webhook to "Webhooki"
                    }

                    NavigationBarItem(
                        selected = isSelected,
                        onClick = { viewModel.setTab(tab) },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label, fontSize = 10.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = EmeraldPrimary,
                            selectedTextColor = EmeraldPrimary,
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted,
                            indicatorColor = EmeraldPrimary.copy(alpha = 0.15f)
                        ),
                        modifier = Modifier.testTag("nav_item_${tab.name.lowercase()}")
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentTab) {
                AppTab.AUTOPILOT -> AutopilotScreen(
                    state = autopilotState,
                    isRendering = isRendering,
                    onToggleAutopilot = { viewModel.toggleAutopilot() },
                    onRunOnce = { viewModel.runAutopilotOnce() }
                )
                AppTab.NEWS -> BankierNewsScreen(
                    articles = articles,
                    trends = trends,
                    selectedCategory = selectedCategory,
                    searchQuery = searchQuery,
                    onCategorySelected = { viewModel.setCategory(it) },
                    onSearchQueryChanged = { viewModel.setSearchQuery(it) },
                    onSelectArticle = { viewModel.selectArticle(it) }
                )
                AppTab.COMBINER -> VideoCombinerScreen(
                    scenes = scenes,
                    isRendering = isRendering,
                    onUpdateScene = { viewModel.updateScene(it) },
                    onStartRender = { viewModel.startManualRender() }
                )
                AppTab.QUEUE -> RenderingQueueScreen(
                    jobs = jobs,
                    onCancelJob = { viewModel.cancelJob(it) }
                )
                AppTab.PROFIT -> ProfitMonitorScreen(
                    profitState = profitState
                )
                AppTab.WEBHOOKS -> WebhooksScreen(
                    logs = webhookLogs
                )
            }
        }
    }
}
