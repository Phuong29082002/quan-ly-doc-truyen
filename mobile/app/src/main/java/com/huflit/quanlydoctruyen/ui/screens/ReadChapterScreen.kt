package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.ChapterContent
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.LoadingBox

// PB14: đọc chương, chuyển chương, chỉnh cỡ chữ, chế độ tối
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReadChapterScreen(storyId: Int, number: Int, onGoTo: (Int) -> Unit, onBack: () -> Unit) {
    var retry by remember { mutableIntStateOf(0) }
    val state by produceState<UiState<ChapterContent>>(UiState.Loading, storyId, number, retry) {
        value = UiState.Loading
        value = load { ApiClient.api.readChapter(storyId, number) }
    }

    var fontSize by remember { mutableIntStateOf(SessionManager.readerFontSize) }
    var dark by remember { mutableStateOf(SessionManager.readerDarkMode) }

    val background = if (dark) Color(0xFF1C1C1E) else MaterialTheme.colorScheme.background
    val textColor = if (dark) Color(0xFFE5E5E5) else MaterialTheme.colorScheme.onBackground

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text((state as? UiState.Success)?.data?.storyTitle ?: "Đọc truyện", maxLines = 1, overflow = TextOverflow.Ellipsis)
                },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Mục lục") } }
            )
        }
    ) { padding ->
        Surface(Modifier.padding(padding).fillMaxSize(), color = background, contentColor = textColor) {
            when (val s = state) {
                is UiState.Loading -> LoadingBox()
                is UiState.Error -> ErrorBox(
                    if (s.code == 403) "${s.message}\n(Chương trả phí sẽ mở ở Sprint 2)" else s.message,
                    onRetry = if (s.code == 403) null else ({ retry++ })
                )
                is UiState.Success -> {
                    val c = s.data
                    Column(Modifier.verticalScroll(rememberScrollState(), true).padding(16.dp)) {
                        Text(
                            "Chương ${c.number}: ${c.title}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = { fontSize = (fontSize - 2).coerceAtLeast(14); SessionManager.readerFontSize = fontSize }) { Text("A-") }
                            Text("$fontSize")
                            TextButton(onClick = { fontSize = (fontSize + 2).coerceAtMost(30); SessionManager.readerFontSize = fontSize }) { Text("A+") }
                            TextButton(onClick = { dark = !dark; SessionManager.readerDarkMode = dark }) {
                                Text(if (dark) "Nền sáng" else "Nền tối")
                            }
                        }

                        ChapterNav(c, onGoTo)

                        c.content.split(Regex("\n+")).filter { it.isNotBlank() }.forEach { paragraph ->
                            Text(
                                paragraph.trim(),
                                fontSize = fontSize.sp,
                                lineHeight = (fontSize * 1.7f).sp,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }

                        ChapterNav(c, onGoTo)
                    }
                }
            }
        }
    }
}

@Composable
private fun ChapterNav(c: ChapterContent, onGoTo: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(
            onClick = { c.prevNumber?.let(onGoTo) },
            enabled = c.prevNumber != null,
            modifier = Modifier.weight(1f)
        ) { Text("‹ Chương trước") }
        Button(
            onClick = { c.nextNumber?.let(onGoTo) },
            enabled = c.nextNumber != null,
            modifier = Modifier.weight(1f)
        ) { Text("Chương sau ›") }
    }
}
