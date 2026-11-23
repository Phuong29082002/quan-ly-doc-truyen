import { Link } from "react-router";
import type { StoryListItem } from "../api/types";
import CoverImage from "../components/CoverImage";

// Thẻ "Top 10": số thứ hạng thật lớn chỉ có viền, bìa truyện chồng lên mép số
export default function Top10Card({ rank, story }: { rank: number; story: StoryListItem }) {
  return (
    <Link to={`/truyen/${story.id}`} className="group flex shrink-0 snap-start items-end" aria-label={`Hạng ${rank}: ${story.title}`}>
      <span aria-hidden className={`rank-number select-none text-[7.5rem] sm:text-[10rem] ${rank === 10 ? "-mr-6 tracking-[-0.12em]" : "-mr-4"}`}>{rank}</span>
      <CoverImage src={story.coverUrl} title={story.title} book className="relative aspect-3/4 w-24 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105 sm:w-32" />
    </Link>
  );
}
