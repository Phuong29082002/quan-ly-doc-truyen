import { Link } from "react-router";
import type { ReadingItem } from "../api/payments";
import CoverImage from "../components/CoverImage";

// "Đọc tiếp": thẻ nằm ngang có thanh tiến độ ở đáy
export default function ContinueCard({ item }: { item: ReadingItem }) {
  const pct = Math.min(100, (item.chapterNumber / Math.max(1, item.totalChapters)) * 100);
  return (
    <Link to={`/truyen/${item.storyId}/chuong/${item.chapterNumber}`}
      className="group relative flex w-72 shrink-0 snap-start overflow-hidden rounded-md bg-[#1b1f33] ring-1 ring-white/5 transition hover:ring-white/30">
      <CoverImage src={item.coverUrl} title={item.storyTitle} className="h-28 w-20 shrink-0" small />
      <div className="min-w-0 flex-1 p-3">
        <p className="truncate font-story font-semibold text-white">{item.storyTitle}</p>
        <p className="mt-0.5 truncate text-xs text-white/60">Chương {item.chapterNumber}: {item.chapterTitle}</p>
        <p className="mt-1 text-xs text-white/45">{item.chapterNumber}/{item.totalChapters} chương</p>
      </div>
      <span className="absolute inset-0 grid place-items-center bg-black/40 text-3xl text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>▶</span>
      <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
        <span className="block h-full bg-lamp" style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}
