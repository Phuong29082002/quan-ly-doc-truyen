import { useEffect, useState, type FormEvent } from "react";
import { genreApi } from "../../api/catalog";
import { getErrorMessage } from "../../api/client";
import type { Genre } from "../../api/types";
import Alert from "../../components/Alert";

// PB05: quản lý thể loại
export default function AdminGenresPage() {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ reload: number; data?: Genre[]; error?: string }>();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    genreApi
      .list()
      .then((data) => !ignore && setState({ reload, data }))
      .catch((err) => !ignore && setState({ reload, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [reload]);

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await action();
      setMessage({ type: "success", text: success });
      setReload((r) => r + 1);
      return true;
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
      return false;
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return setMessage({ type: "error", text: "Vui lòng nhập tên thể loại" });
    if (await run(() => genreApi.create(newName.trim()), `Đã thêm thể loại "${newName.trim()}"`)) setNewName("");
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) return setMessage({ type: "error", text: "Tên thể loại không được để trống" });
    if (await run(() => genreApi.update(editing.id, editing.name.trim()), "Đã cập nhật thể loại")) setEditing(null);
  }

  async function handleDelete(g: Genre) {
    if (!window.confirm(`Xóa thể loại "${g.name}"?`)) return;
    await run(() => genreApi.remove(g.id), `Đã xóa thể loại "${g.name}"`);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Quản lý thể loại</h1>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Tên thể loại mới"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Thêm</button>
      </form>

      {state?.reload !== reload && !state?.data && <p className="text-gray-500">Đang tải...</p>}
      {state?.error && <Alert>{state.error}</Alert>}

      {state?.data && (
        <table className="w-full overflow-hidden rounded-lg border bg-white text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Tên thể loại</th>
              <th className="w-28 px-3 py-2 text-center">Số truyện</th>
              <th className="w-44 px-3 py-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-3 py-2">
                  {editing?.id === g.id ? (
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={(e) => setEditing({ id: g.id, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      className="w-full rounded border px-2 py-1"
                    />
                  ) : (
                    g.name
                  )}
                </td>
                <td className="px-3 py-2 text-center">{g.storyCount}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {editing?.id === g.id ? (
                    <>
                      <button onClick={handleSave} className="mr-3 text-blue-600 hover:underline">Lưu</button>
                      <button onClick={() => setEditing(null)} className="text-gray-500 hover:underline">Hủy</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing({ id: g.id, name: g.name })} className="mr-3 text-blue-600 hover:underline">Sửa</button>
                      <button onClick={() => handleDelete(g)} className="text-red-600 hover:underline">Xóa</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
