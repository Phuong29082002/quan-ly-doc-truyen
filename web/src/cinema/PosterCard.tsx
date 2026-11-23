import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import type { StoryListItem } from "../api/types";
import CoverImage from "../components/CoverImage";
import Stars from "../components/Stars";
import { formatNumber } from "../utils/format";

interface Props {
  story: StoryListItem;
  /** Nhãn nhỏ góc trên (ví dụ "Chương mới", "Hoàn thành") */
  badge?: string;
  /** Dòng phụ trong khung xem nhanh (ví dụ lý do gợi ý) */
  note?: string;
  className?: string;
}

const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Bìa truyện trong hàng ngang. Rê chuột 0,4 giây sẽ bật khung xem nhanh phóng to ngay trên bìa
 * (tên, điểm, thể loại, mô tả, nút đọc). Khung được vẽ ra ngoài hàng nên không bị cắt mép.
 */
export default function PosterCard({ story, badge, note, className = "w-32 sm:w-40" }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [preview, setPreview] = useState<DOMRect | null>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function enter() {
    if (!canHover()) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => ref.current && setPreview(ref.current.getBoundingClientRect()), 400);
  }
  function leave() {
    window.clearTimeout(timer.current);
  }

  return (
    <>
      <Link ref={ref} to={`/truyen/${story.id}`} onMouseEnter={enter} onMouseLeave={leave} onFocus={leave}
        className={`group relative block shrink-0 snap-start ${className}`}>
        <CoverImage src={story.coverUrl} title={story.title} book className="aspect-3/4 w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        {badge && <span className="absolute right-1.5 top-1.5 z-10 rounded bg-lamp px-1.5 py-0.5 text-[11px] font-semibold text-ink shadow">{badge}</span>}
        <p className="mt-2 line-clamp-1 text-sm text-gray-700 group-hover:text-gray-900">{story.title}</p>
      </Link>
      {preview && <Preview story={story} rect={preview} note={note} onClose={() => setPreview(null)} />}
    </>
  );
}

function Preview({ story, rect, note, onClose }: { story: StoryListItem; rect: DOMRect; note?: string; onClose: () => void }) {
  const navigate = useNavigate();
  // Khung rộng gấp 1,6 lần bìa, căn giữa đúng vị trí bìa, không tràn khỏi màn hình
  const width = Math.max(260, rect.width * 1.6);
  const cx = Math.min(Math.max(rect.left + rect.width / 2, width / 2 + 12), window.innerWidth - width / 2 - 12);
  const cy = rect.top + rect.height / 2;

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-label={`Xem nhanh ${story.title}`} onMouseLeave={onClose}
      style={{ left: cx, top: cy, width }}
      className="animate-pop fixed z-50 overflow-hidden rounded-lg bg-[#1b1f33] text-white shadow-[0_20px_60px_rgb(0_0_0/0.7)] ring-1 ring-white/10">
      <button onClick={() => navigate(`/truyen/${story.id}`)} className="block w-full text-left" aria-label={`Mở ${story.title}`}>
        <div className="relative h-40 overflow-hidden">
          <CoverImage src={story.coverUrl} title={story.title} className="absolute inset-0 h-full w-full scale-110 object-cover text-7xl text-white/20" small />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1b1f33] via-[#1b1f33]/30 to-transparent" />
          <p className="absolute bottom-2 left-3 right-3 font-story text-lg font-semibold leading-tight">{story.title}</p>
        </div>
      </button>
      <div className="space-y-2 p-3 pt-1 text-sm">
        <div className="flex items-center gap-2">
          <Link to={`/truyen/${story.id}/chuong/1`} className="grid h-9 w-9 place-items-center rounded-full bg-[#fff] text-ink hover:bg-[#ffffffd9]" aria-label="Đọc từ chương 1">▶</Link>
          <Link to={`/truyen/${story.id}`} className="grid h-9 w-9 place-items-center rounded-full border border-white/40 hover:border-white" aria-label="Xem chi tiết">ⓘ</Link>
          <span className="ml-auto text-xs text-white/60">{story.chapterCount} chương</span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-white/70">
          {story.ratingCount ? <span className="flex items-center gap-1 text-white"><Stars value={story.ratingAverage ?? 0} size={12} />{story.ratingAverage?.toFixed(1)}</span> : null}
          <span>{formatNumber(story.viewCount)} lượt đọc</span>
          <span className="rounded border border-white/30 px-1">{story.status === "Completed" ? "Hoàn thành" : "Đang ra"}</span>
          {story.accessType !== "Free" && <span className="rounded bg-lamp/20 px-1 text-lamp">{story.accessType === "Paid" ? "Trả phí" : "Có phí"}</span>}
        </p>
        {story.genres.length > 0 && <p className="text-xs text-white/85">{story.genres.map((g) => g.name).join(" • ")}</p>}
        {note && <p className="text-xs text-blue-400">{note}</p>}
        {story.description && <p className="line-clamp-3 text-xs leading-relaxed text-white/65">{story.description}</p>}
      </div>
    </div>,
    document.body,
  );
}
