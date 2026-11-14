import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { chapterApi, storyApi } from "../../api/catalog";
import { getErrorMessage } from "../../api/client";
import type { ChapterAdmin, StoryDetail } from "../../api/types";
import Alert from "../../components/Alert";
import ChapterContentView from "../../components/ChapterContentView";
import { imageMarkup } from "../../utils/chapterContent";
import { toLocalInput } from "../../utils/format";

// PB08: thêm chương, PB09: sửa/xóa chương, PB10: hẹn giờ phát hành
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
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // PB43: upload ảnh rồi chèn ![mô tả](url) vào đúng vị trí con trỏ
  async function insertImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? form.content.length;
      const end = el?.selectionEnd ?? start;
      let markup = "";
      for (const file of images) {
        const { url } = await chapterApi.uploadImage(file);
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        markup += `\n\n${imageMarkup(url, alt)}\n\n`;
      }
      setForm((f) => ({ ...f, content: f.content.slice(0, start) + markup + f.content.slice(end) }));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(start + markup.length, start + markup.length);
      });
    } catch (err) {
      setError(getErrorMessage(err, "Tải ảnh lên thất bại"));
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      insertImages(files);
    }
  }

  function handleDrop(e: DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      e.preventDefault();
      insertImages(files);
    }
  }

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

        <div className="mt-4">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Nội dung *</span>
            <div className="ml-auto flex overflow-hidden rounded border text-sm">
              <button type="button" onClick={() => setTab("edit")}
                className={`px-3 py-1 ${tab === "edit" ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}>Soạn thảo</button>
              <button type="button" onClick={() => setTab("preview")}
                className={`px-3 py-1 ${tab === "preview" ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}>Xem trước</button>
            </div>
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
              className="rounded border border-blue-600 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-60">
              {uploading ? "Đang tải ảnh..." : "🖼 Chèn ảnh"}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
              onChange={(e) => {
                insertImages(Array.from(e.target.files ?? []));
                e.target.value = "";
              }} />
          </div>

          {tab === "edit" ? (
            <textarea ref={textareaRef} rows={18} className={`${input} font-serif leading-relaxed`} value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              onPaste={handlePaste} onDrop={handleDrop} />
          ) : (
            <div className="min-h-[24rem] rounded border border-gray-300 bg-gray-50 p-5">
              {form.content.trim() ? <ChapterContentView content={form.content} /> : <p className="text-sm text-gray-500">Chưa có nội dung.</p>}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Mỗi đoạn cách nhau bằng một dòng trống. Ảnh chèn bằng nút "Chèn ảnh", dán (Ctrl+V) hoặc kéo thả vào ô soạn thảo;
            ảnh nằm trên một dòng riêng dạng <code>![mô tả](đường dẫn)</code>, có thể sửa phần mô tả.
          </p>
        </div>

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
