package com.huflit.quanlydoctruyen.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** PB43: nội dung chương gồm đoạn văn và ảnh. Ảnh nằm trên một dòng riêng: ![mô tả](đường dẫn) – giống bên Web */
sealed interface ContentBlock {
    data class Paragraph(val text: String) : ContentBlock
    data class Picture(val url: String, val alt: String) : ContentBlock
}

private val IMAGE_LINE = Regex("""^!\[([^\]]*)]\(([^)\s]+)\)$""")

fun parseChapterContent(content: String): List<ContentBlock> =
    content.split(Regex("\n+"))
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .map { line ->
            val m = IMAGE_LINE.matchEntire(line)
            if (m != null) ContentBlock.Picture(m.groupValues[2], m.groupValues[1]) else ContentBlock.Paragraph(line)
        }

@Composable
fun ChapterBody(content: String, fontSize: Int) {
    Column {
        parseChapterContent(content).forEach { block ->
            when (block) {
                is ContentBlock.Paragraph -> Text(
                    block.text,
                    fontSize = fontSize.sp,
                    lineHeight = (fontSize * 1.7f).sp,
                    modifier = Modifier.padding(vertical = 8.dp)
                )

                is ContentBlock.Picture -> Column(Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                    RemoteImage(
                        path = block.url,
                        contentDescription = block.alt,
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.FillWidth,
                        keepAspectRatio = true,
                        placeholder = {
                            // Khung xám giữ chỗ trong lúc tải ảnh
                            Column(Modifier.fillMaxWidth().height(200.dp).background(Color(0x22888888))) {}
                        }
                    )
                    if (block.alt.isNotBlank()) {
                        Text(
                            block.alt,
                            fontSize = 13.sp,
                            fontStyle = FontStyle.Italic,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(top = 6.dp).alpha(0.7f)
                        )
                    }
                }
            }
        }
    }
}
