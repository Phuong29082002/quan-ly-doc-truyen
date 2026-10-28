package com.huflit.quanlydoctruyen.data

import android.os.Handler
import android.os.Looper
import com.google.gson.JsonParser
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
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

    // PB04
    @PUT("api/auth/me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): UserDto

    @Multipart
    @POST("api/auth/me/avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): UserDto

    @PUT("api/auth/password")
    suspend fun changePassword(@Body body: ChangePasswordRequest)

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
}

object ApiClient {
    // Điện thoại thật qua cáp USB: chạy `adb reverse tcp:5086 tcp:5086` rồi dùng localhost
    // Emulator: đổi thành "http://10.0.2.2:5086/"
    const val BASE_URL = "http://localhost:5086/"

    private val http = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val token = SessionManager.token
            val request = if (token != null) {
                chain.request().newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            val response = chain.proceed(request)
            // Token hết hạn -> đăng xuất
            if (response.code == 401 && token != null) {
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

/** Ảnh bìa API trả về dạng "/uploads/covers/..." -> ghép thêm địa chỉ API */
fun assetUrl(path: String?): String? = when {
    path.isNullOrBlank() -> null
    path.startsWith("http") -> path
    else -> ApiClient.BASE_URL.trimEnd('/') + path
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
