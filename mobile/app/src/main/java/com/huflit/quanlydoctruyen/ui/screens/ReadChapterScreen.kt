package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.snapshotFlow
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
import com.huflit.quanlydoctruyen.ReadingWidget
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.OfflineStore
import com.huflit.quanlydoctruyen.data.UnlockChapterRequest
import com.huflit.quanlydoctruyen.data.toMessage
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException
import com.huflit.quanlydoctruyen.data.ChapterContent
import com.huflit.quanlydoctruyen.data.LockInfo
import com.huflit.quanlydoctruyen.data.PaymentStart
import com.huflit.quanlydoctruyen.data.ReadingProgressRequest
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.ui.components.ChapterBody
import com.huflit.quanlydoctruyen.ui.components.CommentsSection
import com.huflit.quanlydoctruyen.ui.components.ContentBlock
import com.huflit.quanlydoctruyen.ui.components.parseChapterContent
import com.huflit.quanlydoctruyen.ui.components.rememberReadAloud
import androidx.compose.foundation.layout.width
import androidx.compose.material3.FilterChip
import androidx.compose.runtime.mutableFloatStateOf
import kotlin.math.roundToInt
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.PayButton
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlin.math.abs

// PB14: đọc chương, chuyển chương; PB48: tùy chỉnh trình đọc, nghe đọc, hẹn giờ tắt; PB30: bình luận
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReadChapterScreen(
    storyId: Int,
    number: Int,
    onGoTo: (Int) -> Unit,
    onLogin: () -> Unit,
    onBack: () -> Unit,
    onOpenPackages: () -> Unit,
    onPaymentStarted: (PaymentStart) -> Unit
) {
    var retry by remember { mutableIntStateOf(0) }
    val context = LocalContext.current
    // PB41: mất mạng mà chương đã tải về máy thì đọc bản đã lưu
    var offlineMode by remember { mutableStateOf(false) }
    val state by produceState<UiState<ChapterContent>>(UiState.Loading, storyId, number, retry, SessionManager.user?.id) {
        value = UiState.Loading
        val online = load { ApiClient.api.readChapter(storyId, number) }
        val saved = if (online is UiState.Error && online.code == null && online.lock == null)
            OfflineStore.get(context, storyId, number) else null
        offlineMode = saved != null
        value = if (saved != null) UiState.Success(saved) else online
    }

    var fontSize by remember { mutableIntStateOf(SessionManager.readerFontSize) }
    var theme by remember { mutableStateOf(SessionManager.readerTheme) }
    var lineHeight by remember { mutableFloatStateOf(SessionManager.readerLineHeight) }
    var rate by remember { mutableFloatStateOf(SessionManager.readerSpeechRate) }
    var showSettings by remember { mutableStateOf(false) }
    val tts = rememberReadAloud()

    // PB48: ba kiểu nền đọc
    val background = when (theme) {
        "dark" -> Color(0xFF1C1C1E)
        "sepia" -> Color(0xFFF6EFE0)
        else -> MaterialTheme.colorScheme.background
    }
    val textColor = when (theme) {
        "dark" -> Color(0xFFE5E5E5)
        "sepia" -> Color(0xFF3B2F1E)
        else -> MaterialTheme.colorScheme.onBackground
    }

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
                is UiState.Error ->
                    // PB22: chương trả phí chưa có quyền đọc
                    if (s.lock != null) LockedChapter(storyId, number, s.lock, onLogin, onBack, onOpenPackages, onPaymentStarted, onUnlocked = { retry++ })
                    else ErrorBox(s.message, onRetry = if (s.code == 403) null else ({ retry++ }))
                is UiState.Success -> {
                    val c = s.data
                    val scroll = rememberScrollState()
                    var downloaded by remember(c.id) { mutableStateOf(OfflineStore.has(context, c.storyId, c.number)) }

                    // PB59: lưu chương đang đọc cho widget "Đang đọc dở"
                    LaunchedEffect(c.id) {
                        runCatching { ReadingWidget.saveLastRead(context, c) }
                    }

                    // PB26: mở lại đúng vị trí đọc lần trước (kể cả khi lần trước đọc trên Web)
                    LaunchedEffect(c.id) {
                        if (SessionManager.user == null) return@LaunchedEffect
                        val p = runCatching { ApiClient.api.readingProgress(storyId).body() }.getOrNull()
                        if (p != null && p.chapterNumber == c.number && p.position > 0.02) {
                            delay(400) // chờ ảnh minh họa tải xong để tính đúng chiều dài chương
                            scroll.animateScrollTo((p.position * scroll.maxValue).toInt())
                        }
                    }
                    // PB26: dừng cuộn 1 giây thì lưu vị trí đọc lên máy chủ
                    LaunchedEffect(c.id) {
                        if (SessionManager.user == null) return@LaunchedEffect
                        var lastSaved = -1.0
                        snapshotFlow { scroll.value to scroll.maxValue }.collectLatest { (value, max) ->
                            delay(1000)
                            val pos = if (max > 0) (value.toDouble() / max).coerceIn(0.0, 1.0) else 0.0
                            if (abs(pos - lastSaved) >= 0.01) {
                                lastSaved = pos
                                runCatching { ApiClient.api.saveProgress(ReadingProgressRequest(storyId, c.number, pos)) }
                            }
                        }
                    }

                    Column(Modifier.verticalScroll(scroll, true).padding(16.dp)) {
                        Text(
                            "Chương ${c.number}: ${c.title}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )

                        // PB48: nạp nội dung cho bộ đọc to (chỉ các đoạn văn, bỏ qua ảnh)
                        LaunchedEffect(c.id, tts.ready) {
                            tts.setContent(
                                parseChapterContent(c.content).mapIndexedNotNull { i, b -> (b as? ContentBlock.Paragraph)?.let { i to it.text } }
                            )
                        }

                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (tts.ready) {
                                if (tts.playing) Button(onClick = { tts.pause() }) { Text("⏸ Tạm dừng") }
                                else Button(onClick = { tts.play(rate) }) { Text(if (tts.active != null) "▶ Nghe tiếp" else "🔊 Nghe đọc") }
                                if (tts.active != null) TextButton(onClick = { tts.stop() }) { Text("Dừng") }
                            }
                            TextButton(onClick = { showSettings = !showSettings }) { Text(if (showSettings) "Ẩn tùy chỉnh" else "Aa Tùy chỉnh") }
                            // PB41: tải chương về máy để đọc khi không có mạng
                            TextButton(onClick = {
                                if (downloaded) OfflineStore.remove(context, c.storyId, c.number) else OfflineStore.save(context, c)
                                downloaded = !downloaded
                            }) { Text(if (downloaded) "✓ Đã tải" else "⬇ Tải về") }
                        }
                        if (offlineMode) {
                            Text(
                                "Không có mạng: đang đọc bản đã tải về máy.",
                                style = MaterialTheme.typography.bodySmall,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        if (tts.ready && tts.vietnameseMissing) {
                            Text(
                                "Máy chưa có giọng đọc tiếng Việt: vào Cài đặt > Chuyển văn bản thành giọng nói để tải thêm.",
                                style = MaterialTheme.typography.bodySmall,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        if (showSettings) {
                            ReaderSettings(
                                fontSize = fontSize,
                                onFontSize = { fontSize = it; SessionManager.readerFontSize = it },
                                theme = theme,
                                onTheme = { theme = it; SessionManager.readerTheme = it; SessionManager.readerDarkMode = it == "dark" },
                                lineHeight = lineHeight,
                                onLineHeight = { lineHeight = it; SessionManager.readerLineHeight = it },
                                rate = rate,
                                onRate = { rate = it; SessionManager.readerSpeechRate = it },
                                onSleep = { tts.setSleepTimer(it) }
                            )
                        }

                        ChapterNav(c, onGoTo)

                        // PB43: chữ xen kẽ ảnh minh họa
                        ChapterBody(c.content, fontSize, lineHeight, tts.active)

                        ChapterNav(c, onGoTo)

                        // PB30: thảo luận theo chương (cần mạng)
                        if (!offlineMode) CommentsSection(c.id, onLogin)
                    }
                }
            }
        }
    }
}

@Composable
private fun ReaderSettings(
    fontSize: Int,
    onFontSize: (Int) -> Unit,
    theme: String,
    onTheme: (String) -> Unit,
    lineHeight: Float,
    onLineHeight: (Float) -> Unit,
    rate: Float,
    onRate: (Float) -> Unit,
    onSleep: (Int) -> Unit
) {
    var sleep by remember { mutableIntStateOf(0) }
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SettingRow("Màu nền") {
            listOf("light" to "Sáng", "sepia" to "Giấy cũ", "dark" to "Tối").forEach { (v, label) ->
                FilterChip(selected = theme == v, onClick = { onTheme(v) }, label = { Text(label) })
            }
        }
        SettingRow("Cỡ chữ") {
            TextButton(onClick = { onFontSize((fontSize - 1).coerceAtLeast(14)) }) { Text("A−") }
            Text("$fontSize")
            TextButton(onClick = { onFontSize((fontSize + 1).coerceAtMost(30)) }) { Text("A+") }
        }
        SettingRow("Giãn dòng") {
            TextButton(onClick = { onLineHeight(((lineHeight - 0.1f) * 10).roundToInt() / 10f) }, enabled = lineHeight > 1.35f) { Text("−") }
            Text("%.1f".format(lineHeight))
            TextButton(onClick = { onLineHeight(((lineHeight + 0.1f) * 10).roundToInt() / 10f) }, enabled = lineHeight < 2.55f) { Text("+") }
        }
        SettingRow("Tốc độ đọc") {
            TextButton(onClick = { onRate(((rate - 0.1f) * 10).roundToInt() / 10f) }, enabled = rate > 0.55f) { Text("−") }
            Text("%.1fx".format(rate))
            TextButton(onClick = { onRate(((rate + 0.1f) * 10).roundToInt() / 10f) }, enabled = rate < 1.95f) { Text("+") }
        }
        // PB48: hẹn giờ tắt nghe đọc
        SettingRow("Hẹn giờ tắt") {
            listOf(0 to "Tắt", 15 to "15'", 30 to "30'", 60 to "60'").forEach { (m, label) ->
                FilterChip(selected = sleep == m, onClick = { sleep = m; onSleep(m) }, label = { Text(label) })
            }
        }
    }
}

@Composable
private fun SettingRow(label: String, content: @Composable () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, modifier = Modifier.width(92.dp), style = MaterialTheme.typography.bodyMedium)
        content()
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

@Composable
private fun LockedChapter(
    storyId: Int,
    number: Int,
    lock: LockInfo,
    onLogin: () -> Unit,
    onBack: () -> Unit,
    onOpenPackages: () -> Unit,
    onPaymentStarted: (PaymentStart) -> Unit,
    onUnlocked: () -> Unit
) {
    val loggedIn = SessionManager.user != null
    val scope = rememberCoroutineScope()
    var unlocking by remember { mutableStateOf(false) }
    var unlockError by remember { mutableStateOf<String?>(null) }
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Chương $number là nội dung trả phí", fontWeight = FontWeight.Bold, fontSize = 20.sp, textAlign = TextAlign.Center)
        if (!lock.storyTitle.isNullOrBlank()) {
            Text(lock.storyTitle, modifier = Modifier.padding(top = 4.dp))
        }
        Spacer(Modifier.height(16.dp))

        if (!loggedIn) {
            Text("Vui lòng đăng nhập để đọc chương này.", textAlign = TextAlign.Center)
            Button(onClick = onLogin, modifier = Modifier.padding(top = 12.dp)) { Text("Đăng nhập") }
        } else {
            Text("Bạn cần có gói đọc còn hạn hoặc mua truyện để đọc chương này.", textAlign = TextAlign.Center)
            if (lock.price != null && lock.price > 0) {
                Text("Giá mua truyện: ${formatVnd(lock.price)}", fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 8.dp))
            }
            if (lock.price != null && lock.price > 0) {
                PayButton(
                    kind = "story",
                    targetId = storyId,
                    itemName = lock.storyTitle ?: "Truyện",
                    amount = lock.price,
                    label = "Mua truyện · ${formatVnd(lock.price)}",
                    onNeedLogin = onLogin,
                    onStarted = onPaymentStarted,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }
            OutlinedButton(onClick = onOpenPackages, modifier = Modifier.padding(top = 8.dp)) { Text("Xem gói đọc") }
            // PB58: dùng xu mở khóa riêng chương này
            val chapterId = lock.chapterId
            if (chapterId != null) {
                val coins = lock.coinPrice ?: 5
                OutlinedButton(
                    onClick = {
                        unlockError = null
                        scope.launch {
                            unlocking = true
                            try {
                                ApiClient.api.unlockChapter(UnlockChapterRequest(chapterId))
                                onUnlocked()
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                unlockError = e.toMessage("Mở khóa thất bại")
                            } finally {
                                unlocking = false
                            }
                        }
                    },
                    enabled = !unlocking,
                    modifier = Modifier.padding(top = 8.dp)
                ) { Text(if (unlocking) "Đang mở khóa..." else "🪙 Mở chương này bằng $coins xu") }
                unlockError?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }
        TextButton(onClick = onBack, modifier = Modifier.padding(top = 12.dp)) { Text("Về mục lục") }
    }
}
