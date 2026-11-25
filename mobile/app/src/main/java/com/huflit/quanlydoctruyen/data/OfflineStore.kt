package com.huflit.quanlydoctruyen.data

import android.content.Context
import com.google.gson.Gson
import java.io.File

/**
 * PB41: lưu chương truyện vào bộ nhớ máy để đọc khi không có mạng.
 * Mỗi chương là một tệp JSON trong thư mục riêng của app (files/offline), xóa app là mất theo.
 * Ảnh minh họa vẫn lấy từ máy chủ nên khi mất mạng chỉ hiện phần chữ.
 */
object OfflineStore {
    private val gson = Gson()

    private fun dir(context: Context): File = File(context.filesDir, "offline").apply { mkdirs() }

    private fun file(context: Context, storyId: Int, number: Int) = File(dir(context), "s${storyId}_c$number.json")

    fun save(context: Context, chapter: ChapterContent) {
        file(context, chapter.storyId, chapter.number).writeText(gson.toJson(chapter))
    }

    fun has(context: Context, storyId: Int, number: Int): Boolean = file(context, storyId, number).exists()

    fun get(context: Context, storyId: Int, number: Int): ChapterContent? {
        val f = file(context, storyId, number)
        if (!f.exists()) return null
        return runCatching { gson.fromJson(f.readText(), ChapterContent::class.java) }.getOrNull()
    }

    fun remove(context: Context, storyId: Int, number: Int) {
        file(context, storyId, number).delete()
    }

    /** Tất cả chương đã tải, xếp theo tên truyện rồi số chương */
    fun all(context: Context): List<ChapterContent> =
        (dir(context).listFiles() ?: emptyArray())
            .filter { it.name.endsWith(".json") }
            .mapNotNull { runCatching { gson.fromJson(it.readText(), ChapterContent::class.java) }.getOrNull() }
            .sortedWith(compareBy<ChapterContent> { it.storyTitle }.thenBy { it.number })
}
