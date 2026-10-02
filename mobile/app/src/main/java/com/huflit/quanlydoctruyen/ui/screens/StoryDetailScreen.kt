package com.huflit.quanlydoctruyen.ui.screens



import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun StoryDetailScreen(storyId: Int, onRead: (Int) -> Unit, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Chi tiết truyện #$storyId", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(24.dp))
        Button(onClick = { onRead(1) }) { Text("Đọc chương 1") }
        TextButton(onClick = onBack) { Text("Quay lại") }
    }
}