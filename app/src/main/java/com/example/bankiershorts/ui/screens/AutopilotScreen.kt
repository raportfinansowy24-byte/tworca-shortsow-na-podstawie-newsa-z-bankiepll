package com.example.bankiershorts.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bankiershorts.data.models.AutopilotSchedulerState
import com.example.bankiershorts.ui.theme.*

@Composable
fun AutopilotScreen(
    state: AutopilotSchedulerState,
    isRendering: Boolean,
    onToggleAutopilot: () -> Unit,
    onRunOnce: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Hero Header Card
        item {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(Color(0xFF1E1B4B), DarkSurface, Color(0xFF0F172A))
                        ),
                        shape = RoundedCornerShape(24.dp)
                    )
                    .border(1.dp, IndigoAccent.copy(alpha = 0.35f), RoundedCornerShape(24.dp))
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = IndigoAccent.copy(alpha = 0.2f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, IndigoAccent.copy(alpha = 0.5f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Default.Movie, contentDescription = null, tint = IndigoLight, modifier = Modifier.size(14.dp))
                                Text("AUTOPILOT SHORTÓW", color = IndigoLight, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Text(
                        "Produkcja bez ręcznego wybierania",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black
                    )

                    Text(
                        "System sam analizuje najświeższe wiadomości z Bankier.pl, pisze polski scenariusz o wysokiej retencji, dobiera ujęcia Pexels i montuje pionowy film 18 sekund.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )

                    // Action buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onRunOnce,
                            enabled = !isRendering,
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .testTag("run_once_button"),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = EmeraldPrimary,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            if (isRendering) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                Spacer(Modifier.width(8.dp))
                                Text("Renderuję...", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            } else {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Renderuj test", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }

                        OutlinedButton(
                            onClick = onToggleAutopilot,
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .testTag("toggle_autopilot_button"),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = if (state.enabled) EmeraldLight else TextPrimary
                            ),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (state.enabled) EmeraldPrimary else DarkBorder
                            ),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(
                                if (state.enabled) Icons.Default.Pause else Icons.Default.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                if (state.enabled) "Wyłącz automat" else "Włącz 4× dziennie",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
        }

        // Metrics Grid (4 cards)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricCard(
                    title = "STATUS",
                    value = if (state.enabled) "Aktywny" else "Wstrzymany",
                    valueColor = if (state.enabled) EmeraldPrimary else TextSecondary,
                    subtext = if (state.enabled) "4 sloty dziennie" else "Czeka na włączenie",
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = "NASTĘPNY SLOT",
                    value = state.lastExecutedSlot ?: "16:00",
                    valueColor = AmberAccent,
                    subtext = "Europe/Warsaw",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricCard(
                    title = "OSTATNI RENDER",
                    value = if (state.lastRunStatus == "completed") "Gotowy" else state.lastRunStatus,
                    valueColor = EmeraldLight,
                    subtext = state.lastRunTime ?: "Brak",
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = "ŁĄCZNIE SHORTÓW",
                    value = "${state.runsCount}",
                    valueColor = IndigoLight,
                    subtext = "Wideo 18s z napisami",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Daily Slots Schedule Section
        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.AccessTime, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                        Text("Stały harmonogram publikacji", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        state.dailySlots.forEach { slot ->
                            val isNext = slot == "16:00"
                            Surface(
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                color = if (isNext) IndigoAccent.copy(alpha = 0.2f) else DarkSurfaceVariant,
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isNext) IndigoAccent else DarkBorder
                                )
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 10.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(slot, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                                    if (isNext) {
                                        Text("NASTĘPNY", fontSize = 9.sp, fontWeight = FontWeight.Black, color = IndigoLight)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Candidate News Card with Virality Score
        item {
            val candidate = state.candidateArticle
            val virality = state.candidateViralityScore
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(16.dp))
                            Text("News dobrany automatycznie", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                        }
                        if (virality != null) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = EmeraldPrimary.copy(alpha = 0.15f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary)
                            ) {
                                Text(
                                    "${virality.totalScore}/100 VIRAL",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldLight,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    Text(
                        candidate?.title ?: "RPP podjęła decyzję w sprawie stóp procentowych",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        candidate?.description ?: "Rada Polityki Pieniężnej ogłasza najnowsze poziomy stóp referencyjnych w Polsce.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )

                    if (virality != null) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = DarkSurfaceVariant,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Uzasadnienie algorytmu:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberAccent)
                                Text(virality.rationale, fontSize = 12.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            }
        }

        // History of generated shorts
        item {
            Text("Ostatnio wygenerowane shorty", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }

        items(state.history) { item ->
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = EmeraldPrimary.copy(alpha = 0.15f),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(24.dp))
                        }
                    }

                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(item.articleTitle, maxLines = 1, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(item.slot, fontSize = 11.sp, color = AmberAccent, fontWeight = FontWeight.SemiBold)
                            Text("·", fontSize = 11.sp, color = TextMuted)
                            Text("${item.duration}s", fontSize = 11.sp, color = TextSecondary)
                            Text("·", fontSize = 11.sp, color = TextMuted)
                            Text("+${item.projectedEur} €", fontSize = 11.sp, color = EmeraldLight, fontWeight = FontWeight.Bold)
                        }
                    }

                    IconButton(onClick = {}) {
                        Icon(Icons.Default.Download, contentDescription = "Pobierz", tint = TextSecondary)
                    }
                }
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    valueColor: Color,
    subtext: String,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Black, color = valueColor)
            Text(subtext, fontSize = 11.sp, color = TextSecondary, maxLines = 1)
        }
    }
}
