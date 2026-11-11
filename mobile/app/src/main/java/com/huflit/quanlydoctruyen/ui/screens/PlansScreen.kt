package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ActivePackageItem
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.CheckoutRequest
import com.huflit.quanlydoctruyen.data.PackageItem
import com.huflit.quanlydoctruyen.data.PaymentOverview
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private data class PendingPackagePayment(val item: PackageItem, val mode: String, val label: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlansScreen(onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var packages by remember { mutableStateOf<List<PackageItem>>(emptyList()) }
    var overview by remember { mutableStateOf<PaymentOverview?>(null) }
    var loading by remember { mutableStateOf(true) }
    var paying by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var pending by remember { mutableStateOf<PendingPackagePayment?>(null) }

    suspend fun refresh() {
        loading = true
        try {
            packages = ApiClient.api.packages()
            overview = ApiClient.api.paymentHistory()
        } catch (e: Exception) {
            message = false to e.toMessage("Không tải được thông tin gói đọc")
        } finally { loading = false }
    }

    LaunchedEffect(Unit) { refresh() }

    fun restorePackageId(packageId: Int) {
        scope.launch {
            paying = true
            message = null
            try {
                val result = ApiClient.api.checkout(CheckoutRequest("Package", packageId, true, "Restore"))
                message = true to result.message
                refresh()
            } catch (e: Exception) { message = false to e.toMessage("Khôi phục gói thất bại") }
            finally { paying = false }
        }
    }

    fun confirmPayment() {
        val p = pending ?: return
        scope.launch {
            paying = true
            message = null
            try {
                val result = ApiClient.api.checkout(CheckoutRequest("Package", p.item.id, true, p.mode))
                message = (result.status == "Success") to result.message
                pending = null
                refresh()
            } catch (e: Exception) { message = false to e.toMessage("Thanh toán thất bại") }
            finally { paying = false }
        }
    }

    val active = overview?.packages?.firstOrNull { it.isActive }
    val paused = overview?.packages?.filter { it.isPaused && it.remainingDays > 0 }.orEmpty()

    Scaffold(topBar = {
        TopAppBar(title = { Text("Gói đọc của tôi") }, navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } })
    }) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
            if (loading && overview == null) {
                CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
            } else {
                Text("GÓI ĐANG SỬ DỤNG", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (active == null) Text("Bạn hiện chưa có gói đọc còn hạn.", Modifier.padding(vertical = 8.dp))
                else PackageStatusCard(active, "Đang hoạt động")

                if (paused.isNotEmpty()) {
                    Text("GÓI ĐÃ TẠM DỪNG", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp, bottom = 8.dp))
                    paused.forEach { p ->
                        PackageStatusCard(p, "Đã bảo lưu · ${p.remainingDays} ngày còn lại")
                        Button(
                            onClick = { restorePackageId(p.packageId) },
                            enabled = !paying && active?.packageId != p.packageId,
                            modifier = Modifier.padding(top = 6.dp)
                        ) { Text(if (active?.packageId == p.packageId) "Đang sử dụng gói này" else "Khôi phục miễn phí") }
                    }
                }

                HorizontalDivider(Modifier.padding(vertical = 18.dp))
                Text("CÁC GÓI ĐỌC", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                packages.filter { it.isActive }.forEach { item ->
                    val isCurrent = active?.packageId == item.id
                    val pausedItem = paused.firstOrNull { it.packageId == item.id }
                    Card(Modifier.fillMaxWidth().padding(top = 10.dp)) {
                        Column(Modifier.padding(14.dp)) {
                            Text(item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("${formatVnd(item.price)} · ${item.durationDays} ngày")
                            Text(if (item.scope == "All") "Áp dụng tất cả truyện" else "Áp dụng truyện được chọn", style = MaterialTheme.typography.bodySmall)
                            if (item.stories.isNotEmpty() && item.scope != "All") Text(item.stories.joinToString { it.title }, style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.height(8.dp))
                            when {
                                isCurrent -> Button(onClick = { pending = PendingPackagePayment(item, "Renew", "Gia hạn gói") }, enabled = !paying) { Text("Gia hạn gói") }
                                pausedItem != null -> Text("Gói này đang được bảo lưu ở phía trên.", style = MaterialTheme.typography.bodySmall)
                                active != null -> Button(onClick = { pending = PendingPackagePayment(item, "Switch", "Chuyển sang gói ${item.name}") }, enabled = !paying) { Text("Chuyển gói · ${formatVnd(item.price)}") }
                                else -> Button(onClick = { pending = PendingPackagePayment(item, "Purchase", "Đăng ký gói ${item.name}") }, enabled = !paying) { Text("Đăng ký · ${formatVnd(item.price)}") }
                            }
                        }
                    }
                }

                pending?.let { p ->
                    HorizontalDivider(Modifier.padding(vertical = 18.dp))
                    Text("THANH TOÁN QR GIẢ LẬP", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Card(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                        Column(Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${p.label}: ${p.item.name}", fontWeight = FontWeight.SemiBold)
                            Text("Người mua: ${SessionManager.user?.displayName ?: ""} · ${SessionManager.user?.email ?: ""}", style = MaterialTheme.typography.bodySmall)
                            Text(formatVnd(p.item.price), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                            DemoQrCode(Modifier.padding(12.dp).size(176.dp))
                            Text("Mã QR minh họa, không phát sinh giao dịch ngân hàng thật.", style = MaterialTheme.typography.bodySmall)
                            Button(onClick = { confirmPayment() }, enabled = !paying, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                                Text(if (paying) "Đang xử lý..." else "Thanh toán")
                            }
                            TextButton(onClick = { pending = null }) { Text("Hủy") }
                        }
                    }
                }

                MessageLine(message)
                HorizontalDivider(Modifier.padding(vertical = 18.dp))
                Text("TRUYỆN ĐÃ MUA", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                val owned = overview?.purchasedStories.orEmpty()
                if (owned.isEmpty()) Text("Bạn chưa mua quyền đọc truyện riêng.", Modifier.padding(vertical = 8.dp))
                owned.forEach { story ->
                    Text("${story.title} · ${formatVnd(story.price)}", Modifier.padding(vertical = 6.dp))
                    HorizontalDivider()
                }

                HorizontalDivider(Modifier.padding(vertical = 18.dp))
                Text("LỊCH SỬ THANH TOÁN", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                val transactions = overview?.transactions.orEmpty()
                if (transactions.isEmpty()) Text("Chưa có giao dịch nào.", Modifier.padding(vertical = 8.dp))
                transactions.forEach { tx ->
                    Column(Modifier.padding(vertical = 8.dp)) {
                        Text(tx.itemName ?: tx.type, fontWeight = FontWeight.SemiBold)
                        Text("${formatVnd(tx.amount)} · ${statusText(tx.status)}", style = MaterialTheme.typography.bodySmall)
                        Text(dateText(tx.createdAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    HorizontalDivider()
                }
                OutlinedButton(onClick = { scope.launch { refresh() } }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) { Text("Làm mới") }
            }
        }
    }
}

@Composable
private fun PackageStatusCard(item: ActivePackageItem, status: String) {
    Card(Modifier.fillMaxWidth().padding(top = 8.dp)) {
        Column(Modifier.padding(12.dp)) {
            Text(item.packageName, fontWeight = FontWeight.SemiBold)
            Text(status, color = MaterialTheme.colorScheme.primary)
            Text("Ngày bắt đầu: ${dateText(item.startAt)}", style = MaterialTheme.typography.bodySmall)
            if (!item.isPaused) Text("Ngày hết hạn: ${dateText(item.endAt)}", style = MaterialTheme.typography.bodySmall)
            Text("Còn ${item.remainingDays} ngày", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun MessageLine(message: Pair<Boolean, String>?) {
    if (message != null) Text(message.second, color = if (message.first) Color(0xFF15803D) else MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 10.dp))
}

private fun statusText(status: String) = when (status) {
    "Success" -> "Thành công"
    "Failed" -> "Thất bại"
    else -> status
}

private fun dateText(value: String): String = runCatching {
    DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault()).format(Instant.parse(value))
}.getOrDefault(value)

@Composable
fun DemoQrCode(modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val count = 25
        val cell = size.width / count
        drawRect(Color.White)
        fun finder(x: Int, y: Int) {
            drawRect(Color.Black, androidx.compose.ui.geometry.Offset(x * cell, y * cell), androidx.compose.ui.geometry.Size(7 * cell, 7 * cell))
            drawRect(Color.White, androidx.compose.ui.geometry.Offset((x + 1) * cell, (y + 1) * cell), androidx.compose.ui.geometry.Size(5 * cell, 5 * cell))
            drawRect(Color.Black, androidx.compose.ui.geometry.Offset((x + 2) * cell, (y + 2) * cell), androidx.compose.ui.geometry.Size(3 * cell, 3 * cell))
        }
        finder(1, 1); finder(17, 1); finder(1, 17)
        for (y in 0 until count) for (x in 0 until count) {
            val inFinder = (x in 1..7 && y in 1..7) || (x in 17..23 && y in 1..7) || (x in 1..7 && y in 17..23)
            if (!inFinder && ((x * 13 + y * 7 + x * y) % 5 < 2)) {
                drawRect(Color.Black, androidx.compose.ui.geometry.Offset(x * cell, y * cell), androidx.compose.ui.geometry.Size(cell, cell))
            }
        }
    }
}
