package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.ReadingItem
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.formatDateTime
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.ui.components.CoverImage
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import kotlinx.coroutines.launch

// PB27: truyện đang đọc; PB26: đọc tiếp đúng chương (đồng bộ với Web)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReadingListScreen(onContinue: (storyId: Int, chapter: Int) -> Unit, onOpenStory: (Int) -> Unit, onBack: () -> Unit) {
    var reload by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val state by produceState<UiState<List<ReadingItem>>>(UiState.Loading, reload) {
        value = load { ApiClient.api.readingList() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Truyện đang đọc") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding), onRetry = { reload++ })
            is UiState.Success -> if (s.data.isEmpty()) {
                Text("Bạn chưa đọc truyện nào.", Modifier.padding(padding).padding(16.dp))
            } else {
                LazyColumn(
                    Modifier.padding(padding).fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(s.data, key = { it.storyId }) { r ->
                        val progress = if (r.totalChapters > 0)
                            ((r.chapterNumber - 1 + r.position) / r.totalChapters).toFloat().coerceIn(0f, 1f) else 0f
                        Card(Modifier.fillMaxWidth().clickable { onOpenStory(r.storyId) }) {
                            Row(Modifier.padding(10.dp)) {
                                CoverImage(r.coverUrl, r.storyTitle, Modifier.width(64.dp).height(86.dp))
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(r.storyTitle, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text("Chương ${r.chapterNumber}: ${r.chapterTitle}", fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp))
                                    Text("${(progress * 100).toInt()}% · ${formatDateTime(r.updatedAt)}", fontSize = 12.sp)
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(onClick = { onContinue(r.storyId, r.chapterNumber) }) { Text("Đọc tiếp") }
                                        TextButton(onClick = {
                                            scope.launch {
                                                runCatching { ApiClient.api.removeReading(r.storyId) }
                                                reload++
                                            }
                                        }) { Text("Bỏ") }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
