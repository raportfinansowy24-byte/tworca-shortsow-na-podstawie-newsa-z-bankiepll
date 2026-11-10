package com.example.bankiershorts.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
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
import com.example.bankiershorts.data.models.CaptionStyle
import com.example.bankiershorts.data.models.Scene
import com.example.bankiershorts.ui.theme.*

@Composable
fun VideoCombinerScreen(
    scenes: List<Scene>,
    isRendering: Boolean,
    onUpdateScene: (Scene) -> Unit,
    onStartRender: () -> Unit,
    modifier: Modifier = Modifier
) {
    val totalDuration = scenes.sumOf { it.duration }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Storyboard Banner
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, IndigoAccent.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.MovieFilter, contentDescription = null, tint = IndigoLight)
                            Text("Storyboard Shorta (4 sceny)", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = IndigoAccent.copy(alpha = 0.2f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, IndigoAccent)
                        ) {
                            Text(
                                "Łącznie: ${"%.1f".format(totalDuration)}s",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = IndigoLight,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                    Text(
                        "Optymalny czas dla retencji 100%: 4 sceny po 4.5 sekundy. Każda scena posiada dynamiczne napisy word-by-word i lektora.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )

                    Button(
                        onClick = onStartRender,
                        enabled = !isRendering,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("start_render_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = EmeraldPrimary,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isRendering) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                            Text("Montuję wideo...", fontWeight = FontWeight.Bold)
                        } else {
                            Icon(Icons.Default.PlayCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Połącz sceny i renderuj wideo 18s", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                    }
                }
            }
        }

        // Scenes Editor List
        itemsIndexed(scenes) { index, scene ->
            val roleName = when (index) {
                0 -> "Scena 1: HOOK (Pierwsze 3s)"
                1 -> "Scena 2: KONTEKST I PROBLEM"
                2 -> "Scena 3: ANALIZA I LICZBY"
                else -> "Scena 4: CALL TO ACTION"
            }

            SceneCardItem(
                scene = scene,
                roleName = roleName,
                index = index + 1,
                onUpdate = onUpdateScene
            )
        }
    }
}

@Composable
fun SceneCardItem(
    scene: Scene,
    roleName: String,
    index: Int,
    onUpdate: (Scene) -> Unit
) {
    var expandedSettings by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("scene_card_$index")
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
                        color = AmberAccent.copy(alpha = 0.2f),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("$index", fontWeight = FontWeight.Black, fontSize = 13.sp, color = AmberAccent)
                        }
                    }
                    Text(roleName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = DarkSurfaceVariant
                ) {
                    Text(
                        "${scene.duration}s",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            // Subtitle text (displayed animated on screen)
            OutlinedTextField(
                value = scene.subtitles,
                onValueChange = { onUpdate(scene.copy(subtitles = it)) },
                label = { Text("Napisy na ekranie (duża czcionka)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = DarkBorder,
                    focusedContainerColor = DarkSurfaceVariant,
                    unfocusedContainerColor = DarkSurfaceVariant
                ),
                maxLines = 2
            )

            // Voiceover narration text
            OutlinedTextField(
                value = scene.voiceoverText,
                onValueChange = { onUpdate(scene.copy(voiceoverText = it)) },
                label = { Text("Tekst lektora (synteza TTS)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = IndigoAccent,
                    unfocusedBorderColor = DarkBorder,
                    focusedContainerColor = DarkSurfaceVariant,
                    unfocusedContainerColor = DarkSurfaceVariant
                ),
                maxLines = 3
            )

            // Visual search keyword
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Videocam, contentDescription = null, tint = TextMuted, modifier = Modifier.size(16.dp))
                Text("Tło Pexels: ", fontSize = 11.sp, color = TextMuted)
                Text(scene.searchKeyword, fontSize = 11.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.weight(1f))

                TextButton(onClick = { expandedSettings = !expandedSettings }) {
                    Text(if (expandedSettings) "Zwiń styl" else "Styl napisów", fontSize = 11.sp, color = IndigoLight)
                }
            }

            if (expandedSettings) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DarkSurfaceVariant, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Kolor podświetlenia słów:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("red" to AlertRed, "yellow" to AmberAccent, "lime" to EmeraldLight, "cyan" to CyanAccent).forEach { (colorName, color) ->
                            val isSelected = scene.captionStyle.highlightColor == colorName
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(color, CircleShape)
                                    .border(
                                        2.dp,
                                        if (isSelected) Color.White else Color.Transparent,
                                        CircleShape
                                    )
                                    .clickable {
                                        onUpdate(scene.copy(captionStyle = scene.captionStyle.copy(highlightColor = colorName)))
                                    }
                            )
                        }
                    }

                    Text("Animacja napisów:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("single-word" to "Jedno słowo", "word-by-word" to "Słowo po słowie", "karaoke" to "Karaoke").forEach { (animKey, animLabel) ->
                            val isSelected = scene.captionStyle.animation == animKey
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) IndigoAccent else DarkSurface,
                                modifier = Modifier.clickable {
                                    onUpdate(scene.copy(captionStyle = scene.captionStyle.copy(animation = animKey)))
                                }
                            ) {
                                Text(
                                    animLabel,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else TextSecondary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
