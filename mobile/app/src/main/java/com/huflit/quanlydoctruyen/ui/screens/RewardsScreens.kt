package com.huflit.quanlydoctruyen.ui.screens

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
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.BadgeItem
import com.huflit.quanlydoctruyen.data.BadgeSummary
import com.huflit.quanlydoctruyen.data.CoinBalance
import com.huflit.quanlydoctruyen.data.CoinHistoryItem
import com.huflit.quanlydoctruyen.data.DailyMission
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.data.timeAgo
import com.huflit.quanlydoctruyen.data.toMessage
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

private data class CoinsData(val balance: CoinBalance, val missions: List<DailyMission>, val history: List<CoinHistoryItem>)

private val CoinGold = Color(0xFFB7791F)
private val CoinGreen = Color(0xFF15803D)

// PB58: xu của tôi, điểm danh hằng ngày, nhiệm vụ đọc và lịch sử xu
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoinsScreen(onBack: () -> Unit) {
    val user = SessionManager.user
    LaunchedEffect(user) { if (user == null) onBack() }
    if (user == null) return

    var reload by remember { mutableIntStateOf(0) }
    var message by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val state by produceState<UiState<CoinsData>>(UiState.Loading, reload) {
        value = load {
            CoinsData(ApiClient.api.coinBalance(), ApiClient.api.missions(), ApiClient.api.coinHistory().items)
        }
    }

    fun run(action: suspend () -> String) {
        if (busy) return
        scope.launch {
            busy = true
            message = try {
                true to action()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                false to e.toMessage("Thao tác thất bại")
            } finally {
                busy = false
            }
            reload++
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Xu và nhiệm vụ") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding), onRetry = { reload++ })
            is UiState.Success -> {
                val d = s.data
                LazyColumn(
                    Modifier.padding(padding).fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Card(
                            Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF7E0))
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text("Số xu hiện có", color = Color(0xFF6B5B2E))
                                Text("🪙 ${d.balance.coins} xu", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = CoinGold)
                                Text(
                                    "Chuỗi điểm danh: ${d.balance.consecutiveDays} ngày liên tiếp",
                                    color = Color(0xFF6B5B2E),
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                                Spacer(Modifier.height(12.dp))
                                if (d.balance.hasCheckedInToday) {
                                    OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) {
                                        Text("Hôm nay đã điểm danh")
                                    }
                                } else {
                                    Button(
                                        onClick = { run { ApiClient.api.checkIn().message } },
                                        enabled = !busy,
                                        modifier = Modifier.fillMaxWidth()
                                    ) { Text("Điểm danh nhận +${d.balance.nextCheckInReward} xu") }
                                }
                                Text(
                                    "Dùng 5 xu để mở khóa một chương trả phí.",
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }
                        }
                    }

                    message?.let { (ok, text) ->
                        item { Text(text, color = if (ok) CoinGreen else MaterialTheme.colorScheme.error) }
                    }

                    item { RewardsHeader("Nhiệm vụ hôm nay") }
                    if (d.missions.isEmpty()) {
                        item { Text("Hôm nay chưa có nhiệm vụ.") }
                    }
                    items(d.missions, key = { it.key }) { m ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(m.title, fontWeight = FontWeight.SemiBold)
                                        Text(m.description, style = MaterialTheme.typography.bodySmall)
                                    }
                                    Text("+${m.rewardCoins} xu", color = CoinGold, fontWeight = FontWeight.Bold)
                                }
                                val progress = if (m.target > 0) (m.current.toFloat() / m.target).coerceIn(0f, 1f) else 0f
                                LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("${m.current.coerceAtMost(m.target)}/${m.target}", modifier = Modifier.weight(1f))
                                    when {
                                        m.isClaimed -> Text("Đã nhận", color = CoinGreen)
                                        m.isCompleted -> Button(
                                            onClick = { run { ApiClient.api.claimMission(m.key).message } },
                                            enabled = !busy
                                        ) { Text("Nhận thưởng") }
                                        else -> Text("Chưa xong", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }

                    item { RewardsHeader("Lịch sử xu") }
                    if (d.history.isEmpty()) {
                        item { Text("Chưa có giao dịch xu nào.") }
                    }
                    items(d.history, key = { it.id }) { h ->
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
                                Column(Modifier.weight(1f)) {
                                    Text(h.description)
                                    Text(timeAgo(h.createdAt), style = MaterialTheme.typography.bodySmall)
                                }
                                Text(
                                    if (h.amount >= 0) "+${h.amount}" else "${h.amount}",
                                    fontWeight = FontWeight.Bold,
                                    color = if (h.amount >= 0) CoinGreen else MaterialTheme.colorScheme.error
                                )
                            }
                            HorizontalDivider()
                        }
                    }
                }
            }
        }
    }
}

// PB60: chuỗi ngày đọc liên tục và huy hiệu thành tích
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BadgesScreen(onBack: () -> Unit) {
    val user = SessionManager.user
    LaunchedEffect(user) { if (user == null) onBack() }
    if (user == null) return

    var reload by remember { mutableIntStateOf(0) }
    val state by produceState<UiState<BadgeSummary>>(UiState.Loading, reload) {
        value = load { ApiClient.api.badges() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Huy hiệu và chuỗi ngày đọc") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding), onRetry = { reload++ })
            is UiState.Success -> {
                val d = s.data
                val earned = d.badges.count { it.earned }
                LazyColumn(
                    Modifier.padding(padding).fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StreakStat("🔥", "${d.currentStreak} ngày", "Chuỗi hiện tại", Modifier.weight(1f))
                            StreakStat("⭐", "${d.longestStreak} ngày", "Dài nhất", Modifier.weight(1f))
                            StreakStat("📖", "${d.totalChaptersRead}", "Chương đã đọc", Modifier.weight(1f))
                        }
                    }
                    item {
                        Text(
                            "Mỗi ngày đọc ít nhất một chương để giữ chuỗi. Đã đạt $earned/${d.badges.size} huy hiệu.",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    items(d.badges, key = { it.id }) { b -> BadgeRow(b) }
                }
            }
        }
    }
}

@Composable
private fun StreakStat(icon: String, value: String, label: String, modifier: Modifier = Modifier) {
    Card(modifier) {
        Column(Modifier.fillMaxWidth().padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(icon, fontSize = 22.sp)
            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(label, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun BadgeRow(b: BadgeItem) {
    Card(Modifier.fillMaxWidth().alpha(if (b.earned) 1f else 0.55f)) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(b.icon, fontSize = 30.sp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(b.name, fontWeight = FontWeight.SemiBold)
                Text(b.description, style = MaterialTheme.typography.bodySmall)
            }
            Text(
                if (b.earned) "Đã đạt" else "Chưa đạt",
                color = if (b.earned) CoinGreen else MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun RewardsHeader(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
}
