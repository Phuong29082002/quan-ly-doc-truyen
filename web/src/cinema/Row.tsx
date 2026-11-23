import { useRef, useState, type ReactNode } from "react";
import { useReveal } from "./useReveal";

/**
 * Một hàng truyện cuộn ngang: tiêu đề bên trái, nút mũi tên hiện ở hai mép khi rê chuột,
 * trên điện thoại vuốt ngang. Cả hàng hiện dần khi cuộn tới.
 */
export default function Row({ title, action, children, gap = "gap-3" }: { title: string; action?: ReactNode; children: ReactNode; gap?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const reveal = useReveal<HTMLElement>();
  const [edge, setEdge] = useState({ start: true, end: false });

  function update() {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.9, behavior: "smooth" });

  return (
    <section ref={reveal} className="reveal group/row relative">
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="font-story text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h2>
        {action && <span className="text-sm opacity-0 transition-opacity group-hover/row:opacity-100 max-sm:opacity-100">{action}</span>}
      </div>
      <div className="relative">
        <div ref={track} onScroll={update}
          className={`-mx-4 flex snap-x overflow-x-auto scroll-smooth scroll-px-4 px-4 py-3 sm:scroll-px-10 [scrollbar-width:none] sm:-mx-10 sm:px-10 [&::-webkit-scrollbar]:hidden ${gap}`}>
          {children}
        </div>
        {!edge.start && (
          <button onClick={() => scroll(-1)} aria-label={`Lùi hàng ${title}`}
            className="absolute inset-y-3 -left-4 z-10 hidden w-10 items-center justify-center bg-black/50 text-3xl text-white opacity-0 transition-opacity hover:bg-black/70 group-hover/row:opacity-100 sm:-left-10 sm:flex">‹</button>
        )}
        {!edge.end && (
          <button onClick={() => scroll(1)} aria-label={`Tiếp hàng ${title}`}
            className="absolute inset-y-3 -right-4 z-10 hidden w-10 items-center justify-center bg-black/50 text-3xl text-white opacity-0 transition-opacity hover:bg-black/70 group-hover/row:opacity-100 sm:-right-10 sm:flex">›</button>
        )}
      </div>
    </section>
  );
}
