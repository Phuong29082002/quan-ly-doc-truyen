package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.PackageItem
import com.huflit.quanlydoctruyen.data.StoryDetail
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.ui.components.Badge
import com.huflit.quanlydoctruyen.ui.components.CoverImage
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import com.huflit.quanlydoctruyen.ui.components.StatusBadge

// PB13: thông tin truyện + danh sách chương kèm trạng thái truy cập
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoryDetailScreen(storyId: Int, onRead: (Int) -> Unit, onBack: () -> Unit) {
    var retry by remember { mutableIntStateOf(0) }
    val state by produceState<UiState<StoryDetail>>(UiState.Loading, storyId, retry) {
        value = UiState.Loading
        value = load { ApiClient.api.storyDetail(storyId) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text((state as? UiState.Success)?.data?.title ?: "Chi tiết truyện", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding), onRetry = { retry++ })
            is UiState.Success -> StoryDetailContent(s.data, onRead, Modifier.padding(padding))
        }
    }
}

@Composable
private fun StoryDetailContent(story: StoryDetail, onRead: (Int) -> Unit, modifier: Modifier) {
    val published = story.chapters.filter { it.isPublished }

    // PB18: gói đọc đang bán áp dụng cho truyện này (admin đổi trên web thì hiện ở đây)
    val packages by produceState<List<PackageItem>>(emptyList(), story.id) {
        value = runCatching { ApiClient.api.packages() }.getOrDefault(emptyList())
    }
    val applicable = packages.filter { p -> p.scope == "All" || p.stories.any { it.id == story.id } }

    LazyColumn(modifier.fillMaxSize()) {
        item {
            Row(Modifier.padding(16.dp)) {
                CoverImage(story.coverUrl, story.title, Modifier.width(110.dp).height(150.dp))
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(story.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text("Tác giả: ${story.author}", style = MaterialTheme.typography.bodyMedium)
                    Text("Thể loại: ${story.genres.joinToString(", ") { it.name }}", style = MaterialTheme.typography.bodyMedium)
                    Text("Số chương: ${published.size}", style = MaterialTheme.typography.bodyMedium)
                    Text("Lượt đọc: ${story.viewCount}", style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(6.dp))
                    StatusBadge(story.status)
                    Spacer(Modifier.height(6.dp))
                    Text(accessLabel(story), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                }
            }
        }

        item {
            Column(Modifier.padding(horizontal = 16.dp)) {
                if (published.isNotEmpty()) {
                    Button(onClick = { onRead(published.first().number) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Đọc từ đầu")
                    }
                }
                if (!story.description.isNullOrBlank()) {
                    Text(story.description, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 12.dp))
                }
                if (story.accessType != "Free" && applicable.isNotEmpty()) {
                    Text(
                        "Gói đọc áp dụng",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                    )
                    applicable.forEach { p ->
                        val scope = if (p.scope == "All") "Tất cả truyện" else "Một số truyện"
                        Text("${p.name}: ${formatVnd(p.price)} / ${p.durationDays} ngày ($scope)", style = MaterialTheme.typography.bodyMedium)
                    }
                    Text(
                        "Chức năng đăng ký gói sẽ được bổ sung ở bản cập nhật tiếp theo.",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                Text(
                    "Danh sách chương",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                )
            }
        }

        if (published.isEmpty()) {
            item { Text("Truyện chưa có chương nào", Modifier.padding(16.dp)) }
        }

        items(published, key = { it.id }) { c ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable { onRead(c.number) }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Chương ${c.number}: ${c.title}", Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (c.isFree) Badge("Miễn phí", Color(0xFFDCFCE7), Color(0xFF15803D))
                else Badge("Trả phí", Color(0xFFFFEDD5), Color(0xFFC2410C))
            }
            HorizontalDivider(Modifier.padding(horizontal = 16.dp))
        }
    }
}

// PB16, PB17: chính sách truy cập và giá mua truyện
private fun accessLabel(s: StoryDetail): String = when (s.accessType) {
    "Paid" -> "Trả phí · Mua truyện ${formatVnd(s.price)}"
    "Mixed" -> {
        val free = if (s.freeChapterCount > 0) "${s.freeChapterCount} chương đầu miễn phí · " else ""
        "Kết hợp · $free" + "Mua truyện ${formatVnd(s.price)}"
    }
    else -> "Miễn phí"
}
