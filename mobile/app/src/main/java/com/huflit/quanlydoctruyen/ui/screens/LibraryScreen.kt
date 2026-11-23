package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.MyLibrary
import com.huflit.quanlydoctruyen.data.TransactionDto
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.formatDateTime
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import com.huflit.quanlydoctruyen.data.transactionStatusLabel
import com.huflit.quanlydoctruyen.ui.components.Badge
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.LoadingBox

// PB25: gói đang dùng + hạn gói, truyện đã mua, lịch sử thanh toán
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(onOpenStory: (Int) -> Unit, onOpenPayment: (Int) -> Unit, onBack: () -> Unit) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var retry by remember { mutableIntStateOf(0) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val library by produceState<UiState<MyLibrary>>(UiState.Loading, retry) {
        value = load { ApiClient.api.myLibrary() }
    }
    val history by produceState<UiState<List<TransactionDto>>>(UiState.Loading, retry) {
        value = load { ApiClient.api.myTransactions() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tủ sách & thanh toán") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Gói & truyện đã mua") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Lịch sử thanh toán") })
            }
            if (message != null) Text(message!!, modifier = Modifier.padding(16.dp, 8.dp))
            if (tab == 0) {
                when (val s = library) {
                    is UiState.Loading -> LoadingBox()
                    is UiState.Error -> ErrorBox(s.message, onRetry = { retry++ })
                    is UiState.Success -> LibraryContent(s.data, onOpenStory, onRestore = { packageId ->
                        scope.launch {
                            message = runCatching { ApiClient.api.restorePackage(packageId) }
                                .fold({ "Đã khôi phục gói đọc" }, { it.toMessage("Khôi phục thất bại") })
                            retry++
                        }
                    })
                }
            } else {
                when (val s = history) {
                    is UiState.Loading -> LoadingBox()
                    is UiState.Error -> ErrorBox(s.message, onRetry = { retry++ })
                    is UiState.Success -> HistoryContent(s.data, onOpenPayment)
                }
            }
        }
    }
}

@Composable
private fun LibraryContent(lib: MyLibrary, onOpenStory: (Int) -> Unit, onRestore: (Int) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Gói đọc", fontWeight = FontWeight.SemiBold, fontSize = 18.sp) }
        if (lib.packages.isEmpty()) item { Text("Bạn chưa đăng ký gói đọc nào.") }
        items(lib.packages, key = { "p${it.id}" }) { p ->
            Card(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(p.packageName, fontWeight = FontWeight.Medium)
                        Text("${formatDateTime(p.startAt)} → ${formatDateTime(p.endAt)}", fontSize = 12.sp)
                    }
                    when {
                        p.isActive -> Badge("Đang dùng", Color(0xFFDCFCE7), Color(0xFF15803D))
                        p.isPaused && p.remainingDays > 0 -> Column(horizontalAlignment = Alignment.End) {
                            Badge("Bảo lưu ${p.remainingDays} ngày", Color(0xFFFEF3C7), Color(0xFFB45309))
                            TextButton(onClick = { onRestore(p.packageId) }) { Text("Khôi phục") }
                        }
                        p.isPaused -> Badge("Đã chuyển gói", Color(0xFFF3F4F6), Color(0xFF4B5563))
                        else -> Badge("Hết hạn / chưa tới lượt", Color(0xFFF3F4F6), Color(0xFF4B5563))
                    }
                }
            }
        }

        item { Text("Truyện đã mua", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, modifier = Modifier.padding(top = 12.dp)) }
        if (lib.purchases.isEmpty()) item { Text("Bạn chưa mua truyện nào.") }
        items(lib.purchases, key = { "s${it.storyId}" }) { p ->
            Card(Modifier.fillMaxWidth().clickable { onOpenStory(p.storyId) }) {
                Column(Modifier.padding(12.dp)) {
                    Text(p.storyTitle, fontWeight = FontWeight.Medium)
                    Text("${formatVnd(p.price)} · ${formatDateTime(p.purchasedAt)}", fontSize = 12.sp)
                }
            }
        }
        item { Text("Truyện đã mua đọc được mãi mãi, không phụ thuộc hạn gói.", fontSize = 12.sp) }
    }
}

@Composable
private fun HistoryContent(list: List<TransactionDto>, onOpenPayment: (Int) -> Unit) {
    if (list.isEmpty()) {
        Text("Chưa có giao dịch nào.", Modifier.padding(16.dp))
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(list, key = { it.id }) { t ->
            Card(Modifier.fillMaxWidth().clickable(enabled = t.status == "Pending") { onOpenPayment(t.id) }) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(t.itemName, fontWeight = FontWeight.Medium)
                        Text("#${t.id} · ${formatDateTime(t.paidAt ?: t.createdAt)}", fontSize = 12.sp)
                        if (t.packageEndAt != null) Text("Hạn gói đến ${formatDateTime(t.packageEndAt)}", fontSize = 12.sp)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(formatVnd(t.amount), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                        when (t.status) {
                            "Success" -> Badge(transactionStatusLabel(t.status), Color(0xFFDCFCE7), Color(0xFF15803D))
                            "Failed" -> Badge(transactionStatusLabel(t.status), Color(0xFFFEE2E2), Color(0xFFB91C1C))
                            else -> Badge(transactionStatusLabel(t.status), Color(0xFFFEF3C7), Color(0xFFB45309))
                        }
                    }
                }
            }
        }
    }
}
