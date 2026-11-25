package com.huflit.quanlydoctruyen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.ui.AppNavigation
import com.huflit.quanlydoctruyen.ui.components.BiometricGate
import com.huflit.quanlydoctruyen.ui.theme.QuanLyDocTruyenTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SessionManager.init(applicationContext) // đọc lại phiên đăng nhập đã lưu
        enableEdgeToEdge()
        // PB59: mở từ widget "Đang đọc dở" thì vào thẳng chương đó
        val openStoryId = intent?.getIntExtra(ReadingWidget.EXTRA_STORY_ID, 0) ?: 0
        val openChapter = intent?.getIntExtra(ReadingWidget.EXTRA_CHAPTER, 0) ?: 0
        setContent {
            QuanLyDocTruyenTheme {
                // PB53: bật mở khóa bằng vân tay thì phải xác thực trước khi vào app
                BiometricGate { AppNavigation(openStoryId, openChapter) }
            }
        }
    }
}
