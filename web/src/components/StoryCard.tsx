import { Link } from "react-router";
import type { StoryListItem } from "../api/types";
import { formatNumber } from "../utils/format";
import CoverImage from "./CoverImage";
import Stars from "./Stars";

// Thẻ truyện dạng bìa sách: tên truyện, tác giả, số chương, nhãn trả phí / hoàn thành
export default function StoryCard({ story, rank, note }: { story: StoryListItem; rank?: number; note?: string }) {
  return (
    <Link to={`/truyen/${story.id}`} className="group block">
      <div className="relative">
        <CoverImage src={story.coverUrl} title={story.title} book className="aspect-3/4 w-full transition-transform duration-200 group-hover:-translate-y-1" />
        {rank !== undefined && (
          <span className={`absolute -left-1 -top-1 z-20 grid h-8 w-8 place-items-center rounded-full font-story text-base font-bold shadow ${rank <= 3 ? "bg-lamp text-ink" : "bg-white text-gray-700"}`}>{rank}</span>
        )}
        <div className={`absolute top-2 z-10 flex flex-col items-start gap-1 ${rank !== undefined ? "left-9" : "left-2"}`}>
          {story.accessType !== "Free" && (
            <span className="rounded bg-lamp px-1.5 py-0.5 text-[11px] font-semibold text-ink">{story.accessType === "Paid" ? "Trả phí" : "Có phí"}</span>
          )}
          {story.status === "Completed" && (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">Hoàn thành</span>
          )}
        </div>
      </div>
      <h3 className="mt-2.5 line-clamp-2 font-story font-semibold leading-snug text-gray-900 group-hover:text-blue-700">{story.title}</h3>
      <p className="mt-0.5 truncate text-xs text-gray-500">{story.author}</p>
      <p className="mt-0.5 text-xs text-gray-500">{story.chapterCount} chương, {formatNumber(story.viewCount)} lượt đọc</p>
      {note && <p className="mt-0.5 line-clamp-2 text-xs text-blue-700">{note}</p>}
      {story.ratingCount ? (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500"><Stars value={story.ratingAverage ?? 0} size={12} /> {story.ratingAverage?.toFixed(1)}</p>
      ) : null}
    </Link>
  );
}
