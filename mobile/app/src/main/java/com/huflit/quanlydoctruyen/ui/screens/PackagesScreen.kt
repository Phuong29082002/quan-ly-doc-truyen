package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.MyPackage
import com.huflit.quanlydoctruyen.data.PackageItem
import com.huflit.quanlydoctruyen.data.PaymentStart
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.formatDateTime
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import com.huflit.quanlydoctruyen.ui.components.PayButton
import java.time.Instant

// PB18: gói đang bán; PB19: đăng ký + thanh toán; PB20: gia hạn (cộng dồn thời gian)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PackagesScreen(onNeedLogin: () -> Unit, onPaymentStarted: (PaymentStart) -> Unit, onBack: () -> Unit) {
    var retry by remember { mutableIntStateOf(0) }
    val state by produceState<UiState<List<PackageItem>>>(UiState.Loading, retry) {
        value = load { ApiClient.api.packages() }
    }
    // Gói của tôi: để hiện hạn sử dụng và nút "Gia hạn"
    val mine by produceState<List<MyPackage>>(emptyList(), SessionManager.user?.id) {
        value = if (SessionManager.user == null) emptyList()
        else runCatching { ApiClient.api.myLibrary().packages }.getOrDefault(emptyList())
    }

    fun myEnd(packageId: Int): String? {
        val now = Instant.now()
        return mine.filter { it.packageId == packageId && !it.isPaused && runCatching { Instant.parse(it.endAt).isAfter(now) }.getOrDefault(false) }
            .maxByOrNull { it.endAt }?.endAt
    }

    // Gói khác đang dùng: mua gói mới sẽ tạm dừng gói đó và bảo lưu số ngày còn lại
    fun switchNote(packageId: Int): String? {
        val other = mine.firstOrNull { it.isActive && it.packageId != packageId } ?: return null
        return "Bạn đang dùng gói ${other.packageName}. Khi chuyển sang gói này, gói ${other.packageName} được tạm dừng và bảo lưu số ngày còn lại, có thể khôi phục trong Tủ sách."
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gói đọc") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding), onRetry = { retry++ })
            is UiState.Success -> LazyColumn(
                Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { Text("Đăng ký gói để đọc các chương trả phí trong thời hạn của gói.") }
                if (s.data.isEmpty()) item { Text("Hiện chưa có gói đọc nào.") }
                items(s.data, key = { it.id }) { p ->
                    val end = myEnd(p.id)
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text(p.name, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                            Text(formatVnd(p.price), fontWeight = FontWeight.Bold, fontSize = 24.sp, color = MaterialTheme.colorScheme.primary)
                            Text("cho ${p.durationDays} ngày", fontSize = 13.sp)
                            Text(
                                if (p.scope == "All") "Đọc tất cả truyện trả phí"
                                else "Đọc các truyện: ${p.stories.joinToString(", ") { it.title }}",
                                modifier = Modifier.padding(top = 8.dp)
                            )
                            if (end != null) {
                                Text(
                                    "Bạn đang dùng gói này, hạn đến ${formatDateTime(end)}",
                                    color = Color(0xFF15803D),
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }
                            PayButton(
                                kind = "package",
                                targetId = p.id,
                                itemName = p.name,
                                amount = p.price,
                                label = if (end != null) "Gia hạn thêm" else if (switchNote(p.id) != null) "Chuyển sang gói này" else "Đăng ký ngay",
                                note = if (end != null) null else switchNote(p.id),
                                onNeedLogin = onNeedLogin,
                                onStarted = onPaymentStarted,
                                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
