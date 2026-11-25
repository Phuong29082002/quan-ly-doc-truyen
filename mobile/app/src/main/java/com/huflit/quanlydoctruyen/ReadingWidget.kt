package com.huflit.quanlydoctruyen

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.huflit.quanlydoctruyen.data.ChapterContent

/**
 * PB59: widget màn hình chính hiện truyện đang đọc dở.
 * Mỗi lần mở một chương, app lưu tên truyện và chương vào SharedPreferences rồi cập nhật widget.
 * Bấm vào widget sẽ mở app và vào thẳng chương đó.
 */
class ReadingWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, buildViews(context)) }
    }

    companion object {
        private const val PREFS = "qldt_widget"
        const val EXTRA_STORY_ID = "open_story_id"
        const val EXTRA_CHAPTER = "open_chapter"

        /** Gọi khi người dùng mở một chương */
        fun saveLastRead(context: Context, chapter: ChapterContent) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putInt("storyId", chapter.storyId)
                .putString("storyTitle", chapter.storyTitle)
                .putInt("chapter", chapter.number)
                .putString("chapterTitle", chapter.title)
                .apply()
            refresh(context)
        }

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, ReadingWidget::class.java))
            ids.forEach { manager.updateAppWidget(it, buildViews(context)) }
        }

        private fun buildViews(context: Context): RemoteViews {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val storyId = prefs.getInt("storyId", 0)
            val chapter = prefs.getInt("chapter", 0)
            val views = RemoteViews(context.packageName, R.layout.widget_reading)

            if (storyId > 0) {
                views.setTextViewText(R.id.widget_title, prefs.getString("storyTitle", "") ?: "")
                views.setTextViewText(
                    R.id.widget_chapter,
                    "Chương $chapter: ${prefs.getString("chapterTitle", "") ?: ""}"
                )
                views.setTextViewText(R.id.widget_action, "Đọc tiếp ›")
            } else {
                views.setTextViewText(R.id.widget_title, "Đọc Truyện")
                views.setTextViewText(R.id.widget_chapter, "Bạn chưa đọc truyện nào")
                views.setTextViewText(R.id.widget_action, "Mở app ›")
            }

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                if (storyId > 0) {
                    putExtra(EXTRA_STORY_ID, storyId)
                    putExtra(EXTRA_CHAPTER, chapter)
                }
            }
            val pending = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pending)
            return views
        }
    }
}
