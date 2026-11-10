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
import com.example.bankiershorts.data.models.ProfitMonitorState
import com.example.bankiershorts.ui.theme.*

@Composable
fun ProfitMonitorScreen(
    profitState: ProfitMonitorState,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Goal Card (10,000 EUR Monthly Target)
        item {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(Color(0xFF064E3B), DarkSurface, Color(0xFF0F172A))
                        ),
                        shape = RoundedCornerShape(24.dp)
                    )
                    .border(1.dp, EmeraldPrimary.copy(alpha = 0.4f), RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = EmeraldPrimary.copy(alpha = 0.2f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Default.MonetizationOn, contentDescription = null, tint = EmeraldLight, modifier = Modifier.size(16.dp))
                                Text("PROFIT MONITOR", fontSize = 11.sp, fontWeight = FontWeight.Black, color = EmeraldLight)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = DarkSurfaceVariant
                        ) {
                            Text(
                                "CEL: 10 000 € / MIESIĄC",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = AmberAccent,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            "${"%,.2f".format(profitState.totalProjectedEur)} €",
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Text(
                            "Zrealizowano ${"%.1f".format(profitState.progressPercent)}% miesięcznego celu monetyzacji",
                            fontSize = 12.sp,
                            color = EmeraldLight
                        )
                    }

                    // Progress Bar
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        LinearProgressIndicator(
                            progress = { (profitState.progressPercent / 100f).toFloat() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(12.dp),
                            color = EmeraldPrimary,
                            trackColor = DarkSurfaceVariant
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Pozostało: ${"%,.2f".format(profitState.remainingEur)} €", fontSize = 11.sp, color = TextSecondary)
                            Text("Jeszcze ok. ${profitState.videosNeededToGoal} shortów", fontSize = 11.sp, color = AmberAccent, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Metrics Grid
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricCard(
                    title = "DZIENNY PROGNOZOWANY",
                    value = "+${"%.0f".format(profitState.dailyProjectedEur)} €",
                    valueColor = EmeraldLight,
                    subtext = "Z 4 automatycznych slotów",
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = "ŚR. ZYSK NA SHORT",
                    value = "${"%.1f".format(profitState.avgEurPerVideo)} €",
                    valueColor = AmberAccent,
                    subtext = "Średni CPA z afiliacji",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Conversions & CPA Explanation
        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Insights, contentDescription = null, tint = IndigoLight, modifier = Modifier.size(16.dp))
                        Text("Jak działa model zarobkowy 10 000 €?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Text(
                        "Każdy short z Bankier.pl celuje w konkretną potrzebę finansową widzów: konta oszczędnościowe z wysokim procentem, kredyty hipoteczne czy obligacje skarbowe. CTA w 4. scenie kieruje do linku w bio z prowizją 25-100 € za zatwierdzony wniosek.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }
        }

        // Logs Table Section
        item {
            Text("Historia monetyzacji opublikowanych shortów", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }

        items(profitState.logs) { log ->
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = IndigoAccent.copy(alpha = 0.2f)
                        ) {
                            Text(
                                log.productCategory,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = IndigoLight,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Text("+${log.projectedEur} €", fontSize = 14.sp, fontWeight = FontWeight.Black, color = EmeraldLight)
                    }

                    Text(log.videoTitle, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("${log.estViews} wyśw.", fontSize = 11.sp, color = TextSecondary)
                        Text("${log.estClicksToBio} klików bio", fontSize = 11.sp, color = AmberAccent)
                        Text("${log.estApplications} wniosków", fontSize = 11.sp, color = EmeraldLight, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.weight(1f))
                        Text(log.timestamp, fontSize = 10.sp, color = TextMuted)
                    }
                }
            }
        }
    }
}
