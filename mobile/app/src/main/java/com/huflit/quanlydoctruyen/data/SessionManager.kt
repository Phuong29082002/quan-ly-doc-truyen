package com.huflit.quanlydoctruyen.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.google.gson.Gson
import java.time.Instant

/**
 * Lưu phiên đăng nhập (PB02) và cài đặt đọc truyện vào SharedPreferences.
 * `user` là state của Compose nên giao diện tự cập nhật khi đăng nhập/đăng xuất.
 */
object SessionManager {
    private const val PREFS = "qldt_session"
    private const val KEY_TOKEN = "token"
    private const val KEY_USER = "user"
    private const val KEY_EXPIRES = "expiresAt"
    private const val KEY_FONT = "reader_font"
    private const val KEY_DARK = "reader_dark"
    private const val KEY_THEME = "reader_theme"
    private const val KEY_LINE = "reader_line_height"
    private const val KEY_RATE = "reader_tts_rate"
    private const val KEY_BIOMETRIC = "biometric_enabled"

    private lateinit var prefs: SharedPreferences
    private val gson = Gson()

    var user by mutableStateOf<UserDto?>(null)
        private set

    var token: String? = null
        private set

    val isAdmin: Boolean get() = user?.role == "Admin"

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val savedToken = prefs.getString(KEY_TOKEN, null)
        val savedUser = prefs.getString(KEY_USER, null)
        val expires = prefs.getString(KEY_EXPIRES, null)

        val saved = savedUser?.let { runCatching { gson.fromJson(it, UserDto::class.java) }.getOrNull() }
        // App chỉ dành cho độc giả: phiên Admin cũ (nếu có) bị xóa
        if (savedToken != null && saved != null && saved.role != "Admin" && expires != null && !isExpired(expires)) {
            token = savedToken
            user = saved
        } else {
            logout()
        }
    }

    fun save(res: AuthResponse) {
        prefs.edit()
            .putString(KEY_TOKEN, res.token)
            .putString(KEY_USER, gson.toJson(res.user))
            .putString(KEY_EXPIRES, res.expiresAt)
            .apply()
        token = res.token
        user = res.user
    }

    /** PB04: cập nhật thông tin sau khi đổi tên hiển thị */
    fun updateUser(updated: UserDto) {
        prefs.edit().putString(KEY_USER, gson.toJson(updated)).apply()
        user = updated
    }

    fun logout() {
        prefs.edit().remove(KEY_TOKEN).remove(KEY_USER).remove(KEY_EXPIRES).apply()
        token = null
        user = null
    }

    var readerFontSize: Int
        get() = prefs.getInt(KEY_FONT, 18)
        set(value) = prefs.edit().putInt(KEY_FONT, value).apply()

    var readerDarkMode: Boolean
        get() = prefs.getBoolean(KEY_DARK, false)
        set(value) = prefs.edit().putBoolean(KEY_DARK, value).apply()

    /** PB48: "light", "sepia" hoặc "dark" (bản cũ chỉ lưu bật/tắt nền tối) */
    var readerTheme: String
        get() = prefs.getString(KEY_THEME, null) ?: if (readerDarkMode) "dark" else "light"
        set(value) = prefs.edit().putString(KEY_THEME, value).apply()

    var readerLineHeight: Float
        get() = prefs.getFloat(KEY_LINE, 1.7f)
        set(value) = prefs.edit().putFloat(KEY_LINE, value).apply()

    var readerSpeechRate: Float
        get() = prefs.getFloat(KEY_RATE, 1.0f)
        set(value) = prefs.edit().putFloat(KEY_RATE, value).apply()

    /** PB53: mở app phải xác thực vân tay (chỉ khi đang đăng nhập) */
    var biometricEnabled: Boolean
        get() = prefs.getBoolean(KEY_BIOMETRIC, false)
        set(value) = prefs.edit().putBoolean(KEY_BIOMETRIC, value).apply()

    private fun isExpired(iso: String): Boolean =
        runCatching { Instant.parse(iso).isBefore(Instant.now()) }.getOrDefault(true)
}
