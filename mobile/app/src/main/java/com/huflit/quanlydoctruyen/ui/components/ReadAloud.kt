package com.huflit.quanlydoctruyen.ui.components

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import java.util.Locale

/**
 * PB48: nghe đọc truyện bằng bộ đọc văn bản (Text-to-Speech) có sẵn trên Android, giọng tiếng Việt.
 * Mỗi đoạn văn là một lượt đọc riêng để biết đang đọc đoạn nào và tô nền đoạn đó.
 */
class ReadAloudController(context: Context) {
    var ready by mutableStateOf(false)
        private set
    var vietnameseMissing by mutableStateOf(false)
        private set
    var playing by mutableStateOf(false)
        private set
    var active by mutableStateOf<Int?>(null)
        private set

    private val main = Handler(Looper.getMainLooper())
    private var paragraphs: List<Pair<Int, String>> = emptyList()
    private var sleepAt: Long? = null

    private val tts: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        main.post {
            if (status == TextToSpeech.SUCCESS) {
                val result = engine().setLanguage(Locale.forLanguageTag("vi-VN"))
                vietnameseMissing = result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED
                ready = true
            }
        }
    }

    private fun engine() = tts

    init {
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                main.post { active = utteranceId?.toIntOrNull() }
            }

            override fun onDone(utteranceId: String?) {
                main.post {
                    val until = sleepAt
                    if (until != null && System.currentTimeMillis() >= until) {
                        stop()
                    } else if (utteranceId?.toIntOrNull() == paragraphs.lastOrNull()?.first) {
                        playing = false
                        active = null
                    }
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                main.post { playing = false }
            }
        })
    }

    /** blocks: (chỉ số khối trong chương, nội dung đoạn văn) */
    fun setContent(blocks: List<Pair<Int, String>>) {
        stop()
        paragraphs = blocks
    }

    fun play(rate: Float) {
        if (!ready || paragraphs.isEmpty()) return
        tts.stop()
        tts.setSpeechRate(rate)
        val start = paragraphs.indexOfFirst { it.first == active }.coerceAtLeast(0)
        paragraphs.drop(start).forEach { (index, text) ->
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, index.toString())
        }
        playing = true
    }

    fun pause() {
        tts.stop()
        playing = false
    }

    fun stop() {
        tts.stop()
        playing = false
        active = null
        sleepAt = null
    }

    /** Hẹn giờ tắt: đọc hết đoạn đang đọc sau khi đủ số phút thì dừng (0 = tắt hẹn giờ) */
    fun setSleepTimer(minutes: Int) {
        sleepAt = if (minutes <= 0) null else System.currentTimeMillis() + minutes * 60_000L
    }

    val sleepMinutesLeft: Int?
        get() = sleepAt?.let { ((it - System.currentTimeMillis()) / 60_000L).toInt().coerceAtLeast(0) }

    fun release() {
        tts.stop()
        tts.shutdown()
    }
}

@Composable
fun rememberReadAloud(): ReadAloudController {
    val context = LocalContext.current
    val controller = remember { ReadAloudController(context) }
    DisposableEffect(controller) {
        onDispose { controller.release() }
    }
    return controller
}
