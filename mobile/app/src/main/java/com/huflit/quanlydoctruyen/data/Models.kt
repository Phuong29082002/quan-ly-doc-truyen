package com.huflit.quanlydoctruyen.data

// Khớp với DTO bên backend (QuanLyDocTruyen.API/DTOs)

data class HealthResponse(val status: String, val time: String)

data class UserDto(
    val id: Int,
    val username: String,
    val email: String,
    val displayName: String,
    val role: String
)

data class AuthResponse(val token: String, val expiresAt: String, val user: UserDto)

data class LoginRequest(val login: String, val password: String)

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val displayName: String?
)

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
    val viewCount: Long,
    val genres: List<GenreRef>,
    val chapters: List<ChapterListItem>
)

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

fun statusLabel(status: String) = if (status == "Completed") "Hoàn thành" else "Đang ra"
