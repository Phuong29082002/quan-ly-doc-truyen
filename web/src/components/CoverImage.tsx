import { assetUrl } from "../api/client";

interface Props {
  src: string | null | undefined;
  title: string;
  className?: string;
  /** Hiện dạng cuốn sách (gáy sách + bóng) */
  book?: boolean;
  /** Ảnh nhỏ trong danh sách: bìa tạm chỉ hiện chữ cái đầu */
  small?: boolean;
}

// Màu bìa tạm (chưa có ảnh) chọn theo tên truyện để mỗi truyện một màu
const PLACEHOLDER = ["#2b3359", "#0f6259", "#5b3a6e", "#7a4b1e", "#304f6e", "#5e2f3b"];

function colorOf(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PLACEHOLDER[h % PLACEHOLDER.length];
}

// Ảnh bìa; chưa có ảnh thì hiện bìa màu kèm tên truyện
export default function CoverImage({ src, title, className = "", book = false, small = false }: Props) {
  const url = assetUrl(src);
  const wrap = `${book ? "book" : ""} ${className}`;
  if (url) return <img src={url} alt={title} loading="lazy" className={`object-cover ${wrap}`} />;

  if (small) {
    return (
      <div aria-hidden style={{ backgroundColor: colorOf(title) }} className={`grid place-items-center font-story font-semibold text-white/90 ${wrap}`}>
        {title.trim().slice(0, 1)}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colorOf(title) }}
      className={`flex flex-col justify-end gap-2 p-3 pl-4 text-white ${wrap}`}>
      <span className="h-px w-8 bg-lamp" />
      <span className="font-story text-sm font-semibold leading-snug">{title}</span>
    </div>
  );
}
