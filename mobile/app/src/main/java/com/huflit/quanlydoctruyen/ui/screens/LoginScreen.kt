package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Đăng nhập", style = MaterialTheme.typography.headlineMedium)
        TextButton(onClick = onBack) { Text("Quay lại") }
    }
}