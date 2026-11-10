package com.example.bankiershorts.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bankiershorts.data.models.WebhookLog
import com.example.bankiershorts.ui.theme.*

@Composable
fun WebhooksScreen(
    logs: List<WebhookLog>,
    modifier: Modifier = Modifier
) {
    val samplePayload = """{
  "scenes": [
    {
      "videoUrl": "https://commondatastorage.googleapis.com/.../ForBiggerBlazes.mp4",
      "subtitles": "PILNY KOMUNIKAT BANKIER.PL",
      "voiceover_text": "Rada Polityki Pieniężnej podjęła decyzję...",
      "duration": 4.5
    }
  ],
  "tts": true,
  "ttsLanguage": "pl-PL",
  "captionAnimation": "word-by-word",
  "highlightColor": "yellow"
}"""

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Connector Card
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, IndigoAccent.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(
                            shape = CircleShape,
                            color = IndigoAccent.copy(alpha = 0.2f),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Webhook, contentDescription = null, tint = IndigoLight, modifier = Modifier.size(16.dp))
                            }
                        }
                        Column {
                            Text("KONEKTOR MAKE.COM & N8N", fontSize = 11.sp, fontWeight = FontWeight.Black, color = IndigoLight)
                            Text("Zewnętrzne wyzwalacze webhooków", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }

                    Text(
                        "Możesz wyzwalać generowanie shortów z Make.com, n8n, n8n cloud lub dowolnego skryptu cURL przez HTTP POST.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = DarkSurfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Endpoint do wywołania:", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                            Text("POST /api/webhook/make", fontFamily = FontFamily.Monospace, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = EmeraldLight)
                        }
                    }
                }
            }
        }

        // Sample Payload
        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Przykładowy payload JSON", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = DarkSurfaceVariant
                        ) {
                            Text("JSON", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = DarkBackground,
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            samplePayload,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = AmberLight,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            }
        }

        // Webhook Logs
        item {
            Text("Ostatnie odebrane webhooki", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }

        items(logs) { log ->
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = EmeraldPrimary.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    "${log.status} ${log.method}",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldLight,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                            Text(log.event, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextPrimary)
                        }
                        Text(log.timestamp, fontSize = 10.sp, color = TextMuted)
                    }
                    Text(log.payloadPreview, fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = TextSecondary)
                }
            }
        }
    }
}
