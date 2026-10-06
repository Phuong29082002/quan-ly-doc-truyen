package com.huflit.quanlydoctruyen.data

import android.os.Handler
import android.os.Looper
import com.google.gson.JsonParser
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
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
}

object ApiClient {
    // 10.0.2.2 = localhost của máy tính khi chạy trên emulator
    // Chạy trên điện thoại thật: đổi thành IP máy tính, ví dụ "http://192.168.1.5:5086/"
    private const val BASE_URL = "http://10.0.2.2:5086/"

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

fun Throwable.httpCode(): Int? = (this as? HttpException)?.code()

/** Đọc câu lỗi trong ProblemDetails của API ("title" hoặc lỗi validate đầu tiên) */
fun Throwable.toMessage(fallback: String = "Đã có lỗi xảy ra"): String = when (this) {
    is HttpException -> {
        val body = runCatching { response()?.errorBody()?.string() }.getOrNull()
        val parsed = runCatching {
            val json = JsonParser.parseString(body).asJsonObject
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
