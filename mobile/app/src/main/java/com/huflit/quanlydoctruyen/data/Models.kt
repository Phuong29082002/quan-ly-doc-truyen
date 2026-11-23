package com.huflit.quanlydoctruyen.data

import java.text.NumberFormat
import java.util.Locale

// Khớp với DTO bên backend (QuanLyDocTruyen.API/DTOs)

data class HealthResponse(val status: String, val time: String)

data class UserDto(
    val id: Int,
    val username: String,
    val email: String,
    val displayName: String,
    val role: String,
    val avatarUrl: String? = null,
    // PB34: Active / Restricted (không bình luận được) / Suspended
    val status: String? = "Active",
    val statusReason: String? = null
)

data class AuthResponse(val token: String, val expiresAt: String, val user: UserDto)

data class LoginRequest(val login: String, val password: String)

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val displayName: String?
)

// PB04
data class UpdateProfileRequest(val displayName: String)

data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)

data class GenreRef(val id: Int, val name: String)

data class Genre(val id: Int, val name: String, val storyCount: Int)

data class PagedResult<T>(
    val items: List<T>,
    val page: Int,
    val pageSize: Int,
    val totalCount: Int,
    val totalPages: Int
)

data class StoryListItem(
    val id: Int,
    val title: String,
    val author: String,
    val coverUrl: String?,
    val status: String,
    val accessType: String,
    val genres: List<GenreRef>,
    val chapterCount: Int,
    val viewCount: Long,
    val createdAt: String,
    val updatedAt: String,
    val latestChapterNumber: Int? = null,
    val latestChapterTitle: String? = null,
    val description: String? = null,
    val ratingAverage: Double = 0.0,
    val ratingCount: Int = 0
)

data class ChapterListItem(
    val id: Int,
    val number: Int,
    val title: String,
    val isFree: Boolean,
    val isPublished: Boolean,
    val publishAt: String,
    /** Người đang xem đọc được (miễn phí, có gói còn hạn hoặc đã mua) */
    val canRead: Boolean
)

data class StoryDetail(
    val id: Int,
    val title: String,
    val author: String,
    val description: String?,
    val coverUrl: String?,
    val status: String,
    val accessType: String,
    val price: Double,
    val freeChapterCount: Int,
    val viewCount: Long,
    val genres: List<GenreRef>,
    val chapters: List<ChapterListItem>,
    /** Có quyền đọc toàn bộ truyện */
    val hasFullAccess: Boolean,
    /** "Package" | "Purchase" | "Admin" | null */
    val accessSource: String?,
    val ratingAverage: Double = 0.0,
    val ratingCount: Int = 0
)

// PB18: gói đọc tháng đang bán (GET /api/packages)
data class PackageStoryRef(val id: Int, val title: String)

data class PackageItem(
    val id: Int,
    val name: String,
    val price: Double,
    val durationDays: Int,
    val scope: String,
    val isActive: Boolean,
    val stories: List<PackageStoryRef>
)

/** PB22: thông tin kèm lỗi 403 khi chương trả phí chưa có quyền đọc */
data class LockInfo(val code: String, val storyTitle: String?, val price: Double?)

data class ChapterContent(
    val id: Int,
    val storyId: Int,
    val storyTitle: String,
    val number: Int,
    val title: String,
    val content: String,
    val prevNumber: Int?,
    val nextNumber: Int?
)

// ---------- Thanh toán (PB19, PB20, PB21, PB23, PB45) ----------

data class PaymentProviders(val mock: Boolean, val vnPay: Boolean, val bankQr: Boolean)

/** Chuyển khoản quét mã VietQR (app ngân hàng / MoMo) */
data class BankQr(
    val transactionId: Int,
    val qrImageUrl: String,
    val bankName: String,
    val accountNo: String,
    val accountName: String,
    val amount: Double,
    val transferContent: String,
    val expiresAt: String,
    val status: String
)

data class PackagePaymentRequest(val packageId: Int, val provider: String)

data class StoryPaymentRequest(val storyId: Int, val provider: String)

/** paymentUrl: link VNPay; null = cổng giả lập */
data class PaymentStart(val transactionId: Int, val provider: String, val paymentUrl: String?)

data class MockResultRequest(val success: Boolean)

data class TransactionDto(
    val id: Int,
    val type: String,
    val status: String,
    val amount: Double,
    val packageId: Int?,
    val packageName: String?,
    val storyId: Int?,
    val storyTitle: String?,
    val createdAt: String,
    val paidAt: String?,
    val isRenewal: Boolean,
    val packageEndAt: String?,
    /** Purchase | Renew | Switch | Restore */
    val packageMode: String? = null
) {
    val itemName: String
        get() = if (type == "Package") {
            val verb = when (packageMode ?: if (isRenewal) "Renew" else "Purchase") {
                "Renew" -> "Gia hạn"
                "Switch" -> "Chuyển sang"
                "Restore" -> "Khôi phục"
                else -> "Đăng ký"
            }
            "$verb gói ${packageName ?: ""}"
        } else "Mua truyện ${storyTitle ?: ""}"
}

fun transactionStatusLabel(status: String) = when (status) {
    "Success" -> "Thành công"
    "Failed" -> "Thất bại"
    else -> "Đang chờ"
}

// ---------- Tủ sách (PB25) ----------

data class MyPackage(
    val id: Int,
    val packageId: Int,
    val packageName: String,
    val scope: String,
    val startAt: String,
    val endAt: String,
    val isActive: Boolean,
    /** Bị tạm dừng khi chuyển gói; remainingDays = số ngày bảo lưu */
    val isPaused: Boolean = false,
    val remainingDays: Int = 0
)

data class MyPurchase(val storyId: Int, val storyTitle: String, val coverUrl: String?, val price: Double, val purchasedAt: String)

data class MyLibrary(val packages: List<MyPackage>, val purchases: List<MyPurchase>)

// ---------- Tiến độ đọc (PB26, PB27) ----------

data class ReadingProgressRequest(val storyId: Int, val chapterNumber: Int, val position: Double)

data class ReadingProgress(
    val storyId: Int,
    val chapterNumber: Int,
    val chapterTitle: String,
    val position: Double,
    val updatedAt: String
)

data class ReadingItem(
    val storyId: Int,
    val storyTitle: String,
    val author: String,
    val coverUrl: String?,
    val chapterNumber: Int,
    val chapterTitle: String,
    val totalChapters: Int,
    val position: Double,
    val updatedAt: String
)

/** "2026-10-28T03:15:00Z" -> "28/10/2026 10:15" theo giờ máy */
fun formatDateTime(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return runCatching {
        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(java.time.ZoneId.systemDefault())
            .format(java.time.Instant.parse(iso))
    }.getOrDefault(iso)
}

fun formatVnd(amount: Double): String =
    NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + "đ"

fun statusLabel(status: String) = if (status == "Completed") "Hoàn thành" else "Đang ra"

// ---------- Sprint 4: theo dõi, thông báo, thảo luận (PB28 - PB31) ----------

data class FollowStatus(val storyId: Int, val isFollowing: Boolean, val followerCount: Int)

data class FollowedStory(
    val storyId: Int,
    val title: String,
    val author: String,
    val coverUrl: String?,
    val status: String,
    val chapterCount: Int,
    val latestChapterNumber: Int?,
    val latestChapterTitle: String?,
    val updatedAt: String,
    val followedAt: String
)

data class AppNotification(
    val id: Int,
    val message: String,
    val storyId: Int?,
    val chapterId: Int?,
    val chapterNumber: Int?,
    val isRead: Boolean,
    val createdAt: String
)

data class UnreadCount(val count: Int)

data class ChapterComment(
    val id: Int,
    val chapterId: Int,
    val userId: Int,
    val displayName: String,
    val avatarUrl: String?,
    val content: String,
    val isHidden: Boolean,
    val createdAt: String,
    val replies: List<ChapterComment> = emptyList()
)

data class CommentRequest(val content: String, val parentId: Int? = null)

data class ReportRequest(val reason: String)

// ---------- Sprint 5: đánh giá, xếp hạng, gợi ý (PB49, PB50) ----------

data class RatingSummary(val storyId: Int, val average: Double, val count: Int, val distribution: List<Int>, val myScore: Int?)

data class RatingRequest(val score: Int)

data class RankingItem(val rank: Int, val story: StoryListItem, val value: Double)

data class Recommendation(val story: StoryListItem, val reason: String)

/** "5 phút trước", "3 giờ trước"... */
fun timeAgo(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    val then = runCatching { java.time.Instant.parse(iso) }.getOrNull()
        ?: runCatching { java.time.LocalDateTime.parse(iso).toInstant(java.time.ZoneOffset.UTC) }.getOrNull()
        ?: return ""
    val seconds = java.time.Duration.between(then, java.time.Instant.now()).seconds
    return when {
        seconds < 60 -> "vừa xong"
        seconds < 3600 -> "${seconds / 60} phút trước"
        seconds < 86400 -> "${seconds / 3600} giờ trước"
        seconds < 86400 * 30 -> "${seconds / 86400} ngày trước"
        else -> formatDateTime(iso)
    }
}
