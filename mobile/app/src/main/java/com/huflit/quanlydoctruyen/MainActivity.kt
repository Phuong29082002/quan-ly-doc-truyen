package com.huflit.quanlydoctruyen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.huflit.quanlydoctruyen.ui.AppNavigation
import com.huflit.quanlydoctruyen.ui.theme.QuanLyDocTruyenTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            QuanLyDocTruyenTheme {
                AppNavigation()
            }
        }
    }
}