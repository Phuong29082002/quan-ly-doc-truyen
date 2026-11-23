import { assetUrl } from "../api/client";
import { parseChapterContent } from "../utils/chapterContent";

interface Props {
  content: string;
  fontSize?: number;
  dark?: boolean;
  lineHeight?: number;
  serif?: boolean;
  // PB48: đoạn đang được đọc to (chỉ số trong danh sách khối)
  activeBlock?: number | null;
}

// PB43: hiển thị nội dung chương xen kẽ chữ và ảnh minh họa
export default function ChapterContentView({ content, fontSize = 18, dark = false, lineHeight = 1.9, serif = true, activeBlock = null }: Props) {
  const blocks = parseChapterContent(content);

  return (
    <article className={serif ? "font-story" : "font-sans"} style={{ fontSize, lineHeight }}>
      {blocks.map((b, i) =>
        b.type === "image" ? (
          <figure key={i} className="my-6">
            <img
              src={assetUrl(b.url) ?? ""}
              alt={b.alt}
              loading="lazy"
              className={`mx-auto max-h-[70vh] w-auto max-w-full rounded-lg shadow ${dark ? "opacity-90" : ""}`}
            />
            {b.alt && <figcaption className="mt-2 text-center text-sm italic opacity-60">{b.alt}</figcaption>}
          </figure>
        ) : (
          <p key={i} data-block={i}
            className={`mb-[0.9em] rounded transition-colors ${activeBlock === i ? (dark ? "bg-lamp/15" : "bg-lamp-soft") : ""}`}>
            {b.text}
          </p>
        ),
      )}
    </article>
  );
}
