import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { genreApi, storyApi } from "../../api/catalog";
import { getErrorMessage } from "../../api/client";
import type { Genre, StoryDetail, StoryRequest, StoryStatus } from "../../api/types";
import Alert from "../../components/Alert";
import CoverImage from "../../components/CoverImage";
import { formatDateTime } from "../../utils/format";

// PB06: tạo/cập nhật truyện, PB07: tình trạng phát hành, ảnh bìa, danh sách chương
export default function AdminStoryFormPage() {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const [reload, setReload] = useState(0);
  const key = `${id}-${reload}`;
  const [state, setState] = useState<{ key: string; genres?: Genre[]; story?: StoryDetail | null; error?: string }>();

  useEffect(() => {
    let ignore = false;
    Promise.all([genreApi.list(), id ? storyApi.detail(id) : Promise.resolve(null)])
      .then(([genres, story]) => !ignore && setState({ key, genres, story }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [key, id]);

  if (state?.key !== key && !state?.genres) return <p className="text-gray-500">Đang tải...</p>;
  if (state?.error || !state?.genres) return <Alert>{state?.error ?? "Không tải được dữ liệu"}</Alert>;

  const story = state.story ?? null;

  return (
    <div>
      <Link to="/admin/truyen" className="text-sm text-blue-600 hover:underline">‹ Danh sách truyện</Link>
      <h1 className="mb-4 mt-1 text-2xl font-bold">{story ? `Sửa truyện: ${story.title}` : "Thêm truyện mới"}</h1>

      <StoryForm key={story?.updatedAt ?? "new"} genres={state.genres} story={story} onSaved={() => setReload((r) => r + 1)} />

      {story && (
        <>
          <CoverUpload key={story.coverUrl ?? "none"} story={story} onUploaded={() => setReload((r) => r + 1)} />
          <ChapterTable story={story} />
        </>
      )}
    </div>
  );
}

function StoryForm({ genres, story, onSaved }: { genres: Genre[]; story: StoryDetail | null; onSaved: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<StoryRequest>({
    title: story?.title ?? "",
    author: story?.author ?? "",
    description: story?.description ?? "",
    status: story?.status ?? "Ongoing",
    genreIds: story?.genres.map((g) => g.id) ?? [],
  });
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleGenre(gid: number) {
    setForm((f) => ({
      ...f,
      genreIds: f.genreIds.includes(gid) ? f.genreIds.filter((x) => x !== gid) : [...f.genreIds, gid],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!form.title.trim() || !form.author.trim()) return setMessage({ type: "error", text: "Vui lòng nhập tên truyện và tác giả" });
    if (form.genreIds.length === 0) return setMessage({ type: "error", text: "Chọn ít nhất một thể loại" });

    setSaving(true);
    try {
      if (story) {
        await storyApi.update(story.id, form);
        setMessage({ type: "success", text: "Đã lưu thông tin truyện" });
        onSaved();
      } else {
        const created = await storyApi.create(form);
        navigate(`/admin/truyen/${created.id}`, { replace: true });
      }
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Lưu thất bại") });
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-5" noValidate>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tên truyện *</span>
          <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tác giả *</span>
          <input className={input} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium">Giới thiệu</span>
        <textarea rows={4} className={input} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-medium">Tình trạng phát hành</span>
        <div className="flex gap-4 text-sm">
          {(["Ongoing", "Completed"] as StoryStatus[]).map((s) => (
            <label key={s} className="flex items-center gap-1.5">
              <input type="radio" checked={form.status === s} onChange={() => setForm({ ...form, status: s })} />
              {s === "Ongoing" ? "Đang ra" : "Hoàn thành"}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-medium">Thể loại * (chọn một hoặc nhiều)</span>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <label key={g.id} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${form.genreIds.includes(g.id) ? "border-blue-600 bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}>
              <input type="checkbox" className="hidden" checked={form.genreIds.includes(g.id)} onChange={() => toggleGenre(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
      </div>

      <button disabled={saving} className="mt-5 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
        {saving ? "Đang lưu..." : story ? "Lưu thay đổi" : "Tạo truyện"}
      </button>
    </form>
  );
}

function CoverUpload({ story, onUploaded }: { story: StoryDetail; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function choose(f: File | null) {
    setError("");
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      await storyApi.uploadCover(story.id, file);
      onUploaded();
    } catch (err) {
      setError(getErrorMessage(err, "Tải ảnh thất bại"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold">Ảnh bìa</h2>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-end gap-4">
        {preview ? (
          <img src={preview} alt="Xem trước" className="aspect-3/4 w-28 rounded object-cover" />
        ) : (
          <CoverImage src={story.coverUrl} title={story.title} className="aspect-3/4 w-28 rounded" />
        )}
        <div className="space-y-2">
          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => choose(e.target.files?.[0] ?? null)} className="block text-sm" />
          <p className="text-xs text-gray-500">JPG, PNG hoặc WEBP, tối đa 2MB</p>
          <button onClick={upload} disabled={!file || uploading} className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {uploading ? "Đang tải lên..." : "Tải ảnh lên"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChapterTable({ story }: { story: StoryDetail }) {
  return (
    <div className="mt-6 rounded-lg border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Danh sách chương ({story.chapters.length})</h2>
        <Link to={`/admin/truyen/${story.id}/chuong/moi`} className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">
          + Thêm chương
        </Link>
      </div>
      {story.chapters.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có chương nào</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr>
              <th className="w-16 py-2">Số</th>
              <th className="py-2">Tên chương</th>
              <th className="py-2">Phát hành</th>
              <th className="py-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {story.chapters.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="py-2">{c.number}</td>
                <td className="py-2">{c.title}</td>
                <td className="py-2">
                  {c.isPublished ? (
                    <span className="text-green-700">Đã phát hành</span>
                  ) : (
                    <span className="text-purple-700">Hẹn giờ {formatDateTime(c.publishAt)}</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <Link to={`/admin/chuong/${c.id}`} className="text-blue-600 hover:underline">Sửa</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
