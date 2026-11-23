import { useEffect, useState } from "react";
import { Link } from "react-router";
import { assetUrl } from "../api/client";
import type { StoryListItem } from "../api/types";
import CoverImage from "../components/CoverImage";
import { colorOf } from "../utils/coverColor";
import Stars from "../components/Stars";
import { formatNumber } from "../utils/format";

const DURATION = 8000;

/**
 * Khung truyện đề cử tràn màn hình: nền là ảnh bìa phóng to làm mờ (hoặc quầng màu khi chưa có bìa),
 * tự chuyển truyện sau 8 giây, có thanh chạy thời gian; rê chuột vào thì dừng chuyển.
 */
export default function Billboard({ stories }: { stories: StoryListItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const story = stories[index] ?? stories[0];

  useEffect(() => {
    if (paused || stories.length < 2) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % stories.length), DURATION);
    return () => window.clearTimeout(t);
  }, [index, paused, stories.length]);

  if (!story) return null;
  const cover = assetUrl(story.coverUrl);

  return (
    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="relative left-1/2 -mt-[5.5rem] mb-2 w-screen -translate-x-1/2 overflow-hidden"
      aria-roledescription="carousel" aria-label="Truyện đề cử">
      {/* Nền đổi theo truyện: dùng key để chạy lại hiệu ứng mỗi lần chuyển */}
      <div key={story.id} className="animate-billboard absolute inset-0">
        {cover ? (
          <img src={cover} alt="" aria-hidden className="h-full w-full scale-110 object-cover opacity-45 blur-xl" />
        ) : (
          <div className="h-full w-full" style={{ background: `radial-gradient(60% 80% at 75% 35%, ${colorOf(story.title)}, transparent 70%)` }} />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f1220] via-[#0f1220]/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0f1220] to-transparent" />

      <div className="relative mx-auto grid min-h-[34rem] max-w-6xl items-center gap-8 px-4 pb-20 pt-28 md:min-h-[38rem] md:grid-cols-[1fr_280px]">
        <div key={`text-${story.id}`} className="animate-rise max-w-xl text-white">
          <p className="text-sm font-medium tracking-wide text-lamp">Truyện đề cử {index + 1}/{stories.length}</p>
          <h1 className="mt-2 font-story text-4xl font-bold leading-[1.05] drop-shadow-lg md:text-6xl">{story.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
            {story.ratingCount ? <span className="flex items-center gap-1 text-white"><Stars value={story.ratingAverage ?? 0} size={14} /> {story.ratingAverage?.toFixed(1)}</span> : null}
            <span>{story.author}</span>
            <span>{story.chapterCount} chương</span>
            <span>{formatNumber(story.viewCount)} lượt đọc</span>
            <span className="rounded border border-white/40 px-1.5 text-xs">{story.status === "Completed" ? "Hoàn thành" : "Đang ra"}</span>
          </p>
          {story.genres.length > 0 && <p className="mt-2 text-sm text-white/70">{story.genres.map((g) => g.name).join(" • ")}</p>}
          {story.description && <p className="mt-4 line-clamp-3 font-story text-lg leading-relaxed text-white/90">{story.description}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/truyen/${story.id}/chuong/1`} className="flex items-center gap-2 rounded-md bg-[#fff] px-6 py-2.5 font-semibold text-ink transition hover:bg-[#ffffffcc]">
              <span aria-hidden>▶</span> Đọc ngay
            </Link>
            <Link to={`/truyen/${story.id}`} className="flex items-center gap-2 rounded-md bg-white/20 px-6 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/30">
              <span aria-hidden>ⓘ</span> Chi tiết
            </Link>
          </div>
        </div>
        <Link key={`cover-${story.id}`} to={`/truyen/${story.id}`} className="animate-rise hidden justify-self-end md:block" style={{ animationDelay: "120ms" }}>
          <CoverImage src={story.coverUrl} title={story.title} book className="aspect-3/4 w-64 -rotate-3 shadow-[0_30px_60px_-10px_rgb(0_0_0/0.8)] transition-transform duration-500 hover:rotate-0 hover:scale-105" />
        </Link>
      </div>

      {/* Chọn truyện đề cử: mỗi vạch có thanh chạy theo thời gian */}
      {stories.length > 1 && (
        <div className="absolute bottom-10 left-1/2 flex w-full max-w-6xl -translate-x-1/2 gap-2 px-4">
          {stories.map((s, i) => (
            <button key={s.id} onClick={() => setIndex(i)} aria-label={`Truyện đề cử ${i + 1}: ${s.title}`} aria-current={i === index}
              className="relative h-1 w-10 overflow-hidden rounded-full bg-white/25 sm:w-14">
              {i < index && <span className="absolute inset-0 bg-white/70" />}
              {i === index && (
                <span key={`${index}-${paused}`} className={`absolute inset-0 bg-lamp ${paused ? "" : "animate-progress"}`}
                  style={{ animationDuration: `${DURATION}ms` }} />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
