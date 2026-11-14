import { Link } from "react-router";
import type { Recommendation } from "../api/discovery";
import CoverImage from "./CoverImage";

// PB50: danh sách gợi ý dạng hàng ngang, kèm lý do gợi ý
export default function RecommendationRow({ items }: { items: Recommendation[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ story, reason }) => (
        <li key={story.id}>
          <Link to={`/truyen/${story.id}`} className="group block">
            <CoverImage src={story.coverUrl} title={story.title} book className="aspect-3/4 w-full transition-transform duration-200 group-hover:-translate-y-1" />
            <h3 className="mt-2.5 line-clamp-2 font-story font-semibold leading-snug group-hover:text-blue-700">{story.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-blue-700">{reason}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
