import { useRef, type ReactNode } from "react";

// Hàng ngang cuộn được (vuốt trên điện thoại, nút mũi tên trên máy tính)
export default function Carousel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-story text-xl font-semibold">{title}</h2>
        <span className="ml-auto">{action}</span>
        <div className="hidden gap-1 sm:flex">
          <button onClick={() => scroll(-1)} aria-label={`Lùi danh sách ${title}`} className="grid h-8 w-8 place-items-center rounded-full border bg-white hover:bg-gray-50">‹</button>
          <button onClick={() => scroll(1)} aria-label={`Tiếp danh sách ${title}`} className="grid h-8 w-8 place-items-center rounded-full border bg-white hover:bg-gray-50">›</button>
        </div>
      </div>
      <div ref={track} className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

/** Mỗi ô trong Carousel có độ rộng cố định để hàng ngang đều nhau */
export function CarouselItem({ children }: { children: ReactNode }) {
  return <div className="w-36 shrink-0 snap-start sm:w-40">{children}</div>;
}
