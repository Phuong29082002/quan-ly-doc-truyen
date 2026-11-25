package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.ChapterContent
import com.huflit.quanlydoctruyen.data.ChatbotRequest
import com.huflit.quanlydoctruyen.data.OfflineStore
import com.huflit.quanlydoctruyen.data.StoryListItem
import com.huflit.quanlydoctruyen.data.toMessage
import com.huflit.quanlydoctruyen.ui.components.CoverImage
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

private data class ChatLine(val fromMe: Boolean, val text: String, val stories: List<StoryListItem> = emptyList())

private val FirstSuggestions = listOf(
    "Truyện trinh thám hay nhất",
    "Truyện miễn phí đã hoàn thành",
    "Gợi ý truyện cho tôi",
    "Gói đọc giá bao nhiêu?"
)

// PB61: trợ lý gợi ý truyện (hỏi theo thể loại, tác giả, tên truyện, miễn phí, hoàn thành...)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatbotScreen(onOpenStory: (Int) -> Unit, onBack: () -> Unit) {
    val lines = remember {
        mutableStateListOf(
            ChatLine(false, "Chào bạn! Mình gợi ý truyện theo thể loại, tác giả, truyện miễn phí hay đã hoàn thành. Bạn muốn đọc gì?")
        )
    }
    var suggestions by remember { mutableStateOf(FirstSuggestions) }
    var input by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(lines.size, sending) {
        val last = lines.size + (if (sending) 1 else 0) - 1
        if (last >= 0) listState.animateScrollToItem(last)
    }

    fun send(text: String) {
        val message = text.trim()
        if (message.isEmpty() || sending) return
        input = ""
        lines.add(ChatLine(true, message))
        scope.launch {
            sending = true
            try {
                val res = ApiClient.api.askChatbot(ChatbotRequest(message))
                lines.add(ChatLine(false, res.reply, res.stories))
                if (res.suggestions.isNotEmpty()) suggestions = res.suggestions
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                lines.add(ChatLine(false, e.toMessage("Mình đang gặp lỗi, bạn thử lại sau nhé.")))
            } finally {
                sending = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Trợ lý gợi ý truyện") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().imePadding()) {
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(lines.size) { i ->
                    val line = lines[i]
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (line.fromMe) Alignment.End else Alignment.Start) {
                        Box(
                            Modifier
                                .widthIn(max = 300.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (line.fromMe) Color(0xFFE9B44C) else MaterialTheme.colorScheme.surfaceVariant)
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Text(line.text, color = if (line.fromMe) Color(0xFF1A1406) else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        line.stories.forEach { s ->
                            Card(
                                Modifier.fillMaxWidth().padding(top = 6.dp).clickable { onOpenStory(s.id) }
                            ) {
                                Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    CoverImage(s.coverUrl, s.title, Modifier.width(44.dp).height(60.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(s.title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text("${s.author} · ${s.chapterCount} chương", fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                            }
                        }
                    }
                }
                if (sending) {
                    item { Text("Đang tìm truyện...", style = MaterialTheme.typography.bodySmall) }
                }
            }

            Row(
                Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                suggestions.forEach { s ->
                    AssistChip(onClick = { send(s) }, enabled = !sending, label = { Text(s) })
                }
            }

            Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { if (it.length <= 300) input = it },
                    placeholder = { Text("Ví dụ: truyện cổ tích miễn phí") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { send(input) }),
                    modifier = Modifier.weight(1f)
                )
                Spacer(Modifier.width(8.dp))
                Button(onClick = { send(input) }, enabled = !sending && input.isNotBlank()) { Text("Gửi") }
            }
        }
    }
}

// PB41: các chương đã tải về máy, đọc được khi không có mạng
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OfflineScreen(onRead: (storyId: Int, number: Int) -> Unit, onBack: () -> Unit) {
    val context = LocalContext.current
    var chapters by remember { mutableStateOf(OfflineStore.all(context)) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chương đã tải về") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        if (chapters.isEmpty()) {
            Text(
                "Chưa có chương nào. Khi đọc truyện, bấm \"⬇ Tải về\" để lưu chương vào máy và đọc khi mất mạng.",
                Modifier.padding(padding).padding(16.dp)
            )
            return@Scaffold
        }
        val groups: Map<Int, List<ChapterContent>> = chapters.groupBy { it.storyId }
        LazyColumn(
            Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(groups.keys.toList(), key = { it }) { storyId ->
                val list = groups[storyId].orEmpty()
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(list.firstOrNull()?.storyTitle ?: "", fontWeight = FontWeight.SemiBold)
                        Text("${list.size} chương đã tải", style = MaterialTheme.typography.bodySmall)
                        list.forEach { c ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    "Chương ${c.number}: ${c.title}",
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f).clickable { onRead(c.storyId, c.number) }.padding(vertical = 8.dp)
                                )
                                TextButton(onClick = { onRead(c.storyId, c.number) }) { Text("Đọc") }
                                TextButton(onClick = {
                                    OfflineStore.remove(context, c.storyId, c.number)
                                    chapters = OfflineStore.all(context)
                                }) { Text("Xóa") }
                            }
                        }
                    }
                }
            }
        }
    }
}
