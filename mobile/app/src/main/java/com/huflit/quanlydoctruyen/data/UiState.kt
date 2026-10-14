package com.huflit.quanlydoctruyen.data

import retrofit2.HttpException
import kotlin.coroutines.cancellation.CancellationException

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String, val code: Int? = null, val lock: LockInfo? = null) : UiState<Nothing>
}

/** Gọi API và gói kết quả thành UiState (không nuốt lỗi hủy coroutine) */
suspend fun <T> load(block: suspend () -> T): UiState<T> =
    try {
        UiState.Success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        // Đọc body lỗi đúng một lần để lấy cả câu thông báo lẫn thông tin khóa chương (PB22)
        val body = (e as? HttpException)?.let { runCatching { it.response()?.errorBody()?.string() }.getOrNull() }
        UiState.Error(e.toMessage(errorBody = body), e.httpCode(), parseLockInfo(body))
    }
