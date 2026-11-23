package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.FollowStatus
import com.huflit.quanlydoctruyen.data.RatingRequest
import com.huflit.quanlydoctruyen.data.RatingSummary
import com.huflit.quanlydoctruyen.data.Recommendation
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.PackageItem
import com.huflit.quanlydoctruyen.data.PaymentStart
import com.huflit.quanlydoctruyen.data.ReadingProgress
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.StoryDetail
import com.huflit.quanlydoctruyen.data.UiState
import com.huflit.quanlydoctruyen.data.formatVnd
import com.huflit.quanlydoctruyen.data.load
import com.huflit.quanlydoctruyen.ui.components.Badge
import com.huflit.quanlydoctruyen.ui.components.CoverImage
import com.huflit.quanlydoctruyen.ui.components.ErrorBox
import com.huflit.quanlydoctruyen.ui.components.PayButton
import com.huflit.quanlydoctruyen.ui.components.LoadingBox
import com.huflit.quanlydoctruyen.ui.components.StatusBadge

// PB13: thông tin truyện + danh sách chương kèm trạng thái truy cập
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoryDetailScreen(
    storyId: Int,
    onRead: (Int) -> Unit,
    onOpenStory: (Int) -> Unit = {},
    onBack: () -> Unit,
    onOpenPackages: () -> Unit,
    onNeedLogin: () -> Unit,
    onPaymentStarted: (PaymentStart) -> Unit
) {
    var retry by remember { mutableIntStateOf(0) }
    // Tải lại khi đăng nhập/đăng xuất để cập nhật nhãn "Đã mở khóa"
    val state by produceState<UiState<StoryDetail>>(UiState.Loading, storyId, retry, SessionManager.user?.id) {
        value = UiState.Loading
        value = load { ApiClient.api.storyDetail(storyId) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text((state as? UiState.Success)?.data?.title ?: "Chi tiết truyện", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        when (val s = state) {
            is UiState.Loading -> LoadingBox(Modifier.padding(padding))
            is UiState.Error -> ErrorBox(s.message, Modifier.padding(padding), onRetry = { retry++ })
            is UiState.Success -> StoryDetailContent(s.data, onRead, onOpenStory, onOpenPackages, onNeedLogin, onPaymentStarted, Modifier.padding(padding))
        }
    }
}

@Composable
private fun StoryDetailContent(
    story: StoryDetail,
    onRead: (Int) -> Unit,
    onOpenStory: (Int) -> Unit,
    onOpenPackages: () -> Unit,
    onNeedLogin: () -> Unit,
    onPaymentStarted: (PaymentStart) -> Unit,
    modifier: Modifier
) {
    val published = story.chapters.filter { it.isPublished }

    // PB26: tiến độ đọc của tôi (đồng bộ với Web) để hiện nút "Đọc tiếp"
    val progress by produceState<ReadingProgress?>(null, story.id, SessionManager.user?.id) {
        value = if (SessionManager.user == null) null
        else runCatching { ApiClient.api.readingProgress(story.id).body() }.getOrNull()
    }

    // PB18: gói đọc đang bán áp dụng cho truyện này (admin đổi trên web thì hiện ở đây)
    val packages by produceState<List<PackageItem>>(emptyList(), story.id) {
        value = runCatching { ApiClient.api.packages() }.getOrDefault(emptyList())
    }
    val applicable = packages.filter { p -> p.scope == "All" || p.stories.any { it.id == story.id } }

    LazyColumn(modifier.fillMaxSize()) {
        item {
            Row(Modifier.padding(16.dp)) {
                CoverImage(story.coverUrl, story.title, Modifier.width(110.dp).height(150.dp))
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(story.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text("Tác giả: ${story.author}", style = MaterialTheme.typography.bodyMedium)
                    Text("Thể loại: ${story.genres.joinToString(", ") { it.name }}", style = MaterialTheme.typography.bodyMedium)
                    Text("Số chương: ${published.size}", style = MaterialTheme.typography.bodyMedium)
                    Text("Lượt đọc: ${story.viewCount}", style = MaterialTheme.typography.bodyMedium)
                    if (story.ratingCount > 0) {
                        Text("Đánh giá: ★ ${"%.1f".format(story.ratingAverage)} (${story.ratingCount} lượt)", style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(Modifier.height(6.dp))
                    StatusBadge(story.status)
                    Spacer(Modifier.height(6.dp))
                    Text(accessLabel(story), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                }
            }
        }

        item {
            Column(Modifier.padding(horizontal = 16.dp)) {
                val p = progress
                if (p != null) {
                    Button(onClick = { onRead(p.chapterNumber) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Đọc tiếp chương ${p.chapterNumber}")
                    }
                }
                if (published.isNotEmpty()) {
                    if (p == null) {
                        Button(onClick = { onRead(published.first().number) }, modifier = Modifier.fillMaxWidth()) {
                            Text("Đọc từ đầu")
                        }
                    } else {
                        OutlinedButton(onClick = { onRead(published.first().number) }, modifier = Modifier.fillMaxWidth()) {
                            Text("Đọc từ đầu")
                        }
                    }
                }
                // PB28: theo dõi; PB49: chấm sao
                FollowAndRating(story.id, onNeedLogin)
                if (!story.description.isNullOrBlank()) {
                    Text(story.description, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 12.dp))
                }
                // PB22: người đọc đã có quyền đọc toàn bộ truyện
                if (story.accessType != "Free" && story.hasFullAccess) {
                    Text(
                        if (story.accessSource == "Purchase") "✓ Bạn đã mua truyện này, đọc được tất cả các chương"
                        else "✓ Gói đọc của bạn còn hạn, đọc được tất cả các chương",
                        color = Color(0xFF1D4ED8),
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
                if (story.accessType != "Free" && !story.hasFullAccess && applicable.isNotEmpty()) {
                    Text(
                        "Gói đọc áp dụng",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                    )
                    applicable.forEach { p ->
                        val scope = if (p.scope == "All") "Tất cả truyện" else "Một số truyện"
                        Text("${p.name}: ${formatVnd(p.price)} / ${p.durationDays} ngày ($scope)", style = MaterialTheme.typography.bodyMedium)
                    }
                }
                // PB21: mua quyền đọc riêng truyện; PB19: đăng ký gói
                if (story.accessType != "Free" && !story.hasFullAccess && story.price > 0) {
                    PayButton(
                        kind = "story",
                        targetId = story.id,
                        itemName = story.title,
                        amount = story.price,
                        label = "Mua truyện · ${formatVnd(story.price)}",
                        onNeedLogin = onNeedLogin,
                        onStarted = onPaymentStarted,
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                    )
                    OutlinedButton(onClick = onOpenPackages, modifier = Modifier.fillMaxWidth()) { Text("Xem gói đọc") }
                }
                Text(
                    "Danh sách chương",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                )
            }
        }

        if (published.isEmpty()) {
            item { Text("Truyện chưa có chương nào", Modifier.padding(16.dp)) }
        }

        // PB50: truyện tương tự (hiện trước danh sách chương để không bị khuất khi truyện dài)
        item { SimilarStories(story.id, onOpenStory) }

        items(published, key = { it.id }) { c ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable { onRead(c.number) }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Chương ${c.number}: ${c.title}", Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                when {
                    c.isFree -> Badge("Miễn phí", Color(0xFFDCFCE7), Color(0xFF15803D))
                    c.canRead -> Badge("Đã mở khóa", Color(0xFFDBEAFE), Color(0xFF1D4ED8))
                    else -> Badge("🔒 Trả phí", Color(0xFFFFEDD5), Color(0xFFC2410C))
                }
            }
            HorizontalDivider(Modifier.padding(horizontal = 16.dp))
        }
    }
}

@Composable
private fun FollowAndRating(storyId: Int, onNeedLogin: () -> Unit) {
    val loggedIn = SessionManager.user != null
    val scope = rememberCoroutineScope()
    var follow by remember(storyId) { mutableStateOf<FollowStatus?>(null) }
    var rating by remember(storyId) { mutableStateOf<RatingSummary?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(storyId, SessionManager.user?.id) {
        follow = runCatching { ApiClient.api.followStatus(storyId) }.getOrNull()
        rating = runCatching { ApiClient.api.rating(storyId) }.getOrNull()
    }

    Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        val following = follow?.isFollowing == true
        OutlinedButton(onClick = {
            if (!loggedIn) onNeedLogin() else scope.launch {
                runCatching { if (following) ApiClient.api.unfollow(storyId) else ApiClient.api.follow(storyId) }
                    .onSuccess { follow = it }
                    .onFailure { error = it.toMessage() }
            }
        }) {
            Text((if (following) "✓ Đang theo dõi" else "+ Theo dõi") + (follow?.let { " · ${it.followerCount}" } ?: ""))
        }
        Spacer(Modifier.width(12.dp))
        // Bấm sao để chấm, bấm lại đúng số sao đang chọn để bỏ đánh giá
        val mine = rating?.myScore ?: 0
        (1..5).forEach { star ->
            Text(
                "★",
                fontSize = 26.sp,
                color = if (star <= mine) Color(0xFFE9B44C) else Color(0xFFCBD5E1),
                modifier = Modifier.clickable {
                    if (!loggedIn) onNeedLogin() else scope.launch {
                        runCatching { if (mine == star) ApiClient.api.removeRating(storyId) else ApiClient.api.rate(storyId, RatingRequest(star)) }
                            .onSuccess { rating = it }
                            .onFailure { error = it.toMessage() }
                    }
                }.padding(horizontal = 2.dp)
            )
        }
    }
    rating?.let {
        Text(
            if (it.count == 0) "Chưa có đánh giá, hãy là người đầu tiên"
            else "Trung bình ${"%.1f".format(it.average)}/5 từ ${it.count} lượt" + (if (it.myScore != null) ", bạn chấm ${it.myScore} sao" else ""),
            style = MaterialTheme.typography.bodySmall
        )
    }
    error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
}

@Composable
private fun SimilarStories(storyId: Int, onOpenStory: (Int) -> Unit) {
    val similar by produceState<List<Recommendation>>(emptyList(), storyId) {
        value = runCatching { ApiClient.api.similar(storyId) }.getOrDefault(emptyList())
    }
    if (similar.isEmpty()) return
    Column(Modifier.padding(vertical = 8.dp)) {
        Text(
            "Có thể bạn cũng thích",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
        )
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(similar, key = { it.story.id }) { r ->
                Column(Modifier.width(100.dp).clickable { onOpenStory(r.story.id) }) {
                    CoverImage(r.story.coverUrl, r.story.title, Modifier.width(100.dp).height(134.dp))
                    Text(r.story.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                    Text(r.reason, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

// PB16, PB17: chính sách truy cập và giá mua truyện
private fun accessLabel(s: StoryDetail): String = when (s.accessType) {
    "Paid" -> "Trả phí · Mua truyện ${formatVnd(s.price)}"
    "Mixed" -> {
        val free = if (s.freeChapterCount > 0) "${s.freeChapterCount} chương đầu miễn phí · " else ""
        "Kết hợp · $free" + "Mua truyện ${formatVnd(s.price)}"
    }
    else -> "Miễn phí"
}
