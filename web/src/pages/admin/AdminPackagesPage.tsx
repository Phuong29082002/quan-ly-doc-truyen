import { useEffect, useState, type FormEvent } from "react";
import { storyApi } from "../../api/catalog";
import { getErrorMessage } from "../../api/client";
import { packageApi, type PackageItem, type PackageRequest, type PackageScope } from "../../api/packages";
import type { StoryListItem } from "../../api/types";
import Alert from "../../components/Alert";
import { formatNumber } from "../../utils/format";

const emptyForm: PackageRequest = { name: "", price: 0, durationDays: 30, scope: "All", isActive: true, storyIds: [] };

// PB18: quản lý gói đọc tháng (tên, mức phí, thời hạn, phạm vi, ngừng cung cấp)
export default function AdminPackagesPage() {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ reload: number; packages?: PackageItem[]; stories?: StoryListItem[]; error?: string }>();
  // editing: null = đóng form, 0 = tạo mới, >0 = sửa gói có id đó
  const [editing, setEditing] = useState<{ id: number; form: PackageRequest } | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([packageApi.listAll(), storyApi.search({ pageSize: 50, sort: "updated" })])
      .then(([packages, stories]) => !ignore && setState({ reload, packages, stories: stories.items }))
      .catch((err) => !ignore && setState({ reload, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [reload]);

  function startEdit(p: PackageItem) {
    setMessage(null);
    setEditing({
      id: p.id,
      form: {
        name: p.name,
        price: p.price,
        durationDays: p.durationDays,
        scope: p.scope,
        isActive: p.isActive,
        storyIds: p.stories.map((s) => s.id),
      },
    });
  }

  async function toggleActive(p: PackageItem) {
    const text = p.isActive
      ? `Ngừng cung cấp gói "${p.name}"? Gói sẽ không bán mới, người đang dùng vẫn còn hạn.`
      : `Mở bán lại gói "${p.name}"?`;
    if (!window.confirm(text)) return;
    setMessage(null);
    try {
      await packageApi.update(p.id, {
        name: p.name,
        price: p.price,
        durationDays: p.durationDays,
        scope: p.scope,
        isActive: !p.isActive,
        storyIds: p.stories.map((s) => s.id),
      });
      setMessage({ type: "success", text: p.isActive ? "Đã ngừng cung cấp gói" : "Đã mở bán lại gói" });
      setReload((r) => r + 1);
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý gói đọc</h1>
        <button
          onClick={() => {
            setMessage(null);
            setEditing({ id: 0, form: emptyForm });
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Thêm gói
        </button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {editing && state?.stories && (
        <PackageForm
          key={editing.id}
          id={editing.id}
          initial={editing.form}
          stories={state.stories}
          onCancel={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setMessage({ type: "success", text });
            setReload((r) => r + 1);
          }}
        />
      )}

      {!state && <p className="text-gray-500">Đang tải...</p>}
      {state?.error && <Alert>{state.error}</Alert>}

      {state?.packages &&
        (state.packages.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có gói đọc nào</p>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border bg-white text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Tên gói</th>
                <th className="px-3 py-2">Mức phí</th>
                <th className="px-3 py-2">Thời hạn</th>
                <th className="px-3 py-2">Phạm vi</th>
                <th className="px-3 py-2 text-center">Đang dùng</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {state.packages.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatNumber(p.price)}đ</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.durationDays} ngày</td>
                  <td className="px-3 py-2">
                    {p.scope === "All" ? (
                      "Tất cả truyện"
                    ) : (
                      <span title={p.stories.map((s) => s.title).join(", ")}>{p.stories.length} truyện chọn lọc</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">{p.activeUserCount}</td>
                  <td className="px-3 py-2">
                    {p.isActive ? <span className="text-green-700">Đang bán</span> : <span className="text-gray-500">Ngừng cung cấp</span>}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(p)} className="mr-3 text-blue-600 hover:underline">Sửa</button>
                    <button onClick={() => toggleActive(p)} className={p.isActive ? "text-red-600 hover:underline" : "text-green-700 hover:underline"}>
                      {p.isActive ? "Ngừng" : "Mở bán"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </div>
  );
}

function PackageForm({
  id,
  initial,
  stories,
  onCancel,
  onSaved,
}: {
  id: number;
  initial: PackageRequest;
  stories: StoryListItem[];
  onCancel: () => void;
  onSaved: (text: string) => void;
}) {
  const [form, setForm] = useState<PackageRequest>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

  function toggleStory(sid: number) {
    setForm((f) => ({
      ...f,
      storyIds: f.storyIds.includes(sid) ? f.storyIds.filter((x) => x !== sid) : [...f.storyIds, sid],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Vui lòng nhập tên gói");
    if (!(form.price > 0)) return setError("Mức phí phải lớn hơn 0");
    if (!Number.isInteger(form.durationDays) || form.durationDays < 1) return setError("Thời hạn phải là số ngày nguyên lớn hơn 0");
    if (form.scope === "Selected" && form.storyIds.length === 0) return setError("Chọn ít nhất một truyện cho gói này");

    setSaving(true);
    try {
      const data = { ...form, name: form.name.trim(), storyIds: form.scope === "All" ? [] : form.storyIds };
      if (id) await packageApi.update(id, data);
      else await packageApi.create(data);
      onSaved(id ? "Đã lưu gói đọc" : "Đã thêm gói đọc");
    } catch (err) {
      setError(getErrorMessage(err, "Lưu gói thất bại"));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mb-6 rounded-lg border bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold">{id ? "Sửa gói đọc" : "Thêm gói đọc"}</h2>
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium">Tên gói *</span>
          <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Mức phí (VNĐ) *</span>
          <input type="number" min={0} step={1000} className={input} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Thời hạn (ngày) *</span>
          <input type="number" min={1} className={input} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} />
        </label>
      </div>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-medium">Phạm vi áp dụng</span>
        <div className="flex gap-4 text-sm">
          {(["All", "Selected"] as PackageScope[]).map((s) => (
            <label key={s} className="flex items-center gap-1.5">
              <input type="radio" checked={form.scope === s} onChange={() => setForm({ ...form, scope: s })} />
              {s === "All" ? "Tất cả truyện" : "Một số truyện"}
            </label>
          ))}
        </div>
      </div>

      {form.scope === "Selected" && (
        <div className="mt-3">
          <span className="mb-1 block text-sm font-medium">Chọn truyện ({form.storyIds.length} đã chọn)</span>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2 text-sm">
            {stories.map((s) => (
              <label key={s.id} className="flex items-center gap-2">
                <input type="checkbox" checked={form.storyIds.includes(s.id)} onChange={() => toggleStory(s.id)} />
                {s.title}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">Hiển thị tối đa 50 truyện cập nhật gần nhất.</p>
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        Đang bán
        <span className="text-xs text-gray-500">(bỏ chọn = ngừng cung cấp, người đang dùng vẫn còn hạn)</span>
      </label>

      <div className="mt-5 flex gap-3">
        <button disabled={saving} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-5 py-2 text-sm hover:bg-gray-50">Hủy</button>
      </div>
    </form>
  );
}
