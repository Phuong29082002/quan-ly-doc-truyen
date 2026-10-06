import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import axios from "axios";
import { storyApi } from "../api/catalog";
import { getErrorMessage } from "../api/client";
import type { ChapterContent } from "../api/types";

const SETTINGS_KEY = "qldt_reader";

interface ReaderSettings {
  fontSize: number;
  dark: boolean;
}

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { fontSize: 18, dark: false, ...JSON.parse(raw) };
  } catch {
    // bỏ qua, dùng mặc định
  }
  return { fontSize: 18, dark: false };
}

// PB14: đọc chương, chuyển chương trước/sau, chỉnh cỡ chữ, chế độ tối
export default function ReadChapterPage() {
  const params = useParams();
  const storyId = Number(params.id);
  const number = Number(params.number);
  const key = `${storyId}/${number}`;
  const navigate = useNavigate();

  const [state, setState] = useState<{ key: string; data?: ChapterContent; error?: string; locked?: boolean }>();
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);

  useEffect(() => {
    let ignore = false;
    storyApi
      .readChapter(storyId, number)
      .then((data) => {
        if (ignore) return;
        setState({ key, data });
        window.scrollTo({ top: 0 });
      })
      .catch((err) => {
        if (ignore) return;
        const locked = axios.isAxiosError(err) && err.response?.status === 403;
        setState({ key, error: getErrorMessage(err, "Không tải được chương"), locked });
      });
    return () => {
      ignore = true;
    };
  }, [key, storyId, number]);

  function changeSettings(next: Partial<ReaderSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    } catch {
      // không lưu được cũng không sao
    }
  }

  if (state?.key !== key) return <p className="py-12 text-center text-gray-500">Đang tải chương...</p>;

  if (state.error || !state.data) {
    return (
      <div className="py-12 text-center">
        <p className={`mb-4 ${state.locked ? "text-orange-600" : "text-red-600"}`}>{state.error}</p>
        <Link to={`/truyen/${storyId}`} className="text-blue-600 underline">Quay lại trang truyện</Link>
      </div>
    );
  }

  const c = state.data;
  const go = (n: number | null) => n !== null && navigate(`/truyen/${storyId}/chuong/${n}`);

  const nav = (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => go(c.prevNumber)} disabled={c.prevNumber === null}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">‹ Chương trước</button>
      <Link to={`/truyen/${storyId}`} className="rounded border px-4 py-2 text-sm">Mục lục</Link>
      <button onClick={() => go(c.nextNumber)} disabled={c.nextNumber === null}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">Chương sau ›</button>
    </div>
  );

  return (
    <div className={`mx-auto max-w-3xl rounded-lg border p-5 sm:p-8 ${settings.dark ? "bg-gray-900 text-gray-200 border-gray-700" : "bg-white"}`}>
      <div className="mb-4 text-center">
        <Link to={`/truyen/${storyId}`} className="text-lg font-semibold hover:underline">{c.storyTitle}</Link>
        <h1 className="mt-1 text-xl font-bold">Chương {c.number}: {c.title}</h1>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2 text-sm">
        <span className="opacity-70">Cỡ chữ</span>
        <button className="rounded border px-2 py-0.5" onClick={() => changeSettings({ fontSize: Math.max(14, settings.fontSize - 2) })}>A-</button>
        <span className="w-8 text-center">{settings.fontSize}</span>
        <button className="rounded border px-2 py-0.5" onClick={() => changeSettings({ fontSize: Math.min(30, settings.fontSize + 2) })}>A+</button>
        <button className="ml-3 rounded border px-3 py-0.5" onClick={() => changeSettings({ dark: !settings.dark })}>
          {settings.dark ? "Nền sáng" : "Nền tối"}
        </button>
      </div>

      {nav}

      <article className="my-8 leading-loose" style={{ fontSize: settings.fontSize }}>
        {c.content.split(/\n+/).filter((p) => p.trim()).map((p, i) => (
          <p key={i} className="mb-4">{p}</p>
        ))}
      </article>

      {nav}
    </div>
  );
}
