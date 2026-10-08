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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.LoginRequest
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

// PB02: đăng nhập, lưu token
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onSuccess: () -> Unit, onRegister: () -> Unit, onBack: () -> Unit) {
    var login by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun submit() {
        error = null
        if (login.isBlank() || password.isEmpty()) {
            error = "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu"
            return
        }
        scope.launch {
            loading = true
            try {
                val res = ApiClient.api.login(LoginRequest(login.trim(), password))
                SessionManager.save(res)
                onSuccess()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = e.toMessage("Đăng nhập thất bại")
            } finally {
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Đăng nhập") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)
        ) {
            Text("Chào mừng bạn quay lại", fontSize = 22.sp, style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(20.dp))

            OutlinedTextField(
                value = login,
                onValueChange = { login = it },
                label = { Text("Tên đăng nhập hoặc email") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Mật khẩu") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth()
            )

            if (error != null) {
                Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
            }

            Spacer(Modifier.height(20.dp))
            Button(onClick = { submit() }, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
                if (loading) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp)
                else Text("Đăng nhập")
            }
            TextButton(onClick = onRegister, modifier = Modifier.fillMaxWidth()) {
                Text("Chưa có tài khoản? Đăng ký")
            }
        }
    }
}
