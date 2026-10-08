package com.huflit.quanlydoctruyen.ui.screens

import android.util.Patterns
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
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.RegisterRequest
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

private val USERNAME_REGEX = Regex("^[a-zA-Z0-9_.]+$")

// PB01: đăng ký tài khoản thành viên
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(onSuccess: () -> Unit, onBack: () -> Unit) {
    var username by rememberSaveable { mutableStateOf("") }
    var displayName by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirm by rememberSaveable { mutableStateOf("") }

    var errors by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var serverError by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Kiểm tra giống bên backend
    fun validate(): Map<String, String> = buildMap {
        val u = username.trim()
        when {
            u.isEmpty() -> put("username", "Vui lòng nhập tên đăng nhập")
            u.length !in 3..50 -> put("username", "Tên đăng nhập từ 3 đến 50 ký tự")
            !USERNAME_REGEX.matches(u) -> put("username", "Chỉ gồm chữ không dấu, số, dấu _ và .")
        }
        when {
            email.isBlank() -> put("email", "Vui lòng nhập email")
            !Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() -> put("email", "Email không hợp lệ")
        }
        when {
            password.isEmpty() -> put("password", "Vui lòng nhập mật khẩu")
            password.length < 6 -> put("password", "Mật khẩu tối thiểu 6 ký tự")
        }
        if (confirm != password) put("confirm", "Mật khẩu nhập lại không khớp")
    }

    fun submit() {
        serverError = null
        errors = validate()
        if (errors.isNotEmpty()) return

        scope.launch {
            loading = true
            try {
                val res = ApiClient.api.register(
                    RegisterRequest(username.trim(), email.trim(), password, displayName.trim().ifBlank { null })
                )
                SessionManager.save(res)
                onSuccess()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                serverError = e.toMessage("Đăng ký thất bại")
            } finally {
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Đăng ký") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)
        ) {
            Field("Tên đăng nhập", username, { username = it }, errors["username"])
            Field("Tên hiển thị (không bắt buộc)", displayName, { displayName = it }, null)
            Field("Email", email, { email = it }, errors["email"], keyboardType = KeyboardType.Email)
            Field("Mật khẩu", password, { password = it }, errors["password"], isPassword = true)
            Field("Nhập lại mật khẩu", confirm, { confirm = it }, errors["confirm"], isPassword = true)

            if (serverError != null) {
                Text(serverError!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 4.dp))
            }

            Spacer(Modifier.height(16.dp))
            Button(onClick = { submit() }, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
                if (loading) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp)
                else Text("Đăng ký")
            }
        }
    }
}

@Composable
private fun Field(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    error: String?,
    isPassword: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        isError = error != null,
        supportingText = { if (error != null) Text(error) },
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = if (isPassword) KeyboardType.Password else keyboardType),
        modifier = Modifier.fillMaxWidth()
    )
}
