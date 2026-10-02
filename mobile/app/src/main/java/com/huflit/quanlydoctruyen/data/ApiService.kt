package com.huflit.quanlydoctruyen.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET

data class HealthResponse(val status: String, val time: String)

interface ApiService {
    @GET("api/health")
    suspend fun health(): HealthResponse
}

object ApiClient {
    // 10.0.2.2 = localhost của máy tính khi chạy trên emulator
    private const val BASE_URL = "http://10.0.2.2:5086/"

    val api: ApiService = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)
}