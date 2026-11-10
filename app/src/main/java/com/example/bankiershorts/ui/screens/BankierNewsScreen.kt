package com.example.bankiershorts.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bankiershorts.data.models.BankierArticle
import com.example.bankiershorts.data.models.BankierTrendKeyword
import com.example.bankiershorts.ui.theme.*

@Composable
fun BankierNewsScreen(
    articles: List<BankierArticle>,
    trends: List<BankierTrendKeyword>,
    selectedCategory: String,
    searchQuery: String,
    onCategorySelected: (String) -> Unit,
    onSearchQueryChanged: (String) -> Unit,
    onSelectArticle: (BankierArticle) -> Unit,
    modifier: Modifier = Modifier
) {
    val categories = listOf("Wszystkie", "Wiadomości", "Giełda", "Waluty")

    val filteredArticles = articles.filter { article ->
        val matchesCategory = selectedCategory == "Wszystkie" || article.category.equals(selectedCategory, ignoreCase = true)
        val matchesSearch = searchQuery.isBlank() ||
                article.title.contains(searchQuery, ignoreCase = true) ||
                article.description.contains(searchQuery, ignoreCase = true)
        matchesCategory && matchesSearch
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Header
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.35f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(
                            shape = CircleShape,
                            color = AmberAccent.copy(alpha = 0.2f),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Feed, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                            }
                        }
                        Column {
                            Text("BANKIER.PL • LIVE FEED", fontSize = 11.sp, fontWeight = FontWeight.Black, color = AmberAccent)
                            Text("Automatyczny monitoring rynkowy", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                    Text(
                        "Wybierz dowolny artykuł, aby natychmiast utworzyć 4-scenowy scenariusz shorta zoptymalizowany pod algorytmy YouTube i TikTok.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }
        }

        // Market Trends Bar
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Trendy rynkowe i konwersje", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    trends.forEach { trend ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = DarkSurfaceVariant,
                            border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    if (trend.sentiment == "alert") Icons.Default.TrendingUp else Icons.Default.Analytics,
                                    contentDescription = null,
                                    tint = if (trend.sentiment == "alert") AlertRed else EmeraldLight,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(trend.keyword, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("${trend.sharePercent}%", fontSize = 11.sp, color = AmberAccent, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // Search Field
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchQueryChanged,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("search_news_input"),
                placeholder = { Text("Szukaj w artykułach Bankier.pl...", fontSize = 13.sp, color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = DarkBorder,
                    focusedContainerColor = DarkSurface,
                    unfocusedContainerColor = DarkSurface
                ),
                singleLine = true
            )
        }

        // Category Filter Chips
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categories.forEach { cat ->
                    val isSelected = selectedCategory == cat
                    FilterChip(
                        selected = isSelected,
                        onClick = { onCategorySelected(cat) },
                        label = { Text(cat, fontSize = 12.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = EmeraldPrimary,
                            selectedLabelColor = Color.White,
                            containerColor = DarkSurface,
                            labelColor = TextSecondary
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = isSelected,
                            borderColor = DarkBorder,
                            selectedBorderColor = EmeraldPrimary
                        ),
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            }
        }

        // Articles List
        items(filteredArticles) { article ->
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("article_card_${article.id}")
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
                                article.category.uppercase(),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = IndigoLight,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Text(article.pubDate, fontSize = 11.sp, color = TextMuted)
                    }

                    Text(article.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                    Text(article.description, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)

                    if (article.suggestedHook != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = DarkSurfaceVariant,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Bolt, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                                Column {
                                    Text("Rekomendowany Hook (pierwsze 3 sekundy):", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = AmberAccent)
                                    Text(article.suggestedHook, fontSize = 11.sp, color = TextPrimary)
                                }
                            }
                        }
                    }

                    Button(
                        onClick = { onSelectArticle(article) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .testTag("select_article_button_${article.id}"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = EmeraldPrimary,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.VideoCall, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Generuj short z tego newsu", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
