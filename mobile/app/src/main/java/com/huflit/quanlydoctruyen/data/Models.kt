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
    val avatarUrl: String? = null
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
    val updatedAt: String
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
    val accessSource: String?
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

fun formatVnd(amount: Double): String =
    NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + "đ"

fun statusLabel(status: String) = if (status == "Completed") "Hoàn thành" else "Đang ra"


data class CheckoutRequest(val type: String, val itemId: Int, val simulateSuccess: Boolean = true, val packageMode: String = "Purchase")
data class CheckoutResult(val transactionId: Int, val status: String, val amount: Double, val createdAt: String = "", val paidAt: String? = null, val message: String)
data class ReadingProgressRequest(val storyId: Int, val chapterId: Int, val position: Double = 0.0)
data class ReadingProgressItem(val storyId: Int, val storyTitle: String, val chapterId: Int, val chapterNumber: Int, val chapterTitle: String, val position: Double, val updatedAt: String)

data class PaymentOverview(val transactions: List<PaymentHistoryItem>, val purchasedStories: List<OwnedStoryItem>, val packages: List<ActivePackageItem>)
data class PaymentHistoryItem(val id: Int, val type: String, val itemName: String?, val amount: Double, val status: String, val createdAt: String, val paidAt: String?)
data class OwnedStoryItem(val storyId: Int, val title: String, val price: Double, val purchasedAt: String)
data class ActivePackageItem(val packageId: Int, val packageName: String, val startAt: String, val endAt: String, val isActive: Boolean, val isPaused: Boolean, val remainingDays: Int)
