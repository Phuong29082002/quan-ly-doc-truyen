package com.huflit.quanlydoctruyen.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.ChapterComment
import com.huflit.quanlydoctruyen.data.CommentRequest
import com.huflit.quanlydoctruyen.data.ReportRequest
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.timeAgo
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch

private val REPORT_REASONS = listOf("Spam, quảng cáo", "Ngôn từ xúc phạm", "Tiết lộ nội dung (spoil)", "Nội dung không phù hợp")

/** PB30, PB31: thảo luận theo chương, trả lời một cấp, báo cáo vi phạm */
@Composable
fun CommentsSection(chapterId: Int, onLogin: () -> Unit) {
    val user = SessionManager.user
    val scope = rememberCoroutineScope()
    var reload by remember { mutableIntStateOf(0) }
    var comments by remember(chapterId) { mutableStateOf<List<ChapterComment>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var notice by remember { mutableStateOf<String?>(null) }
    var replyTo by remember { mutableStateOf<ChapterComment?>(null) }
    var reporting by remember { mutableStateOf<ChapterComment?>(null) }

    LaunchedEffect(chapterId, reload) {
        runCatching { ApiClient.api.comments(chapterId) }
            .onSuccess { comments = it; error = null }
            .onFailure { error = it.toMessage("Không tải được bình luận") }
    }

    val total = comments?.sumOf { 1 + it.replies.size } ?: 0

    Column(Modifier.fillMaxWidth().padding(top = 24.dp)) {
        HorizontalDivider()
        Text("Bình luận ($total)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(vertical = 12.dp))

        when {
            user == null -> TextButton(onClick = onLogin) { Text("Đăng nhập để bình luận") }
            user.status == "Restricted" -> Text(
                "Tài khoản đang bị hạn chế nên không thể bình luận." + (user.statusReason?.let { " Lý do: $it" } ?: ""),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
            else -> CommentInput(
                placeholder = replyTo?.let { "Trả lời ${it.displayName}" } ?: "Bạn nghĩ gì về chương này?",
                onCancel = replyTo?.let { { replyTo = null } },
                onSend = { text ->
                    scope.launch {
                        runCatching { ApiClient.api.postComment(chapterId, CommentRequest(text, replyTo?.id)) }
                            .onSuccess { replyTo = null; reload++ }
                            .onFailure { notice = it.toMessage("Không gửi được bình luận") }
                    }
                }
            )
        }

        notice?.let { Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall) }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        if (comments?.isEmpty() == true) Text("Chưa có bình luận nào.", modifier = Modifier.alpha(0.6f).padding(vertical = 8.dp))

        comments?.forEach { c ->
            CommentItem(c, canReply = user != null && user.status != "Restricted", onReply = { replyTo = c },
                onReport = { reporting = c }, onDelete = {
                    scope.launch { runCatching { ApiClient.api.deleteComment(c.id) }; reload++ }
                })
            c.replies.forEach { r ->
                Row {
                    Spacer(Modifier.width(36.dp))
                    CommentItem(r, canReply = false, onReply = {}, onReport = { reporting = r }, onDelete = {
                        scope.launch { runCatching { ApiClient.api.deleteComment(r.id) }; reload++ }
                    })
                }
            }
        }
    }

    reporting?.let { target ->
        AlertDialog(
            onDismissRequest = { reporting = null },
            title = { Text("Báo cáo bình luận") },
            text = {
                Column {
                    REPORT_REASONS.forEach { reason ->
                        TextButton(onClick = {
                            reporting = null
                            scope.launch {
                                runCatching { ApiClient.api.reportComment(target.id, ReportRequest(reason)) }
                                    .onSuccess { notice = "Đã gửi báo cáo, quản trị viên sẽ xem xét." }
                                    .onFailure { notice = it.toMessage("Không gửi được báo cáo") }
                            }
                        }) { Text(reason) }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { reporting = null }) { Text("Hủy") } }
        )
    }
}

@Composable
private fun CommentInput(placeholder: String, onCancel: (() -> Unit)?, onSend: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    OutlinedTextField(
        value = text,
        onValueChange = { if (it.length <= 1000) text = it },
        placeholder = { Text(placeholder) },
        minLines = 2,
        modifier = Modifier.fillMaxWidth()
    )
    Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
        Text("${text.length}/1000", style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f).alpha(0.6f))
        if (onCancel != null) TextButton(onClick = onCancel) { Text("Hủy") }
        Button(onClick = { onSend(text.trim()); text = "" }, enabled = text.isNotBlank()) { Text(if (onCancel != null) "Trả lời" else "Gửi") }
    }
}

@Composable
private fun CommentItem(c: ChapterComment, canReply: Boolean, onReply: () -> Unit, onReport: () -> Unit, onDelete: () -> Unit) {
    val me = SessionManager.user
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Avatar(c.avatarUrl, c.displayName, 30.dp)
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(c.displayName, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                Text("  ${timeAgo(c.createdAt)}", style = MaterialTheme.typography.labelSmall, modifier = Modifier.alpha(0.6f))
            }
            if (c.isHidden && c.content.isBlank()) {
                Text("Bình luận đã bị ẩn do vi phạm quy định.", fontStyle = FontStyle.Italic, modifier = Modifier.alpha(0.6f))
            } else {
                Text(c.content, style = MaterialTheme.typography.bodyMedium)
            }
            Row {
                if (canReply) TextButton(onClick = onReply) { Text("Trả lời") }
                if (me != null && me.id != c.userId && !c.isHidden) TextButton(onClick = onReport) { Text("Báo cáo") }
                if (me != null && me.id == c.userId) TextButton(onClick = onDelete) { Text("Xóa", color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}
