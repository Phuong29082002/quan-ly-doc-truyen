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

// PB04: hồ sơ và đổi mật khẩu
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
    val publishAt: String
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
    val chapters: List<ChapterListItem>
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
