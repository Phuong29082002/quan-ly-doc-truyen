package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.AppNotification
import com.huflit.quanlydoctruyen.data.FollowedStory
import com.huflit.quanlydoctruyen.data.RankingItem
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.data.timeAgo
import com.huflit.quanlydoctruyen.ui.components.CoverImage
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import com.huflit.quanlydoctruyen.ui.components.StatusBadge
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

private val Lamp = Color(0xFFE9B44C)

@Composable
private fun EmptyText(text: String) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// PB28: truyện đang theo dõi
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FollowingScreen(onOpenStory: (Int) -> Unit, onRead: (Int, Int) -> Unit, onBack: () -> Unit) {
    var reload by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val state by produceState<UiState<List<FollowedStory>>>(UiState.Loading, reload) {
        value = load { ApiClient.api.myFollows() }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text("Truyện theo dõi") }, navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } })
    }) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding)) { reload++ }
            is UiState.Success -> if (s.data.isEmpty()) {
                Box(Modifier.padding(padding)) { EmptyText("Bạn chưa theo dõi truyện nào. Bấm \"Theo dõi\" ở trang truyện để nhận thông báo chương mới.") }
            } else {
                LazyColumn(Modifier.padding(padding).fillMaxSize()) {
                    items(s.data, key = { it.storyId }) { f ->
                        Row(
                            Modifier.fillMaxWidth().clickable { onOpenStory(f.storyId) }.padding(16.dp, 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CoverImage(f.coverUrl, f.title, Modifier.width(52.dp).height(70.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(f.title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(f.author, style = MaterialTheme.typography.bodySmall)
                                    Spacer(Modifier.width(6.dp))
                                    StatusBadge(f.status)
                                }
                                val latest = f.latestChapterNumber
                                if (latest != null) {
                                    Text(
                                        "Mới nhất: Chương $latest" + (f.latestChapterTitle?.let { ": $it" } ?: ""),
                                        color = MaterialTheme.colorScheme.primary,
                                        style = MaterialTheme.typography.bodySmall,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.clickable { onRead(f.storyId, latest) }
                                    )
                                }
                                Text("Cập nhật ${timeAgo(f.updatedAt)}", style = MaterialTheme.typography.labelSmall)
                            }
                            TextButton(onClick = {
                                scope.launch {
                                    runCatching { ApiClient.api.unfollow(f.storyId) }
                                    reload++
                                }
                            }) { Text("Bỏ") }
                        }
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}

// PB29: danh sách thông báo, bấm để mở đúng chương mới
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(onRead: (Int, Int) -> Unit, onOpenStory: (Int) -> Unit, onBack: () -> Unit) {
    var reload by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val state by produceState<UiState<List<AppNotification>>>(UiState.Loading, reload) {
        value = load { ApiClient.api.notifications() }
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Thông báo") },
            navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } },
            actions = {
                TextButton(onClick = {
                    scope.launch {
                        runCatching { ApiClient.api.markAllRead() }
                        reload++
                    }
                }) { Text("Đọc hết") }
            }
        )
    }) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding)) { reload++ }
            is UiState.Success -> if (s.data.isEmpty()) {
                Box(Modifier.padding(padding)) { EmptyText("Chưa có thông báo nào") }
            } else {
                LazyColumn(Modifier.padding(padding).fillMaxSize()) {
                    items(s.data, key = { it.id }) { n ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .background(if (n.isRead) Color.Transparent else Lamp.copy(alpha = 0.12f))
                                .clickable {
                                    scope.launch {
                                        if (!n.isRead) runCatching { ApiClient.api.markRead(n.id) }
                                        val story = n.storyId
                                        val chapter = n.chapterNumber
                                        if (story != null && chapter != null) onRead(story, chapter)
                                        else if (story != null) onOpenStory(story)
                                        else reload++
                                    }
                                }
                                .padding(16.dp, 12.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Box(
                                Modifier.padding(top = 6.dp).size(8.dp).clip(CircleShape)
                                    .background(if (n.isRead) Color.Transparent else Lamp)
                            )
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(n.message, fontWeight = if (n.isRead) FontWeight.Normal else FontWeight.Medium)
                                Text(timeAgo(n.createdAt), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}

private val RANK_TYPES = listOf("views" to "Đọc nhiều", "rating" to "Đánh giá cao", "follows" to "Theo dõi nhiều")
private val RANK_PERIODS = listOf("day" to "Hôm nay", "week" to "Tuần", "month" to "Tháng", "all" to "Mọi lúc")

// PB49: bảng xếp hạng ngày / tuần / tháng
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RankingScreen(onOpenStory: (Int) -> Unit, onBack: () -> Unit) {
    var type by rememberSaveable { mutableStateOf("views") }
    var period by rememberSaveable { mutableStateOf("week") }
    var reload by remember { mutableIntStateOf(0) }
    val state by produceState<UiState<List<RankingItem>>>(UiState.Loading, type, period, reload) {
        value = UiState.Loading
        value = load { ApiClient.api.rankings(type, period) }
    }
    val number = NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN"))

    Scaffold(topBar = {
        TopAppBar(title = { Text("Bảng xếp hạng") }, navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } })
    }) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                RANK_TYPES.forEach { (v, label) -> FilterChip(selected = type == v, onClick = { type = v }, label = { Text(label) }) }
            }
            if (type != "rating") {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RANK_PERIODS.forEach { (v, label) -> FilterChip(selected = period == v, onClick = { period = v }, label = { Text(label) }) }
                }
            }
            when (val s = state) {
                is UiState.Loading -> LoadingBox()
                is UiState.Error -> ErrorBox(s.message) { reload++ }
                is UiState.Success -> if (s.data.isEmpty()) EmptyText("Chưa có dữ liệu trong khoảng thời gian này") else {
                    LazyColumn(Modifier.fillMaxSize()) {
                        items(s.data, key = { it.story.id }) { item ->
                            Row(
                                Modifier.fillMaxWidth().clickable { onOpenStory(item.story.id) }.padding(16.dp, 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "${item.rank}",
                                    modifier = Modifier.width(32.dp),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = if (item.rank <= 3) Lamp else MaterialTheme.colorScheme.outline
                                )
                                CoverImage(item.story.coverUrl, item.story.title, Modifier.width(46.dp).height(62.dp))
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(item.story.title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(item.story.author, style = MaterialTheme.typography.bodySmall)
                                    Text(
                                        when (type) {
                                            "rating" -> "★ ${"%.1f".format(item.value)} (${item.story.ratingCount} lượt)"
                                            "follows" -> "${number.format(item.value.toLong())} người theo dõi"
                                            else -> "${number.format(item.value.toLong())} lượt đọc"
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                            HorizontalDivider()
                        }
                    }
                }
            }
        }
    }
}
