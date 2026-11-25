package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.ForgotPasswordRequest
import com.huflit.quanlydoctruyen.data.ResetPasswordRequest
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

// PB57: quên mật khẩu -> nhận mã OTP qua email -> đặt mật khẩu mới
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordScreen(onDone: () -> Unit, onBack: () -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var otp by rememberSaveable { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var codeSent by rememberSaveable { mutableStateOf(false) }
    var done by rememberSaveable { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun sendCode() {
        error = null
        val mail = email.trim()
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(mail).matches()) {
            error = "Vui lòng nhập email hợp lệ"
            return
        }
        scope.launch {
            loading = true
            try {
                info = ApiClient.api.forgotPassword(ForgotPasswordRequest(mail)).message
                codeSent = true
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = e.toMessage("Gửi mã thất bại")
            } finally {
                loading = false
            }
        }
    }

    fun reset() {
        error = when {
            otp.isBlank() -> "Vui lòng nhập mã OTP trong email"
            newPass.length < 6 -> "Mật khẩu mới tối thiểu 6 ký tự"
            newPass != confirm -> "Xác nhận mật khẩu không khớp"
            else -> null
        }
        if (error != null) return
        scope.launch {
            loading = true
            try {
                info = ApiClient.api.resetPassword(ResetPasswordRequest(email.trim(), otp.trim(), newPass)).message
                done = true
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = e.toMessage("Đặt lại mật khẩu thất bại")
            } finally {
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Quên mật khẩu") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
            if (done) {
                Text("Đặt lại mật khẩu thành công", fontSize = 20.sp, style = MaterialTheme.typography.titleLarge)
                Text("Bạn đăng nhập lại bằng mật khẩu mới nhé.", modifier = Modifier.padding(top = 8.dp))
                Button(onClick = onDone, modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) { Text("Về trang đăng nhập") }
                return@Column
            }

            Text(
                if (!codeSent) "Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu."
                else "Nhập mã OTP vừa gửi tới $email và mật khẩu mới.",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                enabled = !codeSent,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth()
            )

            if (codeSent) {
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = otp,
                    onValueChange = { otp = it },
                    label = { Text("Mã OTP") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = newPass,
                    onValueChange = { newPass = it },
                    label = { Text("Mật khẩu mới") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = confirm,
                    onValueChange = { confirm = it },
                    label = { Text("Nhập lại mật khẩu mới") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            info?.let { Text(it, color = Color(0xFF15803D), modifier = Modifier.padding(top = 12.dp)) }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp)) }

            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { if (codeSent) reset() else sendCode() },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    when {
                        loading -> "Đang xử lý..."
                        codeSent -> "Đặt lại mật khẩu"
                        else -> "Gửi mã OTP"
                    }
                )
            }
            if (codeSent) {
                TextButton(onClick = { sendCode() }, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
                    Text("Gửi lại mã")
                }
            }
        }
    }
}
