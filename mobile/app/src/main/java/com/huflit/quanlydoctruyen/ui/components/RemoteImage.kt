package com.huflit.quanlydoctruyen.ui.components

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.assetUrl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request

/**
 * Tải ảnh từ API (ảnh bìa, ảnh minh họa trong chương - PB43) bằng OkHttp có sẵn,
 * không cần thêm thư viện. Ảnh đã tải được giữ trong bộ nhớ đệm (LruCache).
 */
object ImageLoader {
    private const val MAX_WIDTH = 1080

    // Tối đa 1/8 bộ nhớ app, tính theo KB
    private val cache = object : LruCache<String, Bitmap>((Runtime.getRuntime().maxMemory() / 1024 / 8).toInt()) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount / 1024
    }

    fun cached(url: String): Bitmap? = cache.get(url)

    suspend fun load(url: String): Bitmap? {
        cache.get(url)?.let { return it }
        return withContext(Dispatchers.IO) {
            runCatching {
                ApiClient.http.newCall(Request.Builder().url(url).build()).execute().use { res ->
                    if (!res.isSuccessful) return@use null
                    val bytes = res.body?.bytes() ?: return@use null
                    decode(bytes)
                }
            }.getOrNull()?.also { cache.put(url, it) }
        }
    }

    // Thu nhỏ ảnh quá lớn để không tốn bộ nhớ
    private fun decode(bytes: ByteArray): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= MAX_WIDTH) sample *= 2
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
    }
}

/**
 * @param path đường dẫn ảnh ("/uploads/...", "/samples/..." hoặc URL đầy đủ)
 * @param keepAspectRatio true = giữ đúng tỉ lệ ảnh (dùng cho ảnh trong chương, chiều rộng full màn hình)
 * @param placeholder hiển thị khi đang tải hoặc không có ảnh
 */
@Composable
fun RemoteImage(
    path: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    keepAspectRatio: Boolean = false,
    placeholder: @Composable BoxScope.() -> Unit = {}
) {
    val url = assetUrl(path)
    val bitmap by produceState(url?.let { ImageLoader.cached(it) }, url) {
        if (url != null && value == null) value = ImageLoader.load(url)
    }

    val b = bitmap
    if (b == null) {
        Box(modifier) { placeholder() }
    } else {
        val m = if (keepAspectRatio && b.height > 0) modifier.aspectRatio(b.width.toFloat() / b.height) else modifier
        Image(bitmap = b.asImageBitmap(), contentDescription = contentDescription, modifier = m, contentScale = contentScale)
    }
}

/** Ảnh bìa truyện; chưa có ảnh thì hiện khung màu kèm tên truyện */
@Composable
fun CoverImage(coverUrl: String?, title: String, modifier: Modifier = Modifier) {
    if (coverUrl.isNullOrBlank()) {
        CoverPlaceholder(title, modifier)
    } else {
        RemoteImage(
            coverUrl, title, modifier.clip(RoundedCornerShape(6.dp)),
            placeholder = { CoverPlaceholder(title, Modifier.matchParentSize()) }
        )
    }
}
