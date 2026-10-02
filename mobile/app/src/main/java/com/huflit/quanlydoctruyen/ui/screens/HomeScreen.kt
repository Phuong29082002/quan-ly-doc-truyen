package com.huflit.quanlydoctruyen.ui.screens



import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient

@Composable
fun HomeScreen(onOpenStory: (Int) -> Unit, onLogin: () -> Unit) {
    var status by remember { mutableStateOf("Đang kiểm tra kết nối API...") }

    LaunchedEffect(Unit) {
        status = try {
            "API hoạt động (${ApiClient.api.health().status})"
        } catch (e: Exception) {
            "Không kết nối được API"
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Trang chủ", style = MaterialTheme.typography.headlineMedium)
        Text(status, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(24.dp))
        Button(onClick = { onOpenStory(1) }) { Text("Mở truyện #1") }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onLogin) { Text("Đăng nhập") }
    }
}