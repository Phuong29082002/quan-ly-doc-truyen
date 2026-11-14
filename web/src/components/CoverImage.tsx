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

  // Bìa tạm: nền màu theo tên truyện, chữ cái đầu lớn mờ phía sau, tên truyện ở chân bìa
  const color = colorOf(title);
  return (
    <div style={{ backgroundColor: color, backgroundImage: `radial-gradient(120% 80% at 80% 0%, rgb(255 255 255 / 0.16), transparent 60%), linear-gradient(to top, rgb(0 0 0 / 0.35), transparent 55%)` }}
      className={`relative flex flex-col justify-end gap-2 overflow-hidden p-3 pl-4 text-white ${wrap}`}>
      <span aria-hidden className="pointer-events-none absolute -right-2 top-0 font-story text-[7rem] font-bold leading-none text-white/10">{title.trim().slice(0, 1)}</span>
      <span className="relative h-px w-8 bg-lamp" />
      <span className="relative font-story text-sm font-semibold leading-snug">{title}</span>
    </div>
  );
}
