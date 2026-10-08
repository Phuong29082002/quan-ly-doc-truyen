import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { storyApi } from "../../api/catalog";
import { getErrorMessage } from "../../api/client";
import type { PagedResult, StoryListItem } from "../../api/types";
import Alert from "../../components/Alert";
import CoverImage from "../../components/CoverImage";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { formatDate, formatNumber } from "../../utils/format";

// PB06, PB07, PB08: danh sách truyện trong trang quản trị
export default function AdminStoriesPage() {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState({ keyword: "", page: 1 });
  const key = JSON.stringify(query);
  const [state, setState] = useState<{ key: string; data?: PagedResult<StoryListItem>; error?: string }>();

  useEffect(() => {
    let ignore = false;
    storyApi
      .search({ keyword: query.keyword || undefined, page: query.page, pageSize: 10, sort: "updated" })
      .then((data) => !ignore && setState({ key, data }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [key, query]);

  function search(e: FormEvent) {
    e.preventDefault();
    setQuery({ keyword: keyword.trim(), page: 1 });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý truyện</h1>
        <Link to="/admin/truyen/moi" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Thêm truyện
        </Link>
      </div>

      <form onSubmit={search} className="mb-4 flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo tên truyện hoặc tác giả"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Tìm</button>
      </form>

      {state?.key !== key && <p className="text-gray-500">Đang tải...</p>}
      {state?.key === key && state.error && <Alert>{state.error}</Alert>}

      {state?.key === key && state.data && (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">Truyện</th>
                  <th className="px-3 py-2">Tình trạng</th>
                  <th className="px-3 py-2 text-center">Chương</th>
                  <th className="px-3 py-2 text-center">Lượt đọc</th>
                  <th className="px-3 py-2">Cập nhật</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <CoverImage src={s.coverUrl} title="" className="h-14 w-10 shrink-0 rounded" />
                        <div>
                          <div className="font-medium">{s.title}</div>
                          <div className="text-xs text-gray-500">{s.author} · {s.genres.map((g) => g.name).join(", ")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                    <td className="px-3 py-2 text-center">{s.chapterCount}</td>
                    <td className="px-3 py-2 text-center">{formatNumber(s.viewCount)}</td>
                    <td className="px-3 py-2">{formatDate(s.updatedAt)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link to={`/admin/truyen/${s.id}`} className="mr-3 text-blue-600 hover:underline">Sửa</Link>
                      <Link to={`/admin/truyen/${s.id}/chuong/moi`} className="text-green-700 hover:underline">+ Chương</Link>
                    </td>
                  </tr>
                ))}
                {state.data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">Không có truyện nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={state.data.page} totalPages={state.data.totalPages} onChange={(page) => setQuery({ ...query, page })} />
        </>
      )}
    </div>
  );
}
