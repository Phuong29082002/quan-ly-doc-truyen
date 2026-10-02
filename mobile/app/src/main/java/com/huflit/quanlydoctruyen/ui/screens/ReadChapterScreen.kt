package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ReadChapterScreen(storyId: Int, number: Int, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Truyện #$storyId - Chương $number", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(16.dp))
        Text("Nội dung chương sẽ hiển thị ở đây.")
        TextButton(onClick = onBack) { Text("Quay lại") }
    }
}