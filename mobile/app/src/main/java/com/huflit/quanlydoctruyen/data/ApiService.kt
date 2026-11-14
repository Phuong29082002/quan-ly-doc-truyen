package com.huflit.quanlydoctruyen.data

import android.os.Build
import android.os.Handler
import android.os.Looper
import com.google.gson.JsonParser
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.Part
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import java.io.IOException

interface ApiService {
    @GET("api/health")
    suspend fun health(): HealthResponse

    // PB01, PB02
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @GET("api/auth/me")
    suspend fun me(): UserDto

    // PB04: cập nhật hồ sơ, đổi mật khẩu (API trả 204 nên dùng Response<Unit>)
    @PUT("api/auth/me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): UserDto

    // PB04: ảnh đại diện (multipart, field "file")
    @Multipart
    @POST("api/auth/me/avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): UserDto

    @POST("api/auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): Response<Unit>

    // PB05
    @GET("api/genres")
    suspend fun genres(): List<Genre>

    // PB11, PB12
    @GET("api/stories")
    suspend fun searchStories(
        @Query("keyword") keyword: String? = null,
        @Query("genreId") genreId: Int? = null,
        @Query("sort") sort: String = "updated",
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 10
    ): PagedResult<StoryListItem>

    // PB13
    @GET("api/stories/{id}")
    suspend fun storyDetail(@Path("id") id: Int): StoryDetail

    // PB14
    @GET("api/stories/{storyId}/chapters/{number}")
    suspend fun readChapter(@Path("storyId") storyId: Int, @Path("number") number: Int): ChapterContent

    // PB18: gói đọc đang bán
    @GET("api/packages")
    suspend fun packages(): List<PackageItem>

    // PB19, PB20, PB21, PB45: thanh toán
    @GET("api/payments/providers")
    suspend fun paymentProviders(): PaymentProviders

    @POST("api/payments/package")
    suspend fun payPackage(@Body body: PackagePaymentRequest): PaymentStart

    @POST("api/payments/package/{packageId}/restore")
    suspend fun restorePackage(@Path("packageId") packageId: Int): TransactionDto

    @POST("api/payments/story")
    suspend fun payStory(@Body body: StoryPaymentRequest): PaymentStart

    @POST("api/payments/{id}/mock-result")
    suspend fun mockResult(@Path("id") id: Int, @Body body: MockResultRequest): TransactionDto

    @GET("api/payments/{id}")
    suspend fun payment(@Path("id") id: Int): TransactionDto

    @GET("api/payments/{id}/bank-qr")
    suspend fun bankQr(@Path("id") id: Int): BankQr

    // PB25: lịch sử thanh toán, gói và truyện đã mua
    @GET("api/me/transactions")
    suspend fun myTransactions(): List<TransactionDto>

    @GET("api/me/library")
    suspend fun myLibrary(): MyLibrary

    // PB26, PB27: tiến độ đọc (API trả 204 khi chưa đọc truyện nên dùng Response)
    @GET("api/me/reading")
    suspend fun readingList(): List<ReadingItem>

    @GET("api/me/reading/{storyId}")
    suspend fun readingProgress(@Path("storyId") storyId: Int): Response<ReadingProgress>

    @PUT("api/me/reading")
    suspend fun saveProgress(@Body body: ReadingProgressRequest): ReadingProgress

    @DELETE("api/me/reading/{storyId}")
    suspend fun removeReading(@Path("storyId") storyId: Int): Response<Unit>
}

object ApiClient {
    // Emulator gọi máy tính qua 10.0.2.2; điện thoại thật cắm cáp USB thì chạy
    // `adb reverse tcp:5086 tcp:5086` và dùng localhost. App tự nhận biết đang chạy trên máy ảo hay máy thật.
    val BASE_URL: String = if (isEmulator()) "http://10.0.2.2:5086/" else "http://localhost:5086/"

    private fun isEmulator(): Boolean =
        Build.FINGERPRINT.startsWith("generic") || Build.FINGERPRINT.contains("emulator") ||
            Build.HARDWARE.contains("ranchu") || Build.HARDWARE.contains("goldfish") ||
            Build.MODEL.contains("sdk_gphone") || Build.MODEL.contains("Emulator") ||
            Build.PRODUCT.contains("sdk")

    private val apiHost: String = java.net.URI(BASE_URL).host

    /** Dùng chung cho Retrofit và tải ảnh (RemoteImage) */
    val http: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val token = SessionManager.token
            // Chỉ gắn token khi gọi API của mình (không gửi token sang máy chủ khác, ví dụ ảnh mã QR)
            val request = if (token != null && chain.request().url.host == apiHost) {
                chain.request().newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            val response = chain.proceed(request)
            // Token hết hạn -> đăng xuất
            if (response.code == 401 && token != null && chain.request().url.host == apiHost) {
                Handler(Looper.getMainLooper()).post { SessionManager.logout() }
            }
            response
        }
        .build()

    val api: ApiService = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(http)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)
}

/** Ảnh trên server ("/uploads/..", "/samples/..") -> URL đầy đủ */
fun assetUrl(path: String?): String? {
    if (path.isNullOrBlank()) return null
    return if (path.startsWith("http")) path else ApiClient.BASE_URL.trimEnd('/') + path
}

fun Throwable.httpCode(): Int? = (this as? HttpException)?.code()

/** Đọc câu lỗi trong ProblemDetails của API ("title" hoặc lỗi validate đầu tiên) */
fun Throwable.toMessage(
    fallback: String = "Đã có lỗi xảy ra",
    errorBody: String? = (this as? HttpException)?.let { runCatching { it.response()?.errorBody()?.string() }.getOrNull() }
): String = when (this) {
    is HttpException -> {
        val parsed = runCatching {
            val json = JsonParser.parseString(errorBody).asJsonObject
            val errors = json.getAsJsonObject("errors")
            val firstError = errors?.entrySet()?.firstOrNull()?.value?.asJsonArray?.firstOrNull()?.asString
            firstError ?: json.get("title")?.asString
        }.getOrNull()
        parsed ?: when (code()) {
            401 -> "Bạn cần đăng nhập"
            403 -> "Bạn không có quyền truy cập"
            404 -> "Không tìm thấy dữ liệu"
            else -> fallback
        }
    }
    is IOException -> "Không kết nối được máy chủ ($message)"
    else -> fallback
}

/** PB22: đọc code/price/storyTitle mà API gắn vào lỗi 403 của chương trả phí */
fun parseLockInfo(errorBody: String?): LockInfo? = runCatching {
    val json = JsonParser.parseString(errorBody).asJsonObject
    val code = json.get("code")?.takeUnless { it.isJsonNull }?.asString
    if (code != "LoginRequired" && code != "PurchaseRequired") {
        null
    } else {
        LockInfo(
            code,
            json.get("storyTitle")?.takeUnless { it.isJsonNull }?.asString,
            json.get("price")?.takeUnless { it.isJsonNull }?.asDouble
        )
    }
}.getOrNull()
