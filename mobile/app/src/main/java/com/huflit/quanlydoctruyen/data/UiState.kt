package com.huflit.quanlydoctruyen.data

import kotlin.coroutines.cancellation.CancellationException

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String, val code: Int? = null) : UiState<Nothing>
}

/** Gọi API và gói kết quả thành UiState (không nuốt lỗi hủy coroutine) */
suspend fun <T> load(block: suspend () -> T): UiState<T> =
    try {
        UiState.Success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        UiState.Error(e.toMessage(), e.httpCode())
    }
