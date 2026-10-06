import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { genreApi, storyApi, type StorySort } from "../api/catalog";
import { getErrorMessage } from "../api/client";
import type { Genre, PagedResult, StoryListItem, StoryStatus } from "../api/types";
import Pagination from "../components/Pagination";
import StoryCard from "../components/StoryCard";

const SORTS: { value: StorySort; label: string }[] = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "newest", label: "Mới phát hành" },
  { value: "views", label: "Đọc nhiều" },
];

// PB11 tìm kiếm + PB12 các danh sách gợi ý
export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const keyword = params.get("q") ?? "";
  const genreId = params.get("theloai") ? Number(params.get("theloai")) : undefined;
  const status = (params.get("tinhtrang") as StoryStatus | null) ?? undefined;
  const sort = (params.get("sapxep") as StorySort | null) ?? "updated";
  const page = Number(params.get("trang") ?? 1);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [result, setResult] = useState<{ key: string; data?: PagedResult<StoryListItem>; error?: string }>();
  const key = params.toString();

  useEffect(() => {
    genreApi.list().then(setGenres).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    let ignore = false;
    storyApi
      .search({ keyword: keyword || undefined, genreId, status, sort, page, pageSize: 12 })
      .then((data) => !ignore && setResult({ key, data }))
      .catch((err) => !ignore && setResult({ key, error: getErrorMessage(err, "Không tải được danh sách truyện") }));
    return () => {
      ignore = true;
    };
  }, [key, keyword, genreId, status, sort, page]);

  const loading = result?.key !== key;

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("trang" in changes)) next.delete("trang");
    setParams(next);
  }

  return (
    <div>
      <SearchBox key={keyword} initial={keyword} onSearch={(q) => update({ q })} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => update({ sapxep: s.value === "updated" ? undefined : s.value })}
            className={`rounded-full px-4 py-1.5 text-sm ${
              sort === s.value ? "bg-blue-600 text-white" : "bg-white border text-gray-700 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}

        <select
          value={genreId ?? ""}
          onChange={(e) => update({ theloai: e.target.value || undefined })}
          className="ml-auto rounded border bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Tất cả thể loại</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <select
          value={status ?? ""}
          onChange={(e) => update({ tinhtrang: e.target.value || undefined })}
          className="rounded border bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Mọi tình trạng</option>
          <option value="Ongoing">Đang ra</option>
          <option value="Completed">Hoàn thành</option>
        </select>
      </div>

      {keyword && (
        <p className="mb-3 text-sm text-gray-600">
          Kết quả cho "<span className="font-semibold">{keyword}</span>"
          {result?.data && !loading && ` (${result.data.totalCount} truyện)`}
        </p>
      )}

      {loading && <p className="py-12 text-center text-gray-500">Đang tải...</p>}
      {!loading && result?.error && <p className="py-12 text-center text-red-600">{result.error}</p>}
      {!loading && result?.data && result.data.items.length === 0 && (
        <p className="py-12 text-center text-gray-500">Không tìm thấy truyện phù hợp</p>
      )}

      {!loading && result?.data && result.data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {result.data.items.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
          <Pagination
            page={result.data.page}
            totalPages={result.data.totalPages}
            onChange={(p) => update({ trang: p > 1 ? String(p) : undefined })}
          />
        </>
      )}
    </div>
  );
}

function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string | undefined) => void }) {
  const [value, setValue] = useState(initial);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(value.trim() || undefined);
  }

  return (
    <form onSubmit={submit} className="mb-5 flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm theo tên truyện hoặc tác giả..."
        className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700">Tìm</button>
    </form>
  );
}
