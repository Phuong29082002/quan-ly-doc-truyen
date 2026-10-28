package com.huflit.quanlydoctruyen.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.huflit.quanlydoctruyen.data.assetUrl

/** Ảnh bìa truyện; chưa có ảnh, đang tải hoặc tải lỗi thì hiện khung màu kèm tên truyện */
@Composable
fun CoverImage(url: String?, title: String, modifier: Modifier = Modifier) {
    val full = assetUrl(url)
    if (full == null) {
        CoverPlaceholder(title, modifier)
        return
    }
    SubcomposeAsyncImage(
        model = full,
        contentDescription = title,
        contentScale = ContentScale.Crop,
        loading = { CoverPlaceholder(title, Modifier.fillMaxSize()) },
        error = { CoverPlaceholder(title, Modifier.fillMaxSize()) },
        modifier = modifier.clip(RoundedCornerShape(6.dp))
    )
}

/** PB04: ảnh đại diện tròn; chưa có ảnh thì hiện chữ cái đầu của tên */
@Composable
fun Avatar(url: String?, name: String, size: Dp, modifier: Modifier = Modifier) {
    val full = assetUrl(url)
    val fallback: @Composable () -> Unit = {
        Box(Modifier.fillMaxSize().background(Color(0xFFDBEAFE)), contentAlignment = Alignment.Center) {
            Text(
                text = name.take(1).uppercase(),
                color = Color(0xFF1D4ED8),
                fontWeight = FontWeight.SemiBold,
                fontSize = (size.value / 2.5f).sp
            )
        }
    }
    Box(modifier.size(size).clip(CircleShape)) {
        if (full == null) {
            fallback()
        } else {
            SubcomposeAsyncImage(
                model = full,
                contentDescription = name,
                contentScale = ContentScale.Crop,
                loading = { fallback() },
                error = { fallback() },
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

/** Khung bìa màu kèm tên truyện */
@Composable
fun CoverPlaceholder(title: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF3B82F6), Color(0xFF4338CA)))),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            color = Color.White,
            fontWeight = FontWeight.SemiBold,
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
            maxLines = 4,
            modifier = Modifier.padding(6.dp)
        )
    }
}

@Composable
fun Badge(text: String, background: Color, foreground: Color) {
    Text(
        text = text,
        color = foreground,
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(background)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}

@Composable
fun StatusBadge(status: String) {
    if (status == "Completed") Badge("Hoàn thành", Color(0xFFDCFCE7), Color(0xFF15803D))
    else Badge("Đang ra", Color(0xFFFEF3C7), Color(0xFFB45309))
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

@Composable
fun ErrorBox(message: String, modifier: Modifier = Modifier, onRetry: (() -> Unit)? = null) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(message, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
        if (onRetry != null) {
            Button(onClick = onRetry, modifier = Modifier.padding(top = 12.dp)) { Text("Thử lại") }
        }
    }
}
