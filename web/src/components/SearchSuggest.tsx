import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { assetUrl } from "../api/client";
import { suggestApi, type StorySuggestion } from "../api/community";

// PB51: ô tìm kiếm có gợi ý tức thì, gõ không dấu vẫn ra ("vu an" -> "Vụ Án Phòng Số 7")
export default function SearchSuggest({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ q: string; items: StorySuggestion[] }>({ q: "", items: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);

  const q = value.trim();

  // Chờ người dùng ngừng gõ 250ms rồi mới gọi API
  useEffect(() => {
    if (q.length < 2) return;
    let ignore = false;
    const timer = window.setTimeout(() => {
      suggestApi
        .suggest(q)
        .then((items) => !ignore && setResult({ q, items }))
        .catch(() => {});
    }, 250);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items = q.length >= 2 && result.q === q ? result.items : [];

  function go(path: string) {
    setOpen(false);
    setActive(-1);
    navigate(path);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(`/truyen/${items[active].id}`);
    go(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form ref={boxRef} onSubmit={submit} role="search" className={`relative ${className}`}>
      <label htmlFor="site-search" className="sr-only">Tìm truyện</label>
      <input
        id="site-search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        autoComplete="off"
        placeholder="Tìm tên truyện, tác giả… gõ không dấu cũng được"
        className="w-full rounded-full border border-white/15 bg-white/10 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/55 outline-none focus:border-lamp focus:bg-white/15"
      />
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-white/60">
        <path d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65-1.06 1.06-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      </svg>

      {open && items.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border bg-white py-1 text-gray-900 shadow-xl">
          {items.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(`/truyen/${s.id}`)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === active ? "bg-blue-50" : ""}`}
              >
                {s.coverUrl ? (
                  <img src={assetUrl(s.coverUrl) ?? ""} alt="" className="h-11 w-8 rounded-sm object-cover" />
                ) : (
                  <span className="h-11 w-8 rounded-sm bg-ink" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-story font-semibold">{s.title}</span>
                  <span className="block truncate text-xs text-gray-500">{s.author}</span>
                </span>
              </button>
            </li>
          ))}
          <li className="border-t">
            <button type="submit" className="w-full px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50">
              Xem tất cả kết quả cho “{q}”
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
