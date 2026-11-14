package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.BankQr
import com.huflit.quanlydoctruyen.data.MockResultRequest
import com.huflit.quanlydoctruyen.data.TransactionDto
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.formatDateTime
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.data.toMessage
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.RemoteImage
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

/**
 * Thanh toán một giao dịch:
 * - Cổng giả lập: chọn "Thanh toán thành công" / "Thất bại" (PB19, PB21, PB23)
 * - VNPay: trình duyệt đã mở trang VNPay, quay lại app bấm "Kiểm tra kết quả" (PB45)
 * - Chuyển khoản QR: hiện mã VietQR, tự kiểm tra mỗi 4 giây đến khi tiền về được xác nhận
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentScreen(
    transactionId: Int,
    /** "Mock", "VNPay", "BankQR" hoặc "Pending" (mở lại từ lịch sử) */
    provider: String,
    onOpenStory: (Int) -> Unit,
    onOpenLibrary: () -> Unit,
    onBack: () -> Unit
) {
    var reload by remember { mutableIntStateOf(0) }
    var override by remember { mutableStateOf<TransactionDto?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val state by produceState<UiState<TransactionDto>>(UiState.Loading, transactionId, reload) {
        value = load { ApiClient.api.payment(transactionId) }
    }

    // Không phải cổng giả lập: tự hỏi lại trạng thái mỗi 4 giây cho đến khi giao dịch được xử lý
    LaunchedEffect(transactionId, provider) {
        if (provider == "Mock") return@LaunchedEffect
        while (true) {
            delay(4000)
            val t = runCatching { ApiClient.api.payment(transactionId) }.getOrNull()
            if (t != null && t.status != "Pending") {
                override = t
                break
            }
        }
    }

    fun finishMock(success: Boolean) {
        scope.launch {
            busy = true
            error = null
            try {
                override = ApiClient.api.mockResult(transactionId, MockResultRequest(success))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = e.toMessage()
            } finally {
                busy = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Thanh toán") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        val s = state
        val t = override ?: (s as? UiState.Success)?.data
        when {
            t != null -> Column(
                Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)
            ) {
                TransactionCard(t)
                Spacer(Modifier.height(16.dp))

                when (t.status) {
                    "Success" -> {
                        ResultHeader("✓", Color(0xFFDCFCE7), Color(0xFF15803D), "Thanh toán thành công")
                        if (t.type == "Package" && t.packageEndAt != null) {
                            Text(
                                (if (t.isRenewal) "Đã gia hạn, thời gian được cộng dồn. " else "Gói đã được kích hoạt. ") +
                                    "Hạn đến ${formatDateTime(t.packageEndAt)}.",
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                            )
                        }
                        Spacer(Modifier.height(16.dp))
                        if (t.storyId != null) {
                            Button(onClick = { onOpenStory(t.storyId) }, modifier = Modifier.fillMaxWidth()) { Text("Đọc truyện ngay") }
                        } else {
                            Button(onClick = onOpenLibrary, modifier = Modifier.fillMaxWidth()) { Text("Xem gói của tôi") }
                        }
                    }

                    "Failed" -> {
                        ResultHeader("✕", Color(0xFFFEE2E2), Color(0xFFB91C1C), "Thanh toán không thành công")
                        Text(
                            "Bạn chưa bị trừ tiền và chưa được cấp quyền đọc.",
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                        )
                        Spacer(Modifier.height(16.dp))
                        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Quay lại") }
                    }

                    else -> if (provider != "Mock") {
                        if (provider != "VNPay") BankQrSection(transactionId)
                        Text(
                            if (provider == "VNPay") "Đang chờ thanh toán trên VNPay. Thanh toán xong trong trình duyệt thì quay lại đây."
                            else "Đang chờ xác nhận thanh toán. Tiền về là hệ thống tự mở khóa.",
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                        )
                        Button(onClick = { reload++ }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                            Text("Kiểm tra kết quả")
                        }
                    } else {
                        Text(
                            "Cổng thanh toán giả lập: không trừ tiền thật. Chọn kết quả để kiểm tra cách hệ thống xử lý.",
                            fontSize = 13.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(MaterialTheme.shapes.small)
                                .background(Color(0xFFFEF3C7))
                                .padding(10.dp)
                        )
                        Button(
                            onClick = { finishMock(true) },
                            enabled = !busy,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                            modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                        ) { Text("Thanh toán thành công") }
                        OutlinedButton(
                            onClick = { finishMock(false) },
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                        ) { Text("Giả lập thanh toán thất bại", color = Color(0xFFB91C1C)) }
                    }
                }

                if (error != null) {
                    Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
                }
            }

            s is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding), onRetry = { reload++ })
            else -> LoadingBox(Modifier.padding(padding))
        }
    }
}

@Composable
private fun TransactionCard(t: TransactionDto) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(formatVnd(t.amount), fontSize = 26.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text(if (t.type == "Package") "Gói đọc ${t.packageName ?: ""}" else "Mua truyện ${t.storyTitle ?: ""}")
            Text("Mã giao dịch #${t.id} · ${formatDateTime(t.createdAt)}", fontSize = 12.sp)
        }
    }
}

@Composable
private fun ResultHeader(icon: String, background: Color, foreground: Color, title: String) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(56.dp).clip(CircleShape).background(background),
            contentAlignment = Alignment.Center
        ) { Text(icon, color = foreground, fontSize = 26.sp, fontWeight = FontWeight.Bold) }
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
    }
}

/** Mã VietQR + thông tin chuyển khoản. Không lấy được (chưa cấu hình) thì không hiện gì */
@Composable
private fun BankQrSection(transactionId: Int) {
    val qr by produceState<BankQr?>(null, transactionId) {
        value = runCatching { ApiClient.api.bankQr(transactionId) }.getOrNull()
    }
    val clipboard = LocalClipboardManager.current
    val q = qr ?: return

    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        RemoteImage(
            path = q.qrImageUrl,
            contentDescription = "Mã VietQR chuyển khoản",
            modifier = Modifier.fillMaxWidth(0.8f).clip(MaterialTheme.shapes.medium),
            contentScale = ContentScale.FillWidth,
            keepAspectRatio = true,
            placeholder = { Box(Modifier.fillMaxWidth().height(240.dp).background(Color(0x11888888))) }
        )
        Text("Mở app ngân hàng hoặc MoMo, chọn Quét mã QR", fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
    }
    Card(Modifier.fillMaxWidth().padding(top = 12.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (q.bankName.isNotBlank()) InfoRow("Ngân hàng", q.bankName)
            InfoRow("Số tài khoản", q.accountNo) { clipboard.setText(AnnotatedString(q.accountNo)) }
            InfoRow("Chủ tài khoản", q.accountName)
            InfoRow("Số tiền", formatVnd(q.amount))
            InfoRow("Nội dung", q.transferContent) { clipboard.setText(AnnotatedString(q.transferContent)) }
            Text(
                "Giữ nguyên nội dung ${q.transferContent} để hệ thống nhận ra giao dịch của bạn.",
                fontSize = 12.sp,
                color = Color(0xFFB45309)
            )
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String, onCopy: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold)
        if (onCopy != null) TextButton(onClick = onCopy) { Text("Chép") }
    }
}
