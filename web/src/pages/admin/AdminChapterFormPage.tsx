import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { chapterApi, storyApi } from "../../api/catalog";
import { getErrorMessage } from "../../api/client";
import type { ChapterAdmin, StoryDetail } from "../../api/types";
import Alert from "../../components/Alert";
import { toLocalInput } from "../../utils/format";

// PB08: thêm chương, PB09: sửa chương, PB10: hẹn giờ phát hành
export default function AdminChapterFormPage() {
  const params = useParams();
  const chapterId = params.chapterId ? Number(params.chapterId) : null;
  const storyIdParam = params.id ? Number(params.id) : null;
  const key = `${chapterId}-${storyIdParam}`;

  const [state, setState] = useState<{ key: string; chapter?: ChapterAdmin | null; story?: StoryDetail; error?: string }>();

  useEffect(() => {
    let ignore = false;
    (async () => {
      const chapter = chapterId ? await chapterApi.get(chapterId) : null;
      const story = await storyApi.detail(chapter?.storyId ?? storyIdParam!);
      return { chapter, story };
    })()
      .then(({ chapter, story }) => !ignore && setState({ key, chapter, story }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [key, chapterId, storyIdParam]);

  if (state?.key !== key) return <p className="text-gray-500">Đang tải...</p>;
  if (state.error || !state.story) return <Alert>{state.error ?? "Không tải được dữ liệu"}</Alert>;

  return <ChapterForm story={state.story} chapter={state.chapter ?? null} />;
}

function ChapterForm({ story, chapter }: { story: StoryDetail; chapter: ChapterAdmin | null }) {
  const navigate = useNavigate();
  const nextNumber = Math.max(0, ...story.chapters.map((c) => c.number)) + 1;

  const [form, setForm] = useState({
    number: String(chapter?.number ?? nextNumber),
    title: chapter?.title ?? "",
    content: chapter?.content ?? "",
    isFree: chapter?.isFree ?? false,
    publishAt: chapter ? toLocalInput(chapter.publishAt) : "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const number = Number(form.number);
    if (!Number.isInteger(number) || number < 1) return setError("Số thứ tự chương phải là số nguyên lớn hơn 0");
    if (!form.title.trim()) return setError("Vui lòng nhập tên chương");
    if (!form.content.trim()) return setError("Vui lòng nhập nội dung chương");

    const data = {
      number,
      title: form.title.trim(),
      content: form.content,
      isFree: form.isFree,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
    };

    setSaving(true);
    try {
      if (chapter) await chapterApi.update(chapter.id, data);
      else await storyApi.createChapter(story.id, data);
      navigate(`/admin/truyen/${story.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Lưu chương thất bại"));
      setSaving(false);
    }
  }

  const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

  return (
    <div>
      <Link to={`/admin/truyen/${story.id}`} className="text-sm text-blue-600 hover:underline">‹ {story.title}</Link>
      <h1 className="mb-4 mt-1 text-2xl font-bold">{chapter ? `Sửa chương ${chapter.number}` : "Thêm chương mới"}</h1>

      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-5" noValidate>
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Số thứ tự *</span>
            <input type="number" min={1} className={input} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Tên chương *</span>
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium">Nội dung * (mỗi đoạn cách nhau bằng một dòng trống)</span>
          <textarea rows={16} className={`${input} font-serif leading-relaxed`} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Thời điểm phát hành</span>
            <input type="datetime-local" className={input} value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} />
            <span className="mt-1 block text-xs text-gray-500">Bỏ trống = phát hành ngay. Chọn ngày tương lai = hẹn giờ.</span>
          </label>
          <label className="flex items-center gap-2 self-center text-sm">
            <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} />
            Chương đọc miễn phí
            <span className="text-xs text-gray-500">(truyện miễn phí thì mọi chương đều miễn phí)</span>
          </label>
        </div>

        <button disabled={saving} className="mt-5 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Đang lưu..." : chapter ? "Lưu chương" : "Thêm chương"}
        </button>
      </form>
    </div>
  );
}
