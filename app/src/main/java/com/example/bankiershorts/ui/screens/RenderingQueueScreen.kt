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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bankiershorts.data.models.JobStatus
import com.example.bankiershorts.ui.theme.*

@Composable
fun RenderingQueueScreen(
    jobs: List<JobStatus>,
    onCancelJob: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var previewJob by remember { mutableStateOf<JobStatus?>(null) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.35f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Dvr, contentDescription = null, tint = EmeraldPrimary)
                        Text("Kolejka renderowania FFmpeg w tle", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    Text(
                        "Wszystkie zadania renderowania wideo są przetwarzane wielowątkowo. Możesz w każdej chwili anulować zadanie.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }
        }

        item {
            Text("Zadania w toku i historia", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }

        if (jobs.isEmpty()) {
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(modifier = Modifier.padding(32.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text("Brak aktywnych zadań w kolejce", color = TextMuted, fontSize = 13.sp)
                    }
                }
            }
        }

        items(jobs) { job ->
            val isProcessing = job.status == "processing"
            val isCompleted = job.status == "completed"

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isProcessing) EmeraldPrimary else DarkBorder
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("job_card_${job.id}")
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(
                                shape = CircleShape,
                                color = if (isProcessing) IndigoAccent.copy(alpha = 0.2f) else EmeraldPrimary.copy(alpha = 0.2f),
                                modifier = Modifier.size(32.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        if (isProcessing) Icons.Default.Sync else Icons.Default.Check,
                                        contentDescription = null,
                                        tint = if (isProcessing) IndigoLight else EmeraldPrimary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            Column {
                                Text(job.title.ifEmpty { "Bankier Short Video" }, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(job.id, fontSize = 10.sp, color = TextMuted)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = when (job.status) {
                                "completed" -> EmeraldPrimary.copy(alpha = 0.2f)
                                "processing" -> IndigoAccent.copy(alpha = 0.2f)
                                else -> AlertRed.copy(alpha = 0.2f)
                            }
                        ) {
                            Text(
                                when (job.status) {
                                    "completed" -> "UKOŃCZONO"
                                    "processing" -> "${job.progress}%"
                                    else -> job.status.uppercase()
                                },
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = when (job.status) {
                                    "completed" -> EmeraldLight
                                    "processing" -> IndigoLight
                                    else -> AlertRed
                                },
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    if (isProcessing) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            LinearProgressIndicator(
                                progress = { job.progress / 100f },
                                modifier = Modifier.fillMaxWidth().height(8.dp),
                                color = EmeraldPrimary,
                                trackColor = DarkSurfaceVariant
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(job.step, fontSize = 11.sp, color = AmberAccent, maxLines = 1)
                                Text("${job.progress}%", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                        }

                        OutlinedButton(
                            onClick = { onCancelJob(job.id) },
                            modifier = Modifier.fillMaxWidth().height(40.dp),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AlertRed.copy(alpha = 0.6f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = AlertRed)
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Anuluj renderowanie", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    } else if (isCompleted) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { previewJob = job },
                                modifier = Modifier.weight(1f).height(40.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = IndigoAccent)
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Podgląd shorta", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = { },
                                modifier = Modifier.weight(1f).height(40.dp),
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                            ) {
                                Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Pobierz MP4", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    // Video Preview Dialog
    previewJob?.let { job ->
        AlertDialog(
            onDismissRequest = { previewJob = null },
            confirmButton = {
                TextButton(onClick = { previewJob = null }) {
                    Text("Zamknij", color = EmeraldLight, fontWeight = FontWeight.Bold)
                }
            },
            title = {
                Text("Podgląd shorta 18s", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Simulated Vertical 9:16 Video Player Box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(260.dp)
                            .background(Color.Black, RoundedCornerShape(14.dp))
                            .border(1.dp, DarkBorder, RoundedCornerShape(14.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.PlayCircle, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(48.dp))
                            Text(
                                "Format pionowy 1080x1920 (9:16)",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color.Black.copy(alpha = 0.7f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.3f))
                            ) {
                                Text(
                                    "TIKTOKSANS-BOLD • WORD-BY-WORD",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = AmberAccent,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    Text(job.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Czas trwania: 18.0s • Kodek: H.264 ultrafast • Audio: 48kHz", fontSize = 11.sp, color = TextMuted)
                }
            },
            containerColor = DarkSurface,
            shape = RoundedCornerShape(18.dp)
        )
    }
}
