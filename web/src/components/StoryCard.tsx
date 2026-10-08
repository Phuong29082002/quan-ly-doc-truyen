import { Link } from "react-router";
import type { StoryListItem } from "../api/types";
import { timeAgo } from "../utils/format";
import CoverImage from "./CoverImage";
import StatusBadge from "./StatusBadge";

export default function StoryCard({ story }: { story: StoryListItem }) {
  return (
    <Link to={`/truyen/${story.id}`} className="group block rounded-lg border bg-white overflow-hidden hover:shadow-md transition">
      <CoverImage src={story.coverUrl} title={story.title} className="aspect-3/4 w-full" />
      <div className="p-3">
        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-blue-600">{story.title}</h3>
        <p className="mt-1 text-xs text-gray-500">{story.author}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <StatusBadge status={story.status} />
          <span>{story.chapterCount} chương</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">Cập nhật {timeAgo(story.updatedAt)}</p>
      </div>
    </Link>
  );
}
