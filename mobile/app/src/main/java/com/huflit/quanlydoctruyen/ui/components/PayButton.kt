package com.huflit.quanlydoctruyen.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.PackagePaymentRequest
import com.huflit.quanlydoctruyen.data.PaymentProviders
import com.huflit.quanlydoctruyen.data.PaymentStart
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.StoryPaymentRequest
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

/**
 * PB19, PB20, PB21, PB45: nút thanh toán. Bấm vào thì chọn cổng thanh toán (giả lập / VNPay),
 * tạo giao dịch rồi báo cho màn hình gọi qua [onStarted] để mở trang thanh toán.
 * @param kind "package" hoặc "story"
 */
@Composable
fun PayButton(
    kind: String,
    targetId: Int,
    itemName: String,
    amount: Double,
    label: String,
    onNeedLogin: () -> Unit,
    onStarted: (PaymentStart) -> Unit,
    modifier: Modifier = Modifier,
    outlined: Boolean = false
) {
    var open by remember { mutableStateOf(false) }
    fun handleClick() {
        if (SessionManager.user == null) {
            onNeedLogin()
        } else {
            open = true
        }
    }

    if (outlined) OutlinedButton(onClick = { handleClick() }, modifier = modifier) { Text(label) }
    else Button(onClick = { handleClick() }, modifier = modifier) { Text(label) }

    if (open) {
        PaymentDialog(kind, targetId, itemName, amount, onDismiss = { open = false }, onStarted = { start ->
            open = false
            onStarted(start)
        })
    }
}

@Composable
private fun PaymentDialog(
    kind: String,
    targetId: Int,
    itemName: String,
    amount: Double,
    onDismiss: () -> Unit,
    onStarted: (PaymentStart) -> Unit
) {
    var providers by remember { mutableStateOf<PaymentProviders?>(null) }
    var provider by remember { mutableStateOf("Mock") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            val p = ApiClient.api.paymentProviders()
            providers = p
            provider = if (p.bankQr) "BankQR" else if (p.mock) "Mock" else "VNPay"
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.toMessage("Không tải được cổng thanh toán")
        }
    }

    fun pay() {
        scope.launch {
            busy = true
            error = null
            try {
                val start = if (kind == "package") ApiClient.api.payPackage(PackagePaymentRequest(targetId, provider))
                else ApiClient.api.payStory(StoryPaymentRequest(targetId, provider))
                onStarted(start)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = e.toMessage("Không tạo được giao dịch")
            } finally {
                busy = false
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("Xác nhận thanh toán") },
        text = {
            Column {
                Text("${if (kind == "package") "Gói đọc" else "Truyện"}: $itemName")
                Text("Số tiền: ${formatVnd(amount)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Text("Chọn cổng thanh toán", fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
                val p = providers
                if (p == null && error == null) Text("Đang tải...")
                if (p != null) {
                    ProviderOption("Chuyển khoản quét mã QR", if (p.bankQr) "Quét bằng app ngân hàng hoặc MoMo" else "Chưa cấu hình tài khoản nhận tiền",
                        selected = provider == "BankQR", enabled = p.bankQr) { provider = "BankQR" }
                    ProviderOption("VNPay (Sandbox)", if (p.vnPay) "Thẻ ATM / QR qua VNPay" else "Máy chủ chưa cấu hình VNPay",
                        selected = provider == "VNPay", enabled = p.vnPay) { provider = "VNPay" }
                    ProviderOption("Cổng giả lập", "Dùng để demo, tự chọn thành công / thất bại",
                        selected = provider == "Mock", enabled = p.mock) { provider = "Mock" }
                }
                if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
            }
        },
        confirmButton = {
            Button(onClick = { pay() }, enabled = !busy && providers != null) {
                Text(if (busy) "Đang tạo..." else "Thanh toán")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("Hủy") } }
    )
}

@Composable
private fun ProviderOption(title: String, note: String, selected: Boolean, enabled: Boolean, onSelect: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onSelect).padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected && enabled, onClick = onSelect, enabled = enabled)
        Column {
            Text(title, fontWeight = FontWeight.Medium)
            Text(note, fontSize = 12.sp)
        }
    }
}
